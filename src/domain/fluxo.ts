import { classificar, confianca, dispensada, nichoDe, paraRamo, proximaPergunta, ramoDe, type Candidato, type Classificado, type Contexto, type EscolhaFoto, type PerguntaFunil, type Respostas } from './funil'

/**
 * Fluxo do diagnóstico em etapas, para o usuário saber onde está e por que cada pergunta aparece:
 *
 *   1. Triagem (3 perguntas fixas, sempre na mesma ordem): onde está o problema, como aparece no terreno,
 *      o que mudou nos últimos dias. Define o ramo.
 *   2. Detalhes: até MAX_DETALHES perguntas do ramo escolhido, na ordem de maior ganho de informação.
 *   3. Fotos: o usuário compara fotos dos candidatos que restaram e escolhe a mais parecida.
 *   4. Resultado.
 */
export const TRIAGEM = ['onde', 'terreno', 'recente'] as const
export const MAX_DETALHES = 5
/** Enquanto a confiança é baixa, vale perguntar mais: melhor que dar nome a um problema sem base. */
export const MAX_DETALHES_INCERTO = 8
/** Mínimo de perguntas de detalhe antes de aceitar parar por confiança alta. */
export const MIN_DETALHES = 2
export const MAX_RODADAS_FOTO = 2
const MAX_FOTOS_POR_RODADA = 4
const MIN_FOTOS_POR_RODADA = 3
const COMPAT_MIN_FOTO = 0.03
/** Na segunda rodada o usuário disse que nenhuma parecia: mostra os seguintes mesmo com compatibilidade baixa. */
const COMPAT_MIN_FOTO_2 = 0.003

export interface EstadoFluxo {
  respostas: Respostas
  puladas: ReadonlySet<string>
  fotos: readonly EscolhaFoto[]
  /** O usuário pediu para ver o resultado agora. */
  encerrar?: boolean
  /** Perguntas extras que o usuário pediu depois de um resultado inconclusivo. */
  mais?: number
}

export type Passo =
  | { tipo: 'pergunta'; pergunta: PerguntaFunil; fase: 'triagem' | 'detalhes'; /** 1 a 3 na triagem; contagem de detalhes depois. */ n: number }
  | { tipo: 'fotos'; candidatos: Candidato[]; rodada: number }
  | { tipo: 'resultado' }

const respondida = (e: EstadoFluxo, id: string) => id in e.respostas || e.puladas.has(id)
const ehTriagem = (id: string) => (TRIAGEM as readonly string[]).includes(id)

/** Candidatos para a comparação por fotos: os mais compatíveis e uma "pegadinha" (a causa com que costumam confundir). */
export function candidatosParaFotos(ranking: readonly Classificado[], jaMostrados: ReadonlySet<string>, minimo = COMPAT_MIN_FOTO): Candidato[] {
  const livres = ranking.filter((r) => !jaMostrados.has(r.candidato.id))
  const lista = livres.filter((r) => r.compat >= minimo).slice(0, MAX_FOTOS_POR_RODADA - 1).map((r) => r.candidato)
  const topo = lista[0]
  if (topo) {
    const confundivel = livres.map((r) => r.candidato).find((c) => !lista.includes(c) && (topo.confundeCom.includes(c.nome) || c.confundeCom.includes(topo.nome)))
    if (confundivel) lista.push(confundivel)
  }
  for (const r of livres) {
    if (lista.length >= MAX_FOTOS_POR_RODADA) break
    if (!lista.includes(r.candidato) && r.compat >= minimo) lista.push(r.candidato)
  }
  // Mesmo com a resposta já concentrada, a comparação mostra pelo menos 3 fotos (as seguintes do ranking) para o usuário confirmar.
  for (const r of livres) {
    if (lista.length >= MIN_FOTOS_POR_RODADA) break
    if (!lista.includes(r.candidato)) lista.push(r.candidato)
  }
  return lista
}

export function proximoPasso(perguntas: readonly PerguntaFunil[], candidatos: readonly Candidato[], estado: EstadoFluxo, contexto: Contexto = {}): Passo {
  const nResp = Object.keys(estado.respostas).length
  if (estado.encerrar && nResp > 0) return { tipo: 'resultado' }

  const triagem = TRIAGEM.map((id) => perguntas.find((p) => p.id === id)).filter((p): p is PerguntaFunil => !!p)
  const falta = triagem.find((p) => !respondida(estado, p.id))
  if (falta) return { tipo: 'pergunta', pergunta: paraRamo(falta, ramoDe(estado.respostas)), fase: 'triagem', n: triagem.indexOf(falta) + 1 }

  const ctx: Contexto = { ...contexto, perguntas, fotos: estado.fotos }
  const ranking = classificar(candidatos, estado.respostas, ctx)
  const feitas = perguntas.filter((p) => !ehTriagem(p.id) && respondida(estado, p.id)).length

  const limite = (confianca(ranking) === 'baixa' ? MAX_DETALHES_INCERTO : MAX_DETALHES) + (estado.mais ?? 0)
  if (feitas < limite && !(feitas >= MIN_DETALHES && confianca(ranking) === 'alta')) {
    const ramo = ramoDe(estado.respostas)
    // "Vi um bicho, mas não sei a que se parece" (pulou a pergunta) vale como "não consigo identificar": pede a anatomia geral.
    const ef: Respostas = estado.puladas.has('bicho') && estado.respostas['onde'] === 'bicho' ? { ...estado.respostas, bicho: 'nao_sei' } : estado.respostas
    const elegiveis = perguntas.filter((p) => !ehTriagem(p.id) && (!ramo || !p.ramos || p.ramos.includes(ramo)) && !dispensada(p, ef) && (p.requer ?? []).every((q) => respondida(estado, q)))
    // Com um nicho ativo (ex.: aplicação de produto), a linha é a do nicho; só amplia para o resto se ainda faltar base.
    const nicho = nichoDe(estado.respostas)
    const doNicho = nicho ? elegiveis.filter((p) => p.nichos?.includes(nicho)) : elegiveis
    // Etapas da conversa: o que decorre da resposta anterior, depois o sintoma, depois investigar, depois o contexto.
    const porEtapa = (lista: readonly PerguntaFunil[]): PerguntaFunil | null => {
      for (const e of [0, 1, 2, 3] as const) {
        const q = proximaPergunta(lista.filter((p) => (p.etapa ?? 2) === e), candidatos, estado.respostas, estado.puladas, undefined, ctx)
        if (q) return q
      }
      return null
    }
    let prox = porEtapa(doNicho)
    if (!prox && nicho && confianca(ranking) === 'baixa') prox = porEtapa(elegiveis)
    if (prox) return { tipo: 'pergunta', pergunta: paraRamo(prox, ramo), fase: 'detalhes', n: feitas + 1 }
  }

  const rodadas = estado.fotos.length
  const ultima = estado.fotos[rodadas - 1]
  if (rodadas === 0 || (rodadas < MAX_RODADAS_FOTO && ultima?.escolhido === 'nenhuma')) {
    const mostrados = new Set(estado.fotos.flatMap((f) => f.mostrados))
    const cands = candidatosParaFotos(ranking, mostrados, rodadas === 0 ? COMPAT_MIN_FOTO : COMPAT_MIN_FOTO_2)
    if (cands.length >= 2) return { tipo: 'fotos', candidatos: cands, rodada: rodadas + 1 }
  }
  return { tipo: 'resultado' }
}
