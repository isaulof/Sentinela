/** Série temporal da média por dia, com linha do nível de ação. */
export function SerieTemporal({ serie, limite, unidade }: { serie: { dia: string; media: number; n: number }[]; limite?: number; unidade: string }) {
  if (serie.length === 0) return <p className="text-text-2">Sem registros deste alvo.</p>
  const W = 400, H = 170, m = { l: 34, r: 26, t: 12, b: 26 }
  const topo = Math.max(...serie.map((s) => s.media), limite ?? 0, 1) * 1.15
  const x = (i: number) => m.l + (serie.length === 1 ? (W - m.l - m.r) / 2 : (i / (serie.length - 1)) * (W - m.l - m.r))
  const y = (v: number) => H - m.b - (v / topo) * (H - m.t - m.b)
  const linha = serie.map((s, i) => `${x(i)},${y(s.media)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Evolução da média por dia (${unidade})`} className="h-auto w-full">
      {[0, 0.5, 1].map((f) => <g key={f}><line x1={m.l} x2={W - m.r} y1={y(topo * f / 1.15)} y2={y(topo * f / 1.15)} stroke="var(--line)" /><text x={m.l - 6} y={y(topo * f / 1.15) + 3} textAnchor="end" fontSize={9} fill="var(--text-2)">{(topo * f / 1.15).toFixed(0)}</text></g>)}
      {limite !== undefined && <g><line x1={m.l} x2={W - m.r} y1={y(limite)} y2={y(limite)} stroke="var(--danger)" strokeDasharray="5 4" strokeWidth={1.5} /><text x={W - m.r} y={y(limite) - 4} textAnchor="end" fontSize={9} fill="var(--danger)">nível de ação {limite}</text></g>}
      <polyline points={linha} fill="none" stroke="var(--brand)" strokeWidth={2.2} strokeLinejoin="round" />
      {serie.map((s, i) => (
        <g key={s.dia}>
          <circle cx={x(i)} cy={y(s.media)} r={4} fill="var(--brand)" stroke="var(--surface)" strokeWidth={1.5} />
          <text x={x(i)} y={H - 8} textAnchor="middle" fontSize={9} fill="var(--text-2)">{s.dia.slice(8)}/{s.dia.slice(5, 7)}</text>
          <text x={x(i)} y={y(s.media) - 8} textAnchor="middle" fontSize={9} fontWeight={700} fill="var(--text)">{s.media.toFixed(1)}</text>
        </g>
      ))}
    </svg>
  )
}
