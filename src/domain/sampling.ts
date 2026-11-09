import {
  distance,
  distanceToRingEdge,
  makeProjection,
  pointInRing,
  polygonAreaHa,
  polylineLength,
  type LngLat,
  type XY,
} from './geo'

/**
 * Plano de amostragem (Bloco 1 do projeto).
 *
 * Fonte dos parâmetros:
 *  - MIN_POINTS = 10: a ficha da Caderneta de Monitoramento da Embrapa Soja tem 10 pontos por talhão.
 *  - Bordadura e escala de pontos por área: DECISÃO DE PROJETO (a Embrapa não fixa estes valores
 *    nas fontes consultadas; ver FONTES.md). O app os apresenta como decisão, não como norma.
 */
export const MIN_POINTS = 10
export const MAX_POINTS = 30
export const DEFAULT_BUFFER_M = 30
export const MIN_SPACING_M = 20

export type SamplingMethod = 'zigzag' | 'diagonais'

export interface SamplingParams {
  method: SamplingMethod
  bufferM: number
  targetPoints: number
}

export interface PlanPoint {
  id: string
  order: number
  position: LngLat
}

export type IssueSeverity = 'erro' | 'aviso'
export interface QualityIssue {
  code: 'AREA_INSUFICIENTE' | 'POUCOS_PONTOS' | 'ESPACAMENTO_CURTO' | 'BORDADURA_CURTA'
  severity: IssueSeverity
  message: string
}

export interface SamplingPlan {
  params: SamplingParams
  areaHa: number
  points: PlanPoint[]
  /** Linhas do caminhamento (uma por trecho), em coordenadas geográficas. */
  paths: LngLat[][]
  walkLengthM: number
  meanSpacingM: number
  issues: QualityIssue[]
}

/** 10 pontos até 50 ha; +1 ponto a cada 10 ha adicionais; teto de 30. */
export function recommendedPointCount(areaHa: number): number {
  const extra = Math.max(0, Math.ceil((areaHa - 50) / 10))
  return Math.min(MAX_POINTS, MIN_POINTS + extra)
}

type Rotated = { angle: number; minX: number; maxX: number; minY: number; maxY: number }

const rot = ([x, y]: XY, a: number): XY => [x * Math.cos(a) + y * Math.sin(a), -x * Math.sin(a) + y * Math.cos(a)]
const unrot = ([x, y]: XY, a: number): XY => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]

/** Orientação que minimiza a área do retângulo envolvente (alinha o caminhamento ao talhão). */
function bestFrame(ring: readonly XY[]): Rotated {
  let best: Rotated | null = null
  let bestArea = Infinity
  for (let deg = 0; deg < 180; deg += 3) {
    const angle = (deg * Math.PI) / 180
    const r = ring.map((p) => rot(p, angle))
    const xs = r.map((p) => p[0])
    const ys = r.map((p) => p[1])
    const f = { angle, minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
    const area = (f.maxX - f.minX) * (f.maxY - f.minY)
    if (area < bestArea - 1e-6) {
      bestArea = area
      best = f
    }
  }
  return best!
}

/** Traçado idealizado no referencial girado; o filtro de bordadura é aplicado depois. */
function idealPaths(method: SamplingMethod, f: Rotated, bufferM: number): XY[][] {
  const w = f.maxX - f.minX
  const h = f.maxY - f.minY
  const alongX = w >= h
  const L = alongX ? w : h
  const W = alongX ? h : w
  const lo = bufferM
  const hi = W - bufferM
  const mk = (along: number, across: number): XY =>
    alongX ? [f.minX + along, f.minY + across] : [f.minX + across, f.minY + along]

  if (method === 'diagonais') {
    return [
      [mk(lo, lo), mk(L - lo, hi)],
      [mk(lo, hi), mk(L - lo, lo)],
    ]
  }
  const segments = Math.max(3, Math.ceil(L / Math.max(1, 0.7 * W)))
  const path: XY[] = []
  for (let i = 0; i <= segments; i++) {
    path.push(mk(lo + ((L - 2 * lo) * i) / segments, i % 2 === 0 ? lo : hi))
  }
  return [path]
}

function densify(path: readonly XY[], stepM: number): XY[] {
  const out: XY[] = []
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i]!
    const b = path[i + 1]!
    const n = Math.max(1, Math.ceil(distance(a, b) / stepM))
    for (let k = 0; k < n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n])
  }
  const last = path[path.length - 1]
  if (last) out.push(last)
  return out
}

export function generatePlan(ringLngLat: readonly LngLat[], params: SamplingParams): SamplingPlan {
  const proj = makeProjection(ringLngLat)
  const ring = ringLngLat.map(proj.toXY)
  const areaHa = polygonAreaHa(ringLngLat)
  const issues: QualityIssue[] = []

  const frame = bestFrame(ring)
  const valid = (p: XY) => pointInRing(p, ring) && distanceToRingEdge(p, ring) >= params.bufferM - 1e-6

  const ideal = idealPaths(params.method, frame, params.bufferM).map((path) => path.map((p) => unrot(p, frame.angle)))
  const walks = ideal.map((path) => densify(path, 2).filter(valid))
  const candidates = walks.flat()

  const n = Math.min(params.targetPoints, candidates.length)
  const chosen: XY[] = []
  for (let i = 0; i < n; i++) chosen.push(candidates[Math.floor(((i + 0.5) * candidates.length) / n)]!)

  if (candidates.length === 0) {
    issues.push({
      code: 'AREA_INSUFICIENTE',
      severity: 'erro',
      message: `Com bordadura de ${params.bufferM} m não sobra área amostrável. Reduza a bordadura ou use um talhão maior.`,
    })
  } else if (chosen.length < MIN_POINTS) {
    issues.push({
      code: 'POUCOS_PONTOS',
      severity: 'aviso',
      message: `Apenas ${chosen.length} pontos cabem no talhão (mínimo recomendado: ${MIN_POINTS}).`,
    })
  }
  if (params.bufferM < 20) {
    issues.push({
      code: 'BORDADURA_CURTA',
      severity: 'aviso',
      message: 'Bordadura abaixo de 20 m: o efeito de borda (pragas e pulverização) pode distorcer a amostra.',
    })
  }

  const walkLengthM = walks.reduce((acc, w) => acc + polylineLength(w), 0)
  const meanSpacingM = chosen.length > 1 ? walkLengthM / chosen.length : 0
  if (chosen.length > 1 && meanSpacingM < MIN_SPACING_M) {
    issues.push({
      code: 'ESPACAMENTO_CURTO',
      severity: 'aviso',
      message: `Espaçamento médio de ${meanSpacingM.toFixed(0)} m entre pontos: pontos muito próximos tendem a repetir a mesma informação.`,
    })
  }

  return {
    params,
    areaHa,
    points: chosen.map((p, i) => ({
      id: `P${String(i + 1).padStart(2, '0')}`,
      order: i + 1,
      position: proj.toLngLat(p),
    })),
    paths: walks.map((w) => w.map(proj.toLngLat)),
    walkLengthM,
    meanSpacingM,
    issues,
  }
}
