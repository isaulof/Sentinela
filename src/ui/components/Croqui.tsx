import { useMemo } from 'react'
import { makeProjection, type LngLat } from '@/domain/geo'
import type { Nivel } from '@/domain/decision'
import type { PlanPoint } from '@/domain/sampling'

const COR: Record<Nivel | 'sem', string> = {
  sem: 'var(--text-2)', nao_aplicavel: 'var(--text-2)', ausente: 'var(--ok)', abaixo: 'var(--ok)',
  proximo: 'var(--warn)', atingido: 'var(--danger)', deteccao: 'var(--info)',
}

interface Props {
  titulo?: string
  anel: readonly LngLat[]
  pontos: readonly PlanPoint[]
  caminho?: readonly (readonly LngLat[])[]
  niveis?: ReadonlyMap<string, Nivel>
  selecionado?: string | null
  proximo?: string | null
  onPonto?: (id: string) => void
  bufferM?: number
  /** Id do SVG, para exportação. */
  id?: string
}

/** Croqui do talhão: contorno, caminhamento e pontos de amostragem, com norte e escala. */
export function Croqui({ titulo, anel, pontos, caminho = [], niveis, selecionado, proximo, onPonto, id }: Props) {
  const g = useMemo(() => {
    const proj = makeProjection(anel)
    const ring = anel.map(proj.toXY)
    const xs = ring.map((p) => p[0])
    const ys = ring.map((p) => p[1])
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
    const pad = Math.max(x1 - x0, y1 - y0) * 0.08
    const w = x1 - x0 + 2 * pad
    const h = y1 - y0 + 2 * pad
    const P = ([x, y]: readonly [number, number]) => [x - x0 + pad, y1 - y + pad] as const
    const r = Math.max(w, h) / 46
    // barra de escala: 100/200/500 m conforme o tamanho
    const alvo = w / 4
    const escala = [50, 100, 200, 250, 500, 1000].reduce((a, b) => (Math.abs(b - alvo) < Math.abs(a - alvo) ? b : a))
    return {
      w, h, r, escala,
      poligono: ring.map(P).map((p) => p.join(',')).join(' '),
      linhas: caminho.map((l) => l.map((q) => P(proj.toXY(q as LngLat)).join(',')).join(' ')),
      pts: pontos.map((p) => ({ id: p.id, n: p.order, xy: P(proj.toXY(p.position)) })),
    }
  }, [anel, pontos, caminho])

  return (
    <svg id={id} viewBox={`0 0 ${g.w} ${g.h}`} role="img" aria-label={titulo ?? 'Croqui do talhão'} className="h-auto w-full rounded-2xl bg-surface-2">
      <polygon points={g.poligono} fill="var(--brand-soft)" stroke="var(--brand)" strokeWidth={g.r * 0.28} strokeLinejoin="round" />
      {g.linhas.map((l, i) => (
        <polyline key={i} points={l} fill="none" stroke="var(--text-2)" strokeOpacity={0.55} strokeWidth={g.r * 0.2} strokeDasharray={`${g.r * 0.7} ${g.r * 0.5}`} />
      ))}
      {g.pts.map((p) => {
        const nivel = niveis?.get(p.id)
        const cor = COR[nivel ?? 'sem']
        const ativo = p.id === selecionado
        return (
          <g key={p.id} transform={`translate(${p.xy[0]} ${p.xy[1]})`} onClick={onPonto ? () => onPonto(p.id) : undefined} style={onPonto ? { cursor: 'pointer' } : undefined} role={onPonto ? 'button' : undefined} aria-label={`${p.n}: ponto ${p.id}`}>
            {(ativo || p.id === proximo) && <circle r={g.r * 1.45} fill="none" stroke={ativo ? 'var(--brand-strong)' : 'var(--info)'} strokeWidth={g.r * 0.22} />}
            <circle r={g.r} fill={nivel ? cor : 'var(--surface)'} stroke={cor} strokeWidth={g.r * 0.2} />
            <text textAnchor="middle" dy="0.35em" fontSize={g.r * 1.0} fontWeight={700} fill={nivel ? 'var(--surface)' : 'var(--text)'}>{p.n}</text>
          </g>
        )
      })}
      {/* Norte */}
      <g transform={`translate(${g.w - g.r * 2.4} ${g.r * 3})`} fill="var(--text)">
        <path d={`M0 ${-g.r * 1.6} L${g.r * 0.8} ${g.r * 0.9} L0 ${g.r * 0.3} L${-g.r * 0.8} ${g.r * 0.9}Z`} />
        <text y={g.r * 2.6} textAnchor="middle" fontSize={g.r * 1.1} fontWeight={700}>N</text>
      </g>
      {/* Escala */}
      <g transform={`translate(${g.r * 1.5} ${g.h - g.r * 2})`} fill="var(--text)">
        <rect width={g.escala} height={g.r * 0.35} />
        <text y={-g.r * 0.4} fontSize={g.r * 1.05}>{g.escala} m</text>
      </g>
    </svg>
  )
}

const LEGENDA: { nivel: Nivel | 'sem'; texto: string }[] = [
  { nivel: 'sem', texto: 'Sem registro' },
  { nivel: 'abaixo', texto: 'Abaixo do nível' },
  { nivel: 'proximo', texto: 'Próximo do nível' },
  { nivel: 'atingido', texto: 'Nível atingido' },
  { nivel: 'deteccao', texto: 'Detectado' },
]

export function LegendaCroqui() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-apoio text-text-2">
      {LEGENDA.map((l) => (
        <li key={l.nivel} className="flex items-center gap-1.5">
          <span className="size-3 rounded-full border-2" style={{ borderColor: COR[l.nivel], background: l.nivel === 'sem' ? 'transparent' : COR[l.nivel] }} />
          {l.texto}
        </li>
      ))}
    </ul>
  )
}
