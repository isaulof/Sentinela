import type { AlvoId } from '@/knowledge/alvos'
import type { FonteId } from '@/knowledge/fontes'

/**
 * Funil de diagnóstico por evidências. Cada candidato (praga, doença ou causa não viva) tem um perfil
 * qualitativo de quão típica é cada resposta. A cada resposta, as compatibilidades são recalculadas;
 * a próxima pergunta é a que mais separa os candidatos que restaram (ganho de informação).
 *
 * A porcentagem é uma COMPATIBILIDADE entre o que o usuário viu e o perfil de cada candidato, com prior
 * uniforme. Não é probabilidade estatística calibrada: o app não afirma prevalência de nada.
 */
export type Frequencia = 'tipico' | 'comum' | 'possivel' | 'raro' | 'incompativel'

/** Quão provável é ver a resposta quando o candidato é a causa (escala ordinal, decisão de projeto). */
export const VEROSSIMILHANCA: Record<Frequencia, number> = { tipico: 0.9, comum: 0.6, possivel: 0.3, raro: 0.08, incompativel: 0.01 }
/** Resposta que o perfil não descreve: pesa igual para todos os candidatos que a omitem. */
export const NEUTRO = 0.15

export interface OpcaoFunil {
  id: string
  rotulo: string
  detalhe?: string
  /** Nome de ícone do app, usado quando ainda não há foto. */
  icone?: string
}
export interface PerguntaFunil {
  id: string
  texto: string
  dica?: string
  opcoes: OpcaoFunil[]
}

export type TipoCandidato = 'praga' | 'doenca' | 'abiotico'
export interface Candidato {
  id: string
  nome: string
  cientifico?: string
  tipo: TipoCandidato
  /** Por que esta causa combina com o que foi visto, em linguagem de campo. */
  resumo: string
  confundeCom: string[]
  comoConfirmar: string[]
  proximosPassos: string[]
  /** Alvo do monitoramento, quando o app mede este problema (liga ao registro e à Biblioteca). */
  alvo?: AlvoId
  fontes: FonteId[]
  /** 'projeto' = perfil de sintomas montado pela equipe; ainda a conferir contra as circulares (FONTES.md). */
  origem: 'fonte' | 'projeto'
  /** perguntaId → opcaoId → frequência com que a resposta aparece nesta causa. */
  perfil: Record<string, Record<string, Frequencia>>
}

/** perguntaId → opcaoId. Pergunta pulada ("não sei") simplesmente não consta. */
export type Respostas = Readonly<Record<string, string>>

export interface Classificado {
  candidato: Candidato
  /** 0 a 1; a soma de todos os candidatos é 1. */
  compat: number
}

const pesoDe = (c: Candidato, perguntaId: string, opcaoId: string): number => {
  const f = c.perfil[perguntaId]?.[opcaoId]
  return f ? VEROSSIMILHANCA[f] : NEUTRO
}

export function classificar(candidatos: readonly Candidato[], respostas: Respostas): Classificado[] {
  if (candidatos.length === 0) return []
  const brutos = candidatos.map((c) => Object.entries(respostas).reduce((p, [q, o]) => p * pesoDe(c, q, o), 1))
  const soma = brutos.reduce((a, b) => a + b, 0)
  return candidatos.map((candidato, i) => ({ candidato, compat: soma > 0 ? brutos[i]! / soma : 1 / candidatos.length })).sort((a, b) => b.compat - a.compat)
}

const entropia = (ps: readonly number[]) => ps.reduce((h, p) => (p > 0 ? h - p * Math.log2(p) : h), 0)

