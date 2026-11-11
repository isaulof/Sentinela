import type { AlvoId } from '@/knowledge/alvos'
import type { Finalidade } from './decision'
import type { LngLat } from './geo'
import { haversineM } from './geo'
import type { Estadio } from './phenology'
import { FUSO_PADRAO } from './tempo'

/** Versão do protocolo de coleta usada nos registros novos (muda quando o método de algum alvo muda). */
export const PROTOCOLO_VERSAO = '2026-11'

/** Condições do dia da amostragem (preenchidas no formulário completo; todas opcionais). */
export interface CondicoesDia {
  tempo?: 'ensolarado' | 'nublado' | 'chuvoso'
  vento?: 'calmo' | 'moderado' | 'forte'
  folhaMolhada?: boolean
}

/** Ficha de registro (Bloco 3.1): cinco grupos de informação. */
export interface Registro {
  id: string
  // 1. Contexto e fenologia
  talhaoId: string
  amostrador: string
  criadoEm: string // ISO 8601 UTC, gerado pelo aparelho
  estadio: Estadio
  finalidade: Finalidade
  // 2. Georreferenciamento
  pontoId: string
  posicao: LngLat
  /** true no modo demonstração: a posição é a planejada, não a do GPS. */
  posicaoSimulada: boolean
  precisaoM?: number
  // 3. Alvo e fase
  alvo: AlvoId
  fase: string
  // 4. Medida
  quantidade: number
  /** Zero registrado explicitamente (nenhuma ocorrência). */
  zero: boolean
  presente?: boolean
  severidadePct?: number
  desfolhaPct?: number
  // 5. Evidência
  fotoIds: string[]
  observacao: string
  /** Ordem de checagem que originou o registro (camada híbrida), se houver. */
  ordemId?: string

  // ── Registro v2 (tudo opcional: registros antigos não têm e NÃO recebem valor inventado) ──
  /** 1 = registro anterior à v2 (método e fuso não foram guardados); 2 = completo. Ausente conta como 1. */
  schema?: 1 | 2
  /** Método de coleta aplicado, copiado do protocolo do alvo no momento do registro. */
  metodo?: string
  protocoloVersao?: string
  /** Repetições da amostragem (ex.: 5 batidas) e a área/comprimento amostrado (ex.: "5 batidas de 1 m"). */
  repeticoes?: number
  areaAmostrada?: string
  parteDaPlanta?: string
  /** Início e fim da amostragem no ponto (ISO UTC). `criadoEm` continua sendo o instante em que foi salvo. */
  inicioEm?: string
  fimEm?: string
  /** Fuso em que a data local deve ser lida (IANA), p. ex. America/Cuiaba. */
  fusoHorario?: string
  condicoes?: CondicoesDia
  /** Onde o ponto estava planejado (a `posicao` é onde foi de fato registrado) e a distância entre os dois. */
  posicaoPlanejada?: LngLat
  distanciaDoPontoM?: number
  /** Responsável técnico da fazenda e quem revisou o registro (quando o agrônomo confirma). */
  responsavel?: string
  revisadoPor?: string

  // ── Trilha de auditoria: nada é apagado; corrigir cria uma nova versão e anular só marca ──
  /** Número da versão (1 = original). Ausente conta como 1. */
  versao?: number
  /** Esta versão corrige o registro de id `corrigeId`. */
  corrigeId?: string
  /** Preenchido na versão antiga quando uma correção a substitui. */
  substituidoPorId?: string
  corrigidoEm?: string
  corrigidoPor?: string
  motivoCorrecao?: string
  /** Registro desfeito/anulado: continua guardado, mas não entra em nenhuma análise. */
  anuladoEm?: string
  anuladoPor?: string
  motivoAnulacao?: string
}

/** Vale para análise e mapa: não foi substituído por uma correção nem anulado. */
export const estaAtivo = (r: Pick<Registro, 'substituidoPorId' | 'anuladoEm'>): boolean => !r.substituidoPorId && !r.anuladoEm
export const ativos = <T extends Pick<Registro, 'substituidoPorId' | 'anuladoEm'>>(regs: readonly T[]): T[] => regs.filter(estaAtivo)

