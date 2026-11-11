import type { Pendencia, PlanoSalvo, Talhao } from '@/domain/entidades'
import { camposV2, type Registro } from '@/domain/registro'
import { LISTA_ALVOS } from '@/knowledge/alvos'
import { novoId, repo as repoPadrao, type Repo } from './repo'

export interface ParamsSemOcorrencia {
  talhao: Talhao
  plano: PlanoSalvo
  pontoId: string
  amostrador: string
  /** GPS real, quando houver; senão vale a posição planejada (modo demonstração). */
  gps?: { posicao: readonly [number, number]; precisaoM: number } | null
  agora?: Date
  /** Responsável técnico e fuso da fazenda, quando cadastrados. */
  responsavel?: string
  fuso?: string
}

/**
 * "Sem ocorrência" em um toque: grava o zero explícito de cada alvo monitorado no ponto.
 * Cada zero passa pela mesma validação dos demais registros. Devolve os registros gravados (a tela mostra o que foi feito e permite desfazer).
 */
export async function registrarSemOcorrencia(p: ParamsSemOcorrencia, repo: Repo = repoPadrao): Promise<Registro[]> {
  const ponto = p.plano.pontos.find((x) => x.id === p.pontoId)
  if (!ponto) throw new Error(`O ponto ${p.pontoId} não pertence ao plano deste talhão.`)
  const agora = p.agora ?? new Date()
  const posicao = p.gps ? ([p.gps.posicao[0], p.gps.posicao[1]] as const) : ponto.position
  const gravados: Registro[] = []
  for (const alvo of LISTA_ALVOS) {
    const reg: Registro = {
      id: novoId('REG'), talhaoId: p.talhao.id, amostrador: p.amostrador, criadoEm: agora.toISOString(), estadio: p.talhao.estadio, finalidade: p.talhao.finalidade,
      pontoId: p.pontoId, posicao, posicaoSimulada: !p.gps, ...(p.gps ? { precisaoM: p.gps.precisaoM } : {}),
      alvo: alvo.id, fase: alvo.fases[0]!, quantidade: 0, zero: true, ...(alvo.tipo === 'doenca' ? { presente: false } : {}),
      fotoIds: [], observacao: '',
      ...camposV2({ posicao }, { metodo: alvo.coleta.metodo, parteDaPlanta: alvo.coleta.parte, planejada: ponto.position, inicio: agora, fim: agora, ...(p.responsavel ? { responsavel: p.responsavel } : {}), ...(p.fuso ? { fuso: p.fuso } : {}) }),
    }
    const r = await repo.salvarRegistro(reg, { agora, anelTalhao: p.talhao.anel, pontosDoPlano: p.plano.pontos.map((x) => x.id) })
    if (r.gravado) gravados.push(reg)
  }
  return gravados
}

export interface ParamsAnexarDiagnostico {
  talhaoId: string
  pontoId: string
  /** Achado pendente a resolver. Sem ele (diagnóstico feito direto), cria um registro já resolvido. */
  pendenciaId: string | null
  titulo: string
  alvoId?: string
  compatibilidadePct: number
  confianca?: 'alta' | 'media' | 'baixa'
  estadio: string
  amostrador: string
  agora?: Date
}

/** Anexa o resultado do diagnóstico ao ponto: resolve a pendência aberta ou cria uma já resolvida. */
export async function anexarDiagnostico(p: ParamsAnexarDiagnostico, repo: Repo = repoPadrao): Promise<Pendencia> {
  const agora = (p.agora ?? new Date()).toISOString()
  const resolvida = { titulo: p.titulo, ...(p.alvoId ? { alvoId: p.alvoId } : {}), compatibilidadePct: p.compatibilidadePct, ...(p.confianca ? { confianca: p.confianca } : {}), em: agora }
  const existentes = await repo.listarPendencias(p.talhaoId)
  const alvo = p.pendenciaId ? existentes.find((x) => x.id === p.pendenciaId) : undefined
  if (p.pendenciaId && !alvo) throw new Error('O achado pendente não foi encontrado. Ele pode ter sido apagado.')
  const pend: Pendencia = alvo
    ? { ...alvo, resolvida }
    : { id: novoId('PEN'), talhaoId: p.talhaoId, pontoId: p.pontoId, fotoIds: [], nota: 'Diagnóstico guiado', estadio: p.estadio, amostrador: p.amostrador, criadoEm: agora, resolvida }
  await repo.salvarPendencia(pend)
  return pend
}