/** Ganho esperado de informação (em bits) de fazer a pergunta, dado o estado atual dos candidatos. */
export function ganhoDaPergunta(p: PerguntaFunil, ranking: readonly Classificado[]): number {
  const antes = entropia(ranking.map((r) => r.compat))
  // P(opção | candidato): pesos normalizados entre as opções da pergunta.
  const porCand = ranking.map((r) => {
    const w = p.opcoes.map((o) => pesoDe(r.candidato, p.id, o.id))
    const s = w.reduce((a, b) => a + b, 0)
    return w.map((x) => x / s)
  })
  let depois = 0
  p.opcoes.forEach((_, j) => {
    const conj = ranking.map((r, i) => r.compat * porCand[i]![j]!)
    const pj = conj.reduce((a, b) => a + b, 0)
    if (pj > 0) depois += pj * entropia(conj.map((x) => x / pj))
  })
  return antes - depois
}

export const GANHO_MINIMO = 0.05

/** Próxima pergunta: a de maior ganho entre as que ainda não foram respondidas nem puladas. Null = nada mais a separar. */
export function proximaPergunta(perguntas: readonly PerguntaFunil[], candidatos: readonly Candidato[], respostas: Respostas, puladas: ReadonlySet<string> = new Set(), inicial?: string): PerguntaFunil | null {
  // A primeira pergunta é sempre a mesma e a mais simples ("onde está o problema?"), para o usuário se situar.
  const abertura = inicial ? perguntas.find((p) => p.id === inicial) : undefined
  if (abertura && Object.keys(respostas).length === 0 && puladas.size === 0) return abertura
  const ranking = classificar(candidatos, respostas)
  let melhor: PerguntaFunil | null = null
  let melhorGanho = GANHO_MINIMO
  for (const p of perguntas) {
    if (p.id in respostas || puladas.has(p.id)) continue
    const g = ganhoDaPergunta(p, ranking)
    if (g > melhorGanho) { melhor = p; melhorGanho = g }
  }
  return melhor
}

export type Confianca = 'alta' | 'media' | 'baixa'

/** Confiança no primeiro colocado: depende do valor e da folga para o segundo. */
export function confianca(ranking: readonly Classificado[]): Confianca {
  const [a, b] = ranking
  if (!a) return 'baixa'
  const folga = b ? a.compat / Math.max(b.compat, 1e-9) : Infinity
  if (a.compat >= 0.7 && folga >= 2) return 'alta'
  if (a.compat >= 0.4 && folga >= 1.5) return 'media'
  return 'baixa'
}

/** O funil para sozinho quando já há uma resposta clara ou quando nenhuma pergunta separa mais os candidatos. */
export function podeEncerrar(ranking: readonly Classificado[], quantasRespondidas: number, haProximaPergunta: boolean): boolean {
  if (quantasRespondidas === 0) return false
  return confianca(ranking) === 'alta' || !haProximaPergunta
}

/** Verifica a base: perfis só citam perguntas e opções que existem; todo candidato tem conteúdo mínimo. */
export function validarBase(perguntas: readonly PerguntaFunil[], candidatos: readonly Candidato[]): string[] {
  const erros: string[] = []
  const mapa = new Map(perguntas.map((p) => [p.id, new Set(p.opcoes.map((o) => o.id))]))
  const ids = new Set<string>()
  for (const p of perguntas) if (p.opcoes.length < 2) erros.push(`pergunta "${p.id}" com menos de 2 opções`)
  for (const c of candidatos) {
    if (ids.has(c.id)) erros.push(`candidato "${c.id}" repetido`)
    ids.add(c.id)
    for (const [q, ops] of Object.entries(c.perfil)) {
      const validas = mapa.get(q)
      if (!validas) { erros.push(`${c.id}: pergunta "${q}" inexistente`); continue }
      for (const o of Object.keys(ops)) if (!validas.has(o)) erros.push(`${c.id}: opção "${o}" inexistente em "${q}"`)
    }
    if (c.proximosPassos.length === 0) erros.push(`${c.id}: sem próximos passos`)
    if (c.comoConfirmar.length === 0) erros.push(`${c.id}: sem como confirmar`)
    if (c.fontes.length === 0) erros.push(`${c.id}: sem fonte`)
    if (Object.keys(c.perfil).length < 3) erros.push(`${c.id}: perfil com menos de 3 perguntas`)
  }
  return erros
}