/** Campos que uma correção pode mudar: a medida e a evidência. Quem, quando e onde nunca mudam. */
export type Correcao = Partial<Pick<Registro, 'quantidade' | 'zero' | 'presente' | 'severidadePct' | 'desfolhaPct' | 'observacao' | 'fase' | 'fotoIds' | 'repeticoes' | 'areaAmostrada' | 'condicoes'>>

/**
 * Nova versão de um registro. Mantém `criadoEm` (o instante da medição, que define o dia da visita) e acrescenta
 * quem corrigiu, quando e por quê. A versão antiga é marcada como substituída por quem chama (repo).
 */
export function novaVersao(original: Registro, mudancas: Correcao, c: { id: string; autor: string; motivo: string; agora: Date }): Registro {
  const { substituidoPorId: _s, anuladoEm: _a, anuladoPor: _ap, motivoAnulacao: _m, ...base } = original
  return { ...base, ...mudancas, id: c.id, versao: (original.versao ?? 1) + 1, corrigeId: original.id, corrigidoEm: c.agora.toISOString(), corrigidoPor: c.autor, motivoCorrecao: c.motivo }
}

/** Cadeia de versões de um registro (da original à mais recente), a partir de qualquer id dela. */
export function cadeiaDeVersoes(todos: readonly Registro[], id: string): Registro[] {
  const porId = new Map(todos.map((r) => [r.id, r]))
  let raiz = porId.get(id)
  while (raiz?.corrigeId && porId.has(raiz.corrigeId)) raiz = porId.get(raiz.corrigeId)
  const cadeia: Registro[] = []
  for (let r = raiz; r; r = r.substituidoPorId ? porId.get(r.substituidoPorId) : undefined) cadeia.push(r)
  return cadeia
}

/** "5 batidas de 1 m" / "10 folhas": o que foi amostrado, a partir das repetições e do tipo do alvo. */
export function descreverAmostra(tipo: 'praga' | 'doenca', repeticoes: number): string {
  const n = Math.max(1, Math.floor(repeticoes))
  return tipo === 'praga' ? `${n} ${n === 1 ? 'batida' : 'batidas'} de 1 m` : `${n} ${n === 1 ? 'folha' : 'folhas'} inspecionada${n === 1 ? '' : 's'}`
}

export const METODO_NAO_INFORMADO = 'Método não informado (registro anterior à versão 2)'

/** Método a exibir: o gravado no registro ou a marca de "não informado", nunca um valor deduzido. */
export const metodoDoRegistro = (r: Pick<Registro, 'metodo'>): string => r.metodo ?? METODO_NAO_INFORMADO

/** Registro anterior à v2: sem método nem fuso guardados. */
export const ehRegistroAntigo = (r: Pick<Registro, 'schema'>): boolean => (r.schema ?? 1) < 2

/** Migração v1 → v2: só marca a versão. Nenhum campo novo é preenchido por suposição. */
export function migrarRegistro<T extends Pick<Registro, 'schema'>>(r: T): T {
  return r.schema ? r : { ...r, schema: 1 as const }
}

export interface ContextoV2 {
  metodo: string
  parteDaPlanta?: string
  /** Posição planejada do ponto no plano. */
  planejada: LngLat
  /** Início da amostragem. */
  inicio: Date
  fim: Date
  responsavel?: string
  fuso?: string
}

/** Campos v2 que o app consegue preencher sozinho; o formulário completo acrescenta os demais (F2). */
export function camposV2(r: Pick<Registro, 'posicao'>, c: ContextoV2): Required<Pick<Registro, 'schema' | 'metodo' | 'protocoloVersao' | 'inicioEm' | 'fimEm' | 'fusoHorario' | 'posicaoPlanejada' | 'distanciaDoPontoM'>> & Partial<Pick<Registro, 'parteDaPlanta' | 'responsavel'>> {
  return {
    schema: 2,
    metodo: c.metodo,
    protocoloVersao: PROTOCOLO_VERSAO,
    inicioEm: c.inicio.toISOString(),
    fimEm: c.fim.toISOString(),
    fusoHorario: c.fuso ?? FUSO_PADRAO,
    posicaoPlanejada: c.planejada,
    distanciaDoPontoM: Math.round(haversineM(r.posicao, c.planejada) * 10) / 10,
    ...(c.parteDaPlanta ? { parteDaPlanta: c.parteDaPlanta } : {}),
    ...(c.responsavel ? { responsavel: c.responsavel } : {}),
  }
}
