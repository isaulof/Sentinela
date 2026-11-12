import { useMemo } from 'react'
import { makeProjection, type LngLat } from '@/domain/geo'
import type { EstadoPonto } from '@/domain/ponto'
import type { PlanPoint } from '@/domain/sampling'
import { COR_ESTADO } from './estadoPonto'

/** Miniatura do talhão: contorno e pontos coloridos pelo estado. Funciona offline e carrega na hora. */
/** `numerar`: escreve o número de cada ponto dentro da bolinha (croqui do relatório). */
export function MiniTalhao({ anel, pontos, estados, numerar = false, className }: { anel: readonly LngLat[]; pontos: readonly PlanPoint[]; estados?: ReadonlyMap<string, EstadoPonto>; numerar?: boolean; className?: string }) {
  const g = useMemo(() => {
    const proj = makeProjection(anel)
    const ring = anel.map(proj.toXY)
    const xs = ring.map((p) => p[0])
    const ys = ring.map((p) => p[1])
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
    const lado = Math.max(x1 - x0, y1 - y0) || 1
    const pad = lado * 0.14
    const w = x1 - x0 + 2 * pad
    const h = y1 - y0 + 2 * pad
    const P = (p: LngLat) => { const [x, y] = proj.toXY(p); return [x - x0 + pad, y1 - y + pad] as const }
    return {
      w, h, r: Math.max(w, h) / 26,
      poligono: ring.map(([x, y]) => `${(x - x0 + pad).toFixed(1)},${(y1 - y + pad).toFixed(1)}`).join(' '),
      pts: pontos.map((p) => ({ id: p.id, ordem: p.order, xy: P(p.position) })),
    }
  }, [anel, pontos])
  return (
    <svg viewBox={`0 0 ${g.w} ${g.h}`} role="img" aria-label="Contorno do talhão e pontos de coleta" className={className} preserveAspectRatio="xMidYMid meet">
      <polygon points={g.poligono} fill="var(--brand-soft)" stroke="var(--brand)" strokeWidth={g.r * 0.35} strokeLinejoin="round" />
      {g.pts.map((p) => {
        const cor = COR_ESTADO[estados?.get(p.id) ?? 'a_coletar']
        const r = numerar ? g.r * 1.45 : g.r
        return (
          <g key={p.id}>
            <circle cx={p.xy[0]} cy={p.xy[1]} r={r} fill={cor.fundo} stroke="var(--surface)" strokeWidth={g.r * 0.28} />
            {numerar && <text x={p.xy[0]} y={p.xy[1]} textAnchor="middle" dominantBaseline="central" fontSize={r * 1.1} fontWeight={700} fill={cor.texto}>{p.ordem}</text>}
          </g>
        )
      })}
    </svg>
  )
}
