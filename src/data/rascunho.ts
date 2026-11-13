import type { CondicoesDia } from '@/domain/registro'
import type { AlvoId } from '@/knowledge/alvos'

/** Rascunho do formulário de registro de um ponto: sobrevive a app fechado, aba recarregada ou celular travado. */
export interface RascunhoRegistro {
  alvoId: AlvoId
  fase: string
  quantidade: number
  zero: boolean
  presente?: boolean
  severidade?: number
  desfolha?: number
  obs: string
  repeticoes: number
  condicoes: CondicoesDia
  estadio: string
  fotos: string[]
  /** Método informado (opcional); ausente = seguir o protocolo. */
  metodoUsado?: string
  salvoEm: string
}

/** Um rascunho por talhão e ponto. */
export const chaveRascunho = (talhaoId: string, pontoId: string): string => `rascunho:registro:${talhaoId}:${pontoId}`

/** Só vale guardar quando a pessoa já preencheu algo: formulário aberto e parado não gera rascunho. */
export function rascunhoTemConteudo(r: Omit<RascunhoRegistro, 'salvoEm'>): boolean {
  return r.fase !== '' || r.quantidade > 0 || r.zero || r.presente !== undefined || r.severidade !== undefined || r.desfolha !== undefined
    || r.obs.trim() !== '' || r.fotos.length > 0 || r.repeticoes !== 1 || Object.keys(r.condicoes).length > 0 || r.alvoId !== 'percevejo' || !!r.metodoUsado
}

export const VALIDADE_RASCUNHO_H = 24

/** Rascunho velho demais descreve outra visita: descarta. Dado corrompido também. */
export function rascunhoValido(r: unknown, agora: Date): r is RascunhoRegistro {
  const x = r as Partial<RascunhoRegistro> | null
  if (!x || typeof x !== 'object' || typeof x.salvoEm !== 'string' || typeof x.alvoId !== 'string' || typeof x.obs !== 'string' || !Array.isArray(x.fotos)) return false
  const t = Date.parse(x.salvoEm)
  return Number.isFinite(t) && agora.getTime() - t >= 0 && agora.getTime() - t <= VALIDADE_RASCUNHO_H * 3_600_000
}
