import { Link } from '@tanstack/react-router'
import { useTempoAgora } from '@/data/tempoAgora'
import { chuvaDoDia, descreverTempo, grau, type IconeTempo } from '@/domain/tempoAgora'
import { Icon } from './Icon'

export const COR_ICONE_TEMPO: Record<IconeTempo, string> = { sol: 'text-warn', lua: 'text-text-2', nuvemsol: 'text-warn', nuvemlua: 'text-text-2', nuvem: 'text-text-2', neblina: 'text-text-2', garoa: 'text-info', chuva: 'text-info', raio: 'text-danger' }

/** Clima de agora na tela inicial, em uma faixa fina de duas linhas. Toque abre a tela de Clima (detalhes e fonte). */
export function ClimaAgora({ lat, lng }: { lat: number; lng: number }) {
  const t = useTempoAgora(lat, lng)
  const base = 'flex min-h-14 items-center gap-3 rounded-2xl bg-surface px-3.5 py-2.5 ring-1 ring-line'

  if (t.estado === 'carregando') return <div role="status" aria-label="Carregando o clima" className={`${base} animate-pulse`}><span aria-hidden className="size-7 rounded-full bg-surface-2" /><span aria-hidden className="h-5 w-32 rounded-lg bg-surface-2" /></div>
  if (t.estado === 'erro') return <p role="status" className={`${base} text-apoio text-text-2`}><Icon name="semwifi" size={20} className="shrink-0" />Clima indisponível agora.</p>

  const { agora, dias } = t.dados
  const hoje = dias[0]!
  const d = descreverTempo(agora.codigo, agora.ehDia)
  const chuva = chuvaDoDia(hoje)
  const rotulo = `Clima agora: ${Math.round(agora.temperaturaC)} graus, ${d.texto.toLowerCase()}. Mínima ${Math.round(hoje.minC)}, máxima ${Math.round(hoje.maxC)}.${chuva.relevante ? ` ${chuva.texto}.` : ''}${t.doCache ? ' Dado guardado, sem internet.' : ''} Abrir o clima completo.`

  return (
    <Link to="/clima" aria-label={rotulo} className={`${base} transition active:bg-surface-2`}>
      <Icon name={d.icone} size={30} className={`shrink-0 ${COR_ICONE_TEMPO[d.icone]}`} />
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline gap-2 leading-tight"><span className="text-subtitulo font-bold tabular-nums">{grau(agora.temperaturaC)}</span><span className="truncate text-apoio font-semibold">{d.texto}</span></p>
        <p className="truncate text-rotulo text-text-2">Mín {grau(hoje.minC)} · Máx {grau(hoje.maxC)}{chuva.relevante && <span className="font-semibold text-info"> · {chuva.texto}</span>}</p>
      </div>
      <Icon name="seta" size={16} className="shrink-0 text-text-2" />
    </Link>
  )
}
