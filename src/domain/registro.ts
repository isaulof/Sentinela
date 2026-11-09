import type { AlvoId } from '@/knowledge/alvos'
import type { Finalidade } from './decision'
import type { LngLat } from './geo'
import type { Estadio } from './phenology'

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
  /** true no modo sala de aula: a posição é a planejada, não a do GPS. */
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
}
