/**
 * Qualidade do GPS ao desenhar um talhão. `precisaoM` é o raio (em metros) em que o aparelho garante estar:
 * quanto menor, mais exata a posição.
 */
export const PRECISAO_BOA_M = 20
/** Acima disto o canto não é marcado: um erro de dezenas de metros muda a área e o plano de pontos. */
export const PRECISAO_MAXIMA_CANTO_M = 30
/** O primeiro sinal costuma vir de rede (Wi-Fi ou antena) e erra por quilômetros; só centraliza o mapa quando melhora disto. */
const PRECISAO_MAXIMA_PARA_CENTRAR_M = 100

/**
 * O mapa deve (re)centralizar na pessoa? Sim na primeira leitura aproveitável e, depois, sempre que o GPS melhora
 * bastante (40% ou mais), até chegar à precisão boa. Assim ele não fica preso no primeiro palpite, que é impreciso.
 */
export function deveRecentrar(melhorM: number | null, novaM: number): boolean {
  if (!Number.isFinite(novaM)) return false
  if (melhorM === null) return novaM <= PRECISAO_MAXIMA_PARA_CENTRAR_M
  return melhorM > PRECISAO_BOA_M && novaM < melhorM * 0.6
}

export type AvaliacaoCanto = { ok: true } | { ok: false; aviso: string }

/** Marcar um canto na posição exata do GPS só é permitido com precisão suficiente. */
export function avaliarCanto(precisaoM: number): AvaliacaoCanto {
  if (!Number.isFinite(precisaoM) || precisaoM > PRECISAO_MAXIMA_CANTO_M) {
    const medida = Number.isFinite(precisaoM) ? `±${Math.round(precisaoM)} m` : 'desconhecida'
    return { ok: false, aviso: `Precisão do GPS ${medida}. Vá para um lugar aberto e espere melhorar (ideal abaixo de ${PRECISAO_BOA_M} m).` }
  }
  return { ok: true }
}

export type NivelGps = 'boa' | 'media' | 'ruim'
export const nivelGps = (precisaoM: number): NivelGps => (precisaoM <= PRECISAO_BOA_M ? 'boa' : precisaoM <= PRECISAO_MAXIMA_CANTO_M ? 'media' : 'ruim')
