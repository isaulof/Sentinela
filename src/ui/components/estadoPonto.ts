import type { LngLat } from '@/domain/geo'
import type { Mudanca } from '@/domain/mapa'
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
  /** Cor própria (ex.: camada de mudança entre visitas); sem isso vale a cor do estado. */
  cor?: { fundo: string; texto: string }
  /** Texto dentro do marcador no lugar do número do ponto (ex.: o valor lido). O nome acessível continua com o número. */
  texto?: string
}

/** Cores e símbolos da camada "mudança desde a visita anterior". */
export const COR_MUDANCA: Record<Mudanca, { fundo: string; texto: string; rotulo: string; simbolo: string }> = {
  piorou: { fundo: '#d94a3d', texto: '#ffffff', rotulo: 'Piorou', simbolo: '▲' },
  melhorou: { fundo: '#2fa866', texto: '#ffffff', rotulo: 'Melhorou', simbolo: '▼' },
  igual: { fundo: '#8a96a3', texto: '#ffffff', rotulo: 'Igual', simbolo: '=' },
  novo: { fundo: '#3b8fe0', texto: '#ffffff', rotulo: 'Primeira leitura', simbolo: 'N' },
  sem_leitura: { fundo: '#0b1410', texto: '#ffffff', rotulo: 'Sem nova leitura', simbolo: '·' },
}
