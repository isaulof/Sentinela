/** Geometria de talhões. Funções puras, sem dependência de mapa ou DOM. */

export type LngLat = readonly [lng: number, lat: number]
export type XY = readonly [x: number, y: number]

const M_PER_DEG_LAT = 110_574
const M_PER_DEG_LNG_EQ = 111_320

export interface Projection {
  toXY: (p: LngLat) => XY
  toLngLat: (p: XY) => LngLat
}

/** Projeção equiretangular local (metros) centrada no polígono. Precisa para talhões (< 10 km). */
export function makeProjection(ring: readonly LngLat[]): Projection {
  const lngs = ring.map((p) => p[0])
  const lats = ring.map((p) => p[1])
  const lng0 = (Math.min(...lngs) + Math.max(...lngs)) / 2
  const lat0 = (Math.min(...lats) + Math.max(...lats)) / 2
  const kx = M_PER_DEG_LNG_EQ * Math.cos((lat0 * Math.PI) / 180)
  return {
    toXY: ([lng, lat]) => [(lng - lng0) * kx, (lat - lat0) * M_PER_DEG_LAT],
    toLngLat: ([x, y]) => [lng0 + x / kx, lat0 + y / M_PER_DEG_LAT],
  }
}

export function ringAreaM2(ring: readonly XY[]): number {
  let s = 0
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i]!
    const [x2, y2] = ring[(i + 1) % ring.length]!
    s += x1 * y2 - x2 * y1
  }
  return Math.abs(s) / 2
}

export const polygonAreaHa = (ring: readonly LngLat[]): number => {
  const proj = makeProjection(ring)
  return ringAreaM2(ring.map(proj.toXY)) / 10_000
}

export function pointInRing([x, y]: XY, ring: readonly XY[]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!
    const [xj, yj] = ring[j]!
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function distanceToSegment([px, py]: XY, [ax, ay]: XY, [bx, by]: XY): number {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2))
  return Math.hypot(px - ax - t * dx, py - ay - t * dy)
}

export function distanceToRingEdge(p: XY, ring: readonly XY[]): number {
  let min = Infinity
  for (let i = 0; i < ring.length; i++) {
    min = Math.min(min, distanceToSegment(p, ring[i]!, ring[(i + 1) % ring.length]!))
  }
  return min
}

export const distance = (a: XY, b: XY): number => Math.hypot(a[0] - b[0], a[1] - b[1])

/** Distância em metros entre dois pontos geográficos (haversine). */
export function haversineM(a: LngLat, b: LngLat): number {
  const R = 6_371_008.8
  const rad = Math.PI / 180
  const dLat = (b[1] - a[1]) * rad
  const dLng = (b[0] - a[0]) * rad
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export const polylineLength = (pts: readonly XY[]): number =>
  pts.slice(1).reduce((acc, p, i) => acc + distance(pts[i]!, p), 0)

/** Anel válido: ao menos 3 vértices distintos, área positiva, sem fechamento duplicado. */
export function normalizeRing(ring: readonly LngLat[]): LngLat[] {
  const out = [...ring]
  const first = out[0]
  const last = out[out.length - 1]
  if (out.length > 3 && first && last && first[0] === last[0] && first[1] === last[1]) out.pop()
  return out
}
