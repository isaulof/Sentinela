import type { Finalidade } from './decision'
import type { LngLat } from './geo'
import type { Estadio } from './phenology'
import type { PlanPoint, SamplingParams } from './sampling'

/** A fazenda monitorada. Uma por aparelho (decisão do plano v4); guarda o contexto que aparece nas telas e relatórios. */
export interface Fazenda {
  id: 'fazenda'
  nome: string
  proprietario?: string
  municipio: string
  /** Sigla da UF, ex.: MT. */
  uf: string
  /** Safra, ex.: 25/26. */
  safra: string
  responsavelTecnico?: string
  /** Fuso IANA em que as datas são lidas. */
  fuso: string
  atualizadaEm: string
}

/** A fazenda do projeto. É fixa (decisão do usuário): não há cadastro; só a safra é calculada pela data. */
export const FAZENDA_DO_PROJETO = { id: 'fazenda' as const, nome: 'Fazenda Santa Aurora', municipio: 'Lucas do Rio Verde', uf: 'MT', fuso: 'America/Cuiaba' }
/** Centro de Lucas do Rio Verde (MT): onde o clima é consultado quando ainda não há talhão desenhado. */
export const LOCAL_PADRAO_CLIMA = { lat: -13.0509, lng: -55.9096 }
export const NOME_FAZENDA_PADRAO = FAZENDA_DO_PROJETO.nome

export interface Talhao {
  id: string
  nome: string
  anel: LngLat[]
  cultivar: string
  dataPlantio: string // yyyy-mm-dd
  estadio: Estadio
  finalidade: Finalidade
  criadoEm: string
}

export interface PlanoSalvo {
  talhaoId: string
  params: SamplingParams
  pontos: PlanPoint[]
  caminho: LngLat[][]
  areaHa: number
  geradoEm: string
}

export type OrigemAlerta = 'iot' | 'drone' | 'clima'
export type StatusOrdem = 'aberta' | 'confirmada' | 'falso_positivo'

/** Ordem de checagem: alerta da camada IoT/drone que exige confirmação em campo (Bloco 4). */
export interface OrdemChecagem {
  id: string
  talhaoId: string
  pontoId: string
  origem: OrigemAlerta
  motivo: string
  criadaEm: string
  status: StatusOrdem
  resolvidaEm?: string
  /** Causa registrada pelo amostrador ao resolver (ex.: herbicida, compactação, estresse hídrico). */
  causa?: string
  registroId?: string
}

/**
 * Achado que o amostrador não soube identificar ("diagnóstico probabilístico"). Fica guardado no ponto
 * até alguém fazer o diagnóstico guiado e anexá-lo.
 */
export interface Pendencia {
  id: string
  talhaoId: string
  pontoId: string
  fotoIds: string[]
  nota: string
  estadio: string
  amostrador: string
  criadoEm: string
  /** Preenchido quando o diagnóstico é anexado ao ponto. */
  resolvida?: { titulo: string; alvoId?: string; compatibilidadePct?: number; /** Confiança em palavras (alta/media/baixa); registros antigos só têm a porcentagem. */ confianca?: 'alta' | 'media' | 'baixa'; em: string }
}

export interface FotoMeta {
  id: string
  criadoEm: string
  largura: number
  altura: number
}
