import { describe, expect, it } from 'vitest'
import { distanceToRingEdge, makeProjection, pointInRing, polygonAreaHa, type LngLat } from './geo'
import { DEFAULT_BUFFER_M, generatePlan, recommendedPointCount } from './sampling'

/** Retângulo em metros, ao redor de Lucas do Rio Verde, convertido para lng/lat. */
function rect(wM: number, hM: number, lat = -13.05, lng = -55.92): LngLat[] {
  const kx = 111_320 * Math.cos((lat * Math.PI) / 180)
  const ky = 110_574
  const c: [number, number][] = [[0, 0], [wM, 0], [wM, hM], [0, hM]]
  return c.map(([x, y]) => [lng + x / kx, lat + y / ky] as LngLat)
}

describe('geo', () => {
  it('calcula a área de um talhão de 400 x 500 m como 20 ha', () => {
    expect(polygonAreaHa(rect(400, 500))).toBeCloseTo(20, 1)
  })
})

describe('recommendedPointCount', () => {
  it.each([[10, 10], [50, 10], [51, 11], [100, 15], [1000, 30]])('%i ha -> %i pontos', (ha, n) => {
    expect(recommendedPointCount(ha)).toBe(n)
  })
})

describe('generatePlan', () => {
  const ring = rect(400, 500)
  const proj = makeProjection(ring)
  const xy = ring.map(proj.toXY)

  for (const method of ['zigzag', 'diagonais'] as const) {
    it(`${method}: gera o número pedido de pontos, todos dentro e respeitando a bordadura`, () => {
      const plan = generatePlan(ring, { method, bufferM: DEFAULT_BUFFER_M, targetPoints: 12 })
      expect(plan.points).toHaveLength(12)
      for (const p of plan.points) {
        const q = proj.toXY(p.position)
        expect(pointInRing(q, xy)).toBe(true)
        expect(distanceToRingEdge(q, xy)).toBeGreaterThanOrEqual(DEFAULT_BUFFER_M - 0.5)
      }
      expect(plan.issues.filter((i) => i.severity === 'erro')).toEqual([])
    })
  }

  it('numera os pontos P01, P02... na ordem do caminhamento', () => {
    const plan = generatePlan(ring, { method: 'zigzag', bufferM: 30, targetPoints: 10 })
    expect(plan.points.map((p) => p.id)).toEqual(Array.from({ length: 10 }, (_, i) => `P${String(i + 1).padStart(2, '0')}`))
  })

  it('é determinístico', () => {
    const a = generatePlan(ring, { method: 'zigzag', bufferM: 30, targetPoints: 10 })
    const b = generatePlan(ring, { method: 'zigzag', bufferM: 30, targetPoints: 10 })
    expect(a.points).toEqual(b.points)
  })

  it('funciona em talhão girado (alinha o caminhamento ao maior eixo)', () => {
    const rotated = rect(300, 700).map(([lng, lat]) => [lng + (lat + 13.05) * 0.4, lat] as LngLat)
    const plan = generatePlan(rotated, { method: 'zigzag', bufferM: 30, targetPoints: 10 })
    expect(plan.points).toHaveLength(10)
  })

  it('erro quando a bordadura consome o talhão inteiro', () => {
    const plan = generatePlan(rect(50, 50), { method: 'zigzag', bufferM: 30, targetPoints: 10 })
    expect(plan.points).toHaveLength(0)
    expect(plan.issues.map((i) => i.code)).toContain('AREA_INSUFICIENTE')
  })

  it('avisa quando há menos pontos que o mínimo', () => {
    const plan = generatePlan(rect(120, 120), { method: 'diagonais', bufferM: 30, targetPoints: 3 })
    expect(plan.points).toHaveLength(3)
    const small = generatePlan(rect(100, 100), { method: 'zigzag', bufferM: 30, targetPoints: 10 })
    expect(small.issues.some((i) => i.code === 'POUCOS_PONTOS' || i.code === 'ESPACAMENTO_CURTO' || i.code === 'AREA_INSUFICIENTE')).toBe(true)
  })

  it('avisa bordadura curta', () => {
    const plan = generatePlan(ring, { method: 'zigzag', bufferM: 10, targetPoints: 10 })
    expect(plan.issues.map((i) => i.code)).toContain('BORDADURA_CURTA')
  })

  it('suporta talhão côncavo (em L) sem pontos fora do polígono', () => {
    const kx = 111_320 * Math.cos((-13.05 * Math.PI) / 180)
    const L = ([[0, 0], [500, 0], [500, 200], [200, 200], [200, 500], [0, 500]] as [number, number][]).map(
      ([x, y]) => [-55.92 + x / kx, -13.05 + y / 110_574] as LngLat,
    )
    const p = makeProjection(L)
    const plan = generatePlan(L, { method: 'zigzag', bufferM: 30, targetPoints: 12 })
    expect(plan.points.length).toBeGreaterThan(0)
    for (const pt of plan.points) expect(pointInRing(p.toXY(pt.position), L.map(p.toXY))).toBe(true)
  })
})
