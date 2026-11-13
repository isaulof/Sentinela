import { Link } from '@tanstack/react-router'
import { useTempoAgora } from '@/data/tempoAgora'
import { chuvaDoDia, descreverTempo, grau, type IconeTempo } from '@/domain/tempoAgora'
import { horaLocal } from '@/domain/tempo'
import { Icon } from './Icon'

const COR_ICONE: Record<IconeTempo, string> = { sol: 'text-warn', lua: 'text-text-2', nuvemsol: 'text-warn', nuvemlua: 'text-text-2', nuvem: 'text-text-2', neblina: 'text-text-2', garoa: 'text-info', chuva: 'text-info', raio: 'text-danger' }

/** Clima de agora na tela inicial, bem enxuto: temperatura grande, condição, mín/máx e chuva só quando importa. Toque abre os Alertas. */
export function ClimaAgora({ lat, lng }: { lat: number; lng: number }) {
  const t = useTempoAgora(lat, lng)
  const base = 'flex min-h-[5.25rem] items-center gap-4 rounded-card bg-surface p-4 ring-1 ring-line'

  if (t.estado === 'carregando') return <div role="status" aria-label="Carregando o clima" className={`${base} animate-pulse`}><span aria-hidden className="size-10 rounded-full bg-surface-2" /><span aria-hidden className="h-8 w-40 rounded-lg bg-surface-2" /></div>
  if (t.estado === 'erro') return <p role="status" className={`${base} text-apoio text-text-2`}><Icon name="semwifi" size={22} className="shrink-0" />Clima indisponível agora.</p>

  const { agora, dias } = t.dados
  const hoje = dias[0]!
  const d = descreverTempo(agora.codigo, agora.ehDia)
  const chuva = chuvaDoDia(hoje)
  const rotulo = `Clima agora: ${Math.round(agora.temperaturaC)} graus, ${d.texto.toLowerCase()}. Mínima ${Math.round(hoje.minC)}, máxima ${Math.round(hoje.maxC)}.${chuva.relevante ? ` ${chuva.texto}.` : ''}${t.doCache ? ' Dado guardado, sem internet.' : ''} Abrir alertas de clima.`

  return (
    <Link to="/alertas" aria-label={rotulo} className={`${base} transition active:bg-surface-2`}>
      <Icon name={d.icone} size={40} className={`shrink-0 ${COR_ICONE[d.icone]}`} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2.5"><span className="text-titulo font-bold leading-none tabular-nums">{grau(agora.temperaturaC)}</span><span className="text-corpo font-semibold">{d.texto}</span></p>
        <p className="mt-1 text-apoio text-text-2">Mín {grau(hoje.minC)} · Máx {grau(hoje.maxC)}{t.doCache && <> · atualizado às {horaLocal(t.buscadoEm)}</>}</p>
        {chuva.relevante && <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-info-soft px-3 py-1 text-apoio font-semibold text-info"><Icon name="gota" size={14} />{chuva.texto}</p>}
      </div>
      <Icon name="seta" size={18} className="shrink-0 text-text-2" />
    </Link>
  )
}
