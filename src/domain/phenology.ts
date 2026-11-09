/** Estádios fenológicos da soja (Fehr & Caviness): VE, VC, V1..Vn, R1..R8. */
export type Estadio = string

const RE = /^(VE|VC|V(\d{1,2})|R([1-8]))$/

export function isEstadio(s: string): boolean {
  if (!RE.test(s)) return false
  const m = /^V(\d{1,2})$/.exec(s)
  return !m || (Number(m[1]) >= 1 && Number(m[1]) <= 25)
}

/** Posição ordenável: VE=0, VC=1, Vn=1+n, Rn=100+n. */
export function ordem(e: Estadio): number {
  if (!isEstadio(e)) throw new RangeError(`Estádio inválido: ${e}`)
  if (e === 'VE') return 0
  if (e === 'VC') return 1
  const n = Number(e.slice(1))
  return e[0] === 'V' ? 1 + n : 100 + n
}

export const isVegetativo = (e: Estadio): boolean => e[0] === 'V'
export const isReprodutivo = (e: Estadio): boolean => e[0] === 'R'
export const atingiu = (e: Estadio, minimo: Estadio): boolean => ordem(e) >= ordem(minimo)

/** Lista usada nos seletores do app. */
export const ESTADIOS: Estadio[] = [
  'VE', 'VC', ...Array.from({ length: 12 }, (_, i) => `V${i + 1}`),
  'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8',
]
