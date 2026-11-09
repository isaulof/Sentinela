import type { Pendencia } from './entidades'
import type { Nivel } from './decision'

/** Situação de um ponto de coleta, como o usuário enxerga no mapa. */
export type EstadoPonto = 'a_coletar' | 'sem_ocorrencia' | 'leve' | 'acao' | 'doenca' | 'diagnostico' | 'diagnosticado'

export const ROTULO_ESTADO: Record<EstadoPonto, string> = {
  a_coletar: 'A coletar',
  sem_ocorrencia: 'Sem ocorrência',
  leve: 'Achado leve',
  acao: 'Acima do nível de ação',
  doenca: 'Doença detectada',
  diagnostico: 'Aguardando diagnóstico',
  diagnosticado: 'Diagnosticado',
}

const POR_NIVEL: Record<Nivel, EstadoPonto> = {
  nao_aplicavel: 'sem_ocorrencia',
  ausente: 'sem_ocorrencia',
  abaixo: 'leve',
  proximo: 'leve',
  atingido: 'acao',
  deteccao: 'doenca',
}

/**
 * Estado do ponto: um achado sem diagnóstico (pendência aberta) tem prioridade sobre os demais, porque é a
 * próxima ação que o usuário precisa tomar. Um diagnóstico anexado marca o ponto como "diagnosticado", exceto
 * quando a medição já está acima do nível de ação ou com doença detectada: isso continua pesando mais.
 */
export function estadoDoPonto(pontoId: string, niveis: ReadonlyMap<string, Nivel>, pendencias: readonly Pendencia[]): EstadoPonto {
  if (pendencias.some((p) => p.pontoId === pontoId && !p.resolvida)) return 'diagnostico'
  const n = niveis.get(pontoId)
  const medido = n ? POR_NIVEL[n] : undefined
  if (medido === 'acao' || medido === 'doenca') return medido
  if (pendencias.some((p) => p.pontoId === pontoId && p.resolvida)) return 'diagnosticado'
  return medido ?? 'a_coletar'
}

export function estadosDosPontos(pontosIds: readonly string[], niveis: ReadonlyMap<string, Nivel>, pendencias: readonly Pendencia[]): Map<string, EstadoPonto> {
  return new Map(pontosIds.map((id) => [id, estadoDoPonto(id, niveis, pendencias)]))
}
