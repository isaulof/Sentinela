/** Estatística descritiva dos valores de um alvo no talhão (uma leitura por ponto). Usada no mapa e no relatório. */
export interface Descritiva {
  n: number
  min: number
  max: number
  media: number
  mediana: number
  /** Desvio-padrão amostral (n-1); 0 com um só valor. */
  desvio: number
}

export function descritiva(valores: readonly number[]): Descritiva | null {
  const v = valores.filter((x) => Number.isFinite(x)).sort((a, b) => a - b)
  const n = v.length
  if (n === 0) return null
  const media = v.reduce((a, b) => a + b, 0) / n
  const mediana = n % 2 ? v[(n - 1) / 2]! : (v[n / 2 - 1]! + v[n / 2]!) / 2
  const desvio = n > 1 ? Math.sqrt(v.reduce((a, x) => a + (x - media) ** 2, 0) / (n - 1)) : 0
  return { n, min: v[0]!, max: v[n - 1]!, media, mediana, desvio }
}

/** Porcentagem (0 a 100, inteira) dos valores que atingem o limite (>=). Sem valores, 0. */
export function pctNoLimite(valores: readonly number[], limite: number): number {
  const v = valores.filter((x) => Number.isFinite(x))
  return v.length ? Math.round((v.filter((x) => x >= limite).length / v.length) * 100) : 0
}
