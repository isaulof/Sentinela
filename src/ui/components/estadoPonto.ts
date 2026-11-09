import type { LngLat } from '@/domain/geo'
import type { EstadoPonto } from '@/domain/ponto'

/** Cores por estado do ponto (mesma leitura em todos os mapas). */
export const COR_ESTADO: Record<EstadoPonto, { fundo: string; texto: string }> = {
  a_coletar: { fundo: '#0b1410', texto: '#ffffff' },
  sem_ocorrencia: { fundo: '#2fa866', texto: '#ffffff' },
  leve: { fundo: '#f2c230', texto: '#1a1500' },
  acao: { fundo: '#d94a3d', texto: '#ffffff' },
  doenca: { fundo: '#3b8fe0', texto: '#ffffff' },
  diagnostico: { fundo: '#8a5cd6', texto: '#ffffff' },
  diagnosticado: { fundo: '#12968f', texto: '#ffffff' },
}

export interface MarcadorPonto {
  id: string
  ordem: number
  posicao: LngLat
  estado: EstadoPonto
  rotuloEstado: string
  /** Há foto guardada neste ponto: o marcador ganha um selo de câmera. */
  temFoto?: boolean
}
