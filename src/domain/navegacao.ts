import { haversineM, type LngLat } from './geo'

/**
 * Guia até o ponto de coleta ("Waze de amostragem"). Funções puras: a tela só lê o GPS e desenha o resultado.
 *
 * Dentro do talhão não há ruas mapeadas, então o guia é em linha reta (distância, direção e linha no mapa),
 * que é o que serve a quem caminha na lavoura. Para chegar de carro até a fazenda, a tela oferece abrir o
 * Google Maps ou o Waze já com o destino preenchido.
 */

/** Velocidade média a pé, em m/s (≈ 5 km/h), usada para estimar o tempo até o ponto. Decisão de projeto. */
export const VELOCIDADE_A_PE_MS = 1.4

/** Acima disso o sinal é fraco: a distância mostrada pode errar por dezenas de metros. */
export const SINAL_FRACO_M = 30

/** Distância (m) a partir da qual vale oferecer rota de carro em outro app. */
export const DISTANCIA_DE_CARRO_M = 400

const ROTULOS_CARDEAIS = ['norte', 'nordeste', 'leste', 'sudeste', 'sul', 'sudoeste', 'oeste', 'noroeste'] as const

/** Rumo inicial de `a` para `b`, em graus de 0 a 360 (0 = norte, 90 = leste). */
export function rumoGraus(a: LngLat, b: LngLat): number {
  const rad = Math.PI / 180
  const dLng = (b[0] - a[0]) * rad
  const y = Math.sin(dLng) * Math.cos(b[1] * rad)
  const x = Math.cos(a[1] * rad) * Math.sin(b[1] * rad) - Math.sin(a[1] * rad) * Math.cos(b[1] * rad) * Math.cos(dLng)
  return ((Math.atan2(y, x) / rad) + 360) % 360
}

export const nomeCardeal = (graus: number): string => ROTULOS_CARDEAIS[Math.round((((graus % 360) + 360) % 360) / 45) % 8]!

/** "820 m", "1,2 km". Abaixo de 100 m arredonda de 5 em 5 para não "tremer" a cada leitura do GPS. */
export function formatarDistancia(m: number): string {
  if (m >= 995) return `${(m / 1000).toFixed(1).replace('.', ',')} km`
  if (m < 100) return `${Math.max(0, Math.round(m / 5) * 5)} m`
  return `${Math.round(m / 10) * 10} m`
}

/** "~3 min" a pé; "menos de 1 min" quando está perto. */
export function formatarTempoAPe(m: number): string {
  const min = m / VELOCIDADE_A_PE_MS / 60
  if (min < 1) return 'menos de 1 min'
  if (min >= 90) return `~${Math.round(min / 60)} h`
  return `~${Math.round(min)} min`
}

/**
 * Raio de chegada: 10 m, ou a imprecisão do GPS quando maior, limitado a 20 m.
 * Assim um sinal ruim não declara "chegou" a 40 m do ponto, nem exige 3 m de um GPS que só acerta 12.
 */
export const raioDeChegada = (precisaoM: number): number => Math.min(20, Math.max(10, precisaoM))

export interface Guia {
  distanciaM: number
  /** Rumo da sua posição até o ponto (0 = norte). */
  rumo: number
  cardeal: string
  chegou: boolean
  sinalFraco: boolean
  /** Graus a girar para ficar de frente para o ponto, a partir de para onde você está andando. Null se parado/sem bússola. */
  seta: number | null
}

/** `rumoAparelho` é o sentido do deslocamento informado pelo GPS (só existe quando a pessoa está andando). */
export function guiarAte(eu: LngLat, precisaoM: number, alvo: LngLat, rumoAparelho: number | null = null): Guia {
  const distanciaM = haversineM(eu, alvo)
  const rumo = rumoGraus(eu, alvo)
  const temRumo = rumoAparelho !== null && Number.isFinite(rumoAparelho)
  return {
    distanciaM,
    rumo,
    cardeal: nomeCardeal(rumo),
    chegou: distanciaM <= raioDeChegada(precisaoM),
    sinalFraco: precisaoM > SINAL_FRACO_M,
    seta: temRumo ? (((rumo - rumoAparelho) % 360) + 360) % 360 : null,
  }
}

/** Círculo (polígono) de raio `raioM` ao redor de `centro`, para desenhar a imprecisão do GPS no mapa. */
export function circuloGeo(centro: LngLat, raioM: number, passos = 48): LngLat[] {
  const kx = 111_320 * Math.cos((centro[1] * Math.PI) / 180)
  return Array.from({ length: passos }, (_, i) => {
    const a = (i / passos) * 2 * Math.PI
    return [centro[0] + (raioM * Math.sin(a)) / kx, centro[1] + (raioM * Math.cos(a)) / 110_574] as LngLat
  })
}

/** Links para abrir a rota de carro até o ponto em outro app. */
export function linksDeRota(alvo: LngLat): { google: string; waze: string } {
  const [lng, lat] = alvo
  const ll = `${lat.toFixed(6)},${lng.toFixed(6)}`
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${ll}&travelmode=driving`,
    waze: `https://waze.com/ul?ll=${ll}&navigate=yes`,
  }
}
