/** O que o usuário deve fazer agora, em uma frase. Pura e testável; a tela só desenha o resultado. */
export interface ResumoTalhaoInicio {
  talhaoId: string
  nome: string
  /** Pontos já tratados: com registro ou com achado guardado para diagnóstico. */
  feitos: number
  total: number
  /** Pontos acima do nível de ação ou com doença detectada. */
  criticos: number
}

export type ProximaAcao =
  | { tipo: 'ordens'; quantas: number }
  | { tipo: 'diagnostico'; quantas: number }
  | { tipo: 'continuar'; talhaoId: string; nome: string; feitos: number; total: number }
  | { tipo: 'resultados'; talhaoId: string; nome: string; criticos: number }
  | { tipo: 'comecar'; talhaoId: string; nome: string }
  | { tipo: 'em_dia' }

/**
 * Prioridade: ordem de checagem aberta, achado esperando diagnóstico, coleta pela metade,
 * pontos críticos para ver no mapa, coleta ainda não iniciada, e por fim "tudo em dia".
 */
export function proximaAcao(ordensAbertas: number, pendenciasAbertas: number, talhoes: readonly ResumoTalhaoInicio[]): ProximaAcao {
  if (ordensAbertas > 0) return { tipo: 'ordens', quantas: ordensAbertas }
  if (pendenciasAbertas > 0) return { tipo: 'diagnostico', quantas: pendenciasAbertas }
  const comPlano = talhoes.filter((t) => t.total > 0)
  const meio = comPlano.find((t) => t.feitos > 0 && t.feitos < t.total)
  if (meio) return { tipo: 'continuar', talhaoId: meio.talhaoId, nome: meio.nome, feitos: meio.feitos, total: meio.total }
  const critico = comPlano.filter((t) => t.criticos > 0).sort((a, b) => b.criticos - a.criticos)[0]
  if (critico) return { tipo: 'resultados', talhaoId: critico.talhaoId, nome: critico.nome, criticos: critico.criticos }
  const virgem = comPlano.find((t) => t.feitos === 0)
  if (virgem) return { tipo: 'comecar', talhaoId: virgem.talhaoId, nome: virgem.nome }
  return { tipo: 'em_dia' }
}
