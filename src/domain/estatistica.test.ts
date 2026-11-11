import { describe, expect, it } from 'vitest'
import { descritiva, pctNoLimite } from './estatistica'

describe('descritiva', () => {
  it('média, mediana, extremos e desvio', () => {
    const d = descritiva([1, 2, 3, 4, 10])!
    expect(d).toMatchObject({ n: 5, min: 1, max: 10, media: 4, mediana: 3 })
    expect(d.desvio).toBeCloseTo(3.536, 3)
  })
  it('mediana de quantidade par é a média dos dois do meio', () => {
    expect(descritiva([1, 2, 3, 4])!.mediana).toBe(2.5)
  })
  it('um só valor tem desvio 0; sem valores devolve nulo; ignora não numéricos', () => {
    expect(descritiva([7])).toMatchObject({ n: 1, media: 7, desvio: 0 })
    expect(descritiva([])).toBeNull()
    expect(descritiva([Number.NaN, 2])!.n).toBe(1)
  })
})

describe('pctNoLimite', () => {
  it('conta quem atinge o limite (>=)', () => {
    expect(pctNoLimite([0, 1, 2, 3], 2)).toBe(50)
    expect(pctNoLimite([0, 0], 1)).toBe(0)
    expect(pctNoLimite([], 1)).toBe(0)
  })
})
