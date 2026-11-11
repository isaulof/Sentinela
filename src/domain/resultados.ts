import { ALVOS, type AlvoId } from '@/knowledge/alvos'
import { daRodada, idwGrade, nivelPorPonto, PESO } from './analise'
import { NIVEL_ACAO, type Nivel } from './decision'
import { makeProjection, type LngLat } from './geo'
import type { Registro } from './registro'
import { diaLocal, fimDoDia } from './tempo'

/** Valor numérico do registro para o mapa de calor: contagem (pragas) ou severidade (doenças). */
export const valorDoRegistro = (r: Registro): number => (ALVOS[r.alvo].tipo === 'praga' ? r.quantidade : (r.severidadePct ?? (r.presente ? 1 : 0)))

/** Nível de ação numérico, quando as fontes trazem um (doenças não têm). */
export const LIMITE_ACAO: Partial<Record<AlvoId, number>> = { percevejo: NIVEL_ACAO.percevejo.graos, lagarta: NIVEL_ACAO.lagartaPorMetro }
export const UNIDADE_ALVO: Record<AlvoId, string> = { percevejo: 'perc./m', lagarta: 'lag./m', ferrugem: '% sev.', mofo: '% sev.', manchaAlvo: '% sev.' }

/** Dia da visita = dia LOCAL da fazenda (não UTC): 21:30 em Cuiabá continua no mesmo dia. */
const dia = (r: Registro) => diaLocal(r.criadoEm)

/** Dias com coleta, em ordem. Cada um é uma "visita" na linha do tempo. */
export function visitas(regs: readonly Registro[]): string[] {
  return [...new Set(regs.map(dia))].sort()
}

/** O mapa como estava ao fim do dia indicado (yyyy-mm-dd): só registros até essa data. */
export const ateODia = (regs: readonly Registro[], d: string): Registro[] => regs.filter((r) => dia(r) <= d)

/** Estado dos pontos na data: pior nível entre os registros da rodada (7 dias) que terminou naquele dia. */
export function niveisNaData(regs: readonly Registro[], d: string, alvo: AlvoId | null): Map<string, Nivel> {
  const fim = fimDoDia(d)
  const base = ateODia(regs, d).filter((r) => !alvo || r.alvo === alvo)
  return nivelPorPonto(daRodada(base, fim))
}

export interface Amostra { id: string; posicao: LngLat; valor: number }

/** Última leitura de cada ponto até a data, para o alvo escolhido. */
export function amostrasNaData(regs: readonly Registro[], d: string, alvo: AlvoId): Amostra[] {
  const m = new Map<string, Registro>()
  for (const r of ateODia(regs, d).filter((x) => x.alvo === alvo).sort((a, b) => a.criadoEm.localeCompare(b.criadoEm))) m.set(r.pontoId, r)
  return [...m.values()].map((r) => ({ id: r.pontoId, posicao: r.posicao, valor: valorDoRegistro(r) }))
}

export interface CelulaCalor { anel: LngLat[]; valor: number }

/** Mapa de calor como polígonos georreferenciados (grade IDW recortada no talhão), para desenhar sobre o mapa. */
export function celulasCalor(anel: readonly LngLat[], amostras: readonly Amostra[], nx = 64, ny = 56): { celulas: CelulaCalor[]; max: number } {
  if (amostras.length === 0) return { celulas: [], max: 0 }
  const g = idwGrade(anel, amostras, nx, ny)
  const proj = makeProjection(anel)
  const xs = anel.map((p) => proj.toXY(p)[0])
  const ys = anel.map((p) => proj.toXY(p)[1])
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const w = (x1 - x0) / nx
  const h = (y1 - y0) / ny
  const celulas: CelulaCalor[] = []
  g.valores.forEach((linha, j) => linha.forEach((v, i) => {
    if (v === null) return
    const xa = x0 + i * w
    const yb = y1 - j * h
    celulas.push({ anel: [proj.toLngLat([xa, yb]), proj.toLngLat([xa + w, yb]), proj.toLngLat([xa + w, yb - h]), proj.toLngLat([xa, yb - h])], valor: v })
  }))
  return { celulas, max: g.max }
}

export interface ResumoResultado {
  total: number
  coletados: number
  comOcorrencia: number
  pctComOcorrencia: number
  /** Alvo com mais pontos em atenção (próximo, ação ou doença). Null se nenhum. */
  alvoDominante: AlvoId | null
  pontosEmAtencao: string[]
}

const EM_ATENCAO: Nivel[] = ['proximo', 'atingido', 'deteccao']

/** Resumo do talhão na data: quantos pontos têm ocorrência e qual alvo mais pesa. */
export function resumirResultado(pontosIds: readonly string[], regs: readonly Registro[], d: string): ResumoResultado {
  const niveis = niveisNaData(regs, d, null)
  const fim = fimDoDia(d)
  const rodada = daRodada(ateODia(regs, d), fim)
  const coletados = pontosIds.filter((p) => niveis.has(p)).length
  const comOcorrencia = pontosIds.filter((p) => (niveis.get(p) ? PESO[niveis.get(p)!] >= PESO['abaixo'] && niveis.get(p) !== 'nao_aplicavel' : false)).length
  const porAlvo = new Map<AlvoId, Set<string>>()
  for (const r of rodada) {
    const n = niveisNaData([r], d, null).get(r.pontoId)
    if (n && EM_ATENCAO.includes(n)) porAlvo.set(r.alvo, (porAlvo.get(r.alvo) ?? new Set()).add(r.pontoId))
  }
  const dominante = [...porAlvo.entries()].sort((a, b) => b[1].size - a[1].size)[0]
  return {
    total: pontosIds.length,
    coletados,
    comOcorrencia,
    pctComOcorrencia: coletados ? Math.round((comOcorrencia / coletados) * 100) : 0,
    alvoDominante: dominante ? dominante[0] : null,
    pontosEmAtencao: pontosIds.filter((p) => EM_ATENCAO.includes(niveis.get(p) ?? 'nao_aplicavel')),
  }
}

const SETORES = ['norte', 'nordeste', 'leste', 'sudeste', 'sul', 'sudoeste', 'oeste', 'noroeste'] as const

/**
 * Onde, dentro do talhão, os pontos informados se concentram: "centro" ou um dos 8 setores da bússola.
 * Compara o centro dos pontos com o centro do contorno; se estão a menos de ~20% do meio-tamanho do talhão, é "centro".
 */
export function setorDoFoco(anel: readonly LngLat[], pontos: readonly LngLat[]): string | null {
  if (anel.length < 3 || pontos.length === 0) return null
  const proj = makeProjection(anel)
  const ring = anel.map(proj.toXY)
  const media = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length
  const c0: [number, number] = [media(ring.map((p) => p[0])), media(ring.map((p) => p[1]))]
  const xy = pontos.map(proj.toXY)
  const dx = media(xy.map((p) => p[0])) - c0[0]
  const dy = media(xy.map((p) => p[1])) - c0[1]
  const meio = Math.max(...ring.map((p) => Math.hypot(p[0] - c0[0], p[1] - c0[1])))
  if (Math.hypot(dx, dy) < meio * 0.2) return 'centro'
  const graus = ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360 // 0 = norte, 90 = leste
  return SETORES[Math.round(graus / 45) % 8]!
}
