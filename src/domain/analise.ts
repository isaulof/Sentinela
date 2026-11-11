import { avaliar, type Avaliacao, type Nivel } from './decision'
import { makeProjection, pointInRing, type LngLat } from './geo'
import type { Registro } from './registro'
import { diaLocal } from './tempo'

/** Uma "rodada" de monitoramento = registros dos últimos N dias (decisão de projeto). */
export const RODADA_DIAS = 7

export const avaliarRegistro = (r: Registro): Avaliacao =>
  avaliar({
    alvo: r.alvo,
    estadio: r.estadio,
    quantidade: r.quantidade,
    finalidade: r.finalidade,
    ...(r.presente !== undefined ? { presente: r.presente } : {}),
    ...(r.severidadePct !== undefined ? { severidadePct: r.severidadePct } : {}),
    ...(r.desfolhaPct !== undefined ? { desfolhaPct: r.desfolhaPct } : {}),
  })

/** Severidade para ordenar/pintar: quanto maior, mais grave. */
export const PESO: Record<Nivel, number> = { nao_aplicavel: 0, ausente: 1, abaixo: 2, proximo: 3, deteccao: 4, atingido: 5 }
export const pior = (a: Nivel, b: Nivel): Nivel => (PESO[a] >= PESO[b] ? a : b)

export function daRodada(regs: readonly Registro[], agora: Date, dias = RODADA_DIAS): Registro[] {
  const corte = agora.getTime() - dias * 86_400_000
  return regs.filter((r) => Date.parse(r.criadoEm) >= corte)
}

/** Pior nível por ponto, considerando só os registros informados. */
export function nivelPorPonto(regs: readonly Registro[]): Map<string, Nivel> {
  const m = new Map<string, Nivel>()
  for (const r of regs) m.set(r.pontoId, pior(m.get(r.pontoId) ?? 'nao_aplicavel', avaliarRegistro(r).nivel))
  return m
}

export interface ResumoTalhao {
  pontosTotal: number
  pontosAmostrados: number
  progressoPct: number
  atingidos: string[]
  deteccoes: string[]
  proximos: string[]
  pior: Nivel
}

export function resumirTalhao(pontosIds: readonly string[], regs: readonly Registro[], agora: Date): ResumoTalhao {
  const niveis = nivelPorPonto(daRodada(regs, agora))
  const ids = pontosIds.filter((p) => niveis.has(p))
  const com = (n: Nivel) => pontosIds.filter((p) => niveis.get(p) === n)
  return {
    pontosTotal: pontosIds.length,
    pontosAmostrados: ids.length,
    progressoPct: pontosIds.length ? Math.round((ids.length / pontosIds.length) * 100) : 0,
    atingidos: com('atingido'),
    deteccoes: com('deteccao'),
    proximos: com('proximo'),
    pior: [...niveis.values()].reduce<Nivel>(pior, 'nao_aplicavel'),
  }
}

/** Interpolação IDW (potência 2) sobre uma grade, só dentro do polígono. Valores fora = null. */
export function idwGrade(
  anel: readonly LngLat[],
  amostras: readonly { posicao: LngLat; valor: number }[],
  nx = 36,
  ny = 30,
): { valores: (number | null)[][]; nx: number; ny: number; min: number; max: number } {
  const proj = makeProjection(anel)
  const ring = anel.map(proj.toXY)
  const xs = ring.map((p) => p[0])
  const ys = ring.map((p) => p[1])
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const pts = amostras.map((a) => ({ xy: proj.toXY(a.posicao), v: a.valor }))
  const valores: (number | null)[][] = []
  let min = Infinity
  let max = -Infinity
  for (let j = 0; j < ny; j++) {
    const linha: (number | null)[] = []
    for (let i = 0; i < nx; i++) {
      const x = x0 + ((i + 0.5) / nx) * (x1 - x0)
      const y = y1 - ((j + 0.5) / ny) * (y1 - y0)
      if (!pointInRing([x, y], ring) || pts.length === 0) { linha.push(null); continue }
      let num = 0
      let den = 0
      let exato: number | null = null
      for (const p of pts) {
        const d2 = (p.xy[0] - x) ** 2 + (p.xy[1] - y) ** 2
        if (d2 < 1) { exato = p.v; break }
        const w = 1 / d2
        num += w * p.v
        den += w
      }
      const v = exato ?? num / den
      min = Math.min(min, v)
      max = Math.max(max, v)
      linha.push(v)
    }
    valores.push(linha)
  }
  return { valores, nx, ny, min: Number.isFinite(min) ? min : 0, max: Number.isFinite(max) ? max : 0 }
}

/** Série temporal: média da quantidade por dia (data local do registro, yyyy-mm-dd). */
export function serieTemporal(regs: readonly Registro[]): { dia: string; media: number; n: number }[] {
  const por = new Map<string, number[]>()
  for (const r of regs) {
    const d = diaLocal(r.criadoEm)
    por.set(d, [...(por.get(d) ?? []), r.quantidade])
  }
  return [...por.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dia, v]) => ({ dia, media: v.reduce((a, b) => a + b, 0) / v.length, n: v.length }))
}
