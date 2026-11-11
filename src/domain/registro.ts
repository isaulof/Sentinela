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
