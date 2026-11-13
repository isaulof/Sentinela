import { Link } from '@tanstack/react-router'
import { useFazenda, useTalhoes } from '@/data/hooks'
import { useTempoAgora } from '@/data/tempoAgora'
import { localDoClima } from '@/domain/entidades'
import { horaLocal } from '@/domain/tempo'
import { chuvaDoDia, descreverTempo, grau, milimetros, type PrevisaoDoDia } from '@/domain/tempoAgora'
import { COR_ICONE_TEMPO } from '../components/ClimaAgora'
import { Icon } from '../components/Icon'
import { Card, Titulo, Vazio } from '../components/kit'

const nomeDoDia = (dia: string, i: number): string => {
  if (i === 0) return 'Hoje'
  if (i === 1) return 'Amanhã'
  const s = new Date(`${dia}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'UTC' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return <div className="rounded-xl bg-surface-2 p-3"><dt className="text-rotulo text-text-2">{rotulo}</dt><dd className="mt-0.5 text-subtitulo font-bold tabular-nums">{valor}</dd></div>
}

function LinhaDoDia({ d, i }: { d: PrevisaoDoDia; i: number }) {
  const t = descreverTempo(d.codigo, true)
  const chuva = chuvaDoDia(d)
  return (
    <li className="flex items-center gap-3 py-3">
      <Icon name={t.icone} size={28} className={`shrink-0 ${COR_ICONE_TEMPO[t.icone]}`} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{nomeDoDia(d.dia, i)}</p>
        <p className="text-apoio text-text-2">{t.texto}{chuva.relevante ? ` · ${chuva.texto}` : ''}</p>
      </div>
      <p className="shrink-0 text-corpo tabular-nums"><b>{grau(d.maxC)}</b> <span className="text-text-2">{grau(d.minC)}</span></p>
    </li>
  )
}

/** Clima completo no estilo dos apps de tempo, com a fonte dos dados sempre à vista. */
export function Clima() {
  const talhoes = useTalhoes()
  const fazenda = useFazenda()
  const local = localDoClima(talhoes ?? [])
  const t = useTempoAgora(local.lat, local.lng)

  return (
    <article className="mx-auto max-w-2xl space-y-5">
      <Link to="/" className="inline-flex min-h-11 items-center gap-1 text-apoio font-semibold text-brand"><Icon name="seta" size={18} className="rotate-180" />Início</Link>
      <Titulo sub={fazenda ? `${fazenda.nome} · ${fazenda.municipio}` : undefined}>Clima</Titulo>

      {t.estado === 'carregando' && <div role="status" aria-label="Carregando o clima" className="h-56 animate-pulse rounded-card bg-surface-2" />}
      {t.estado === 'erro' && <Vazio icone="semwifi" titulo="Clima indisponível agora" texto="Sem internet e sem dado guardado no aparelho. Tente de novo quando houver sinal." />}

      {t.estado === 'ok' && (() => {
        const { agora, dias } = t.dados
        const hoje = dias[0]!
        const d = descreverTempo(agora.codigo, agora.ehDia)
        return (
          <>
            <Card className="space-y-4 text-center">
              <Icon name={d.icone} size={64} className={`mx-auto ${COR_ICONE_TEMPO[d.icone]}`} />
              <p className="text-hero font-extrabold leading-none tabular-nums">{grau(agora.temperaturaC)}</p>
              <p className="text-subtitulo font-semibold">{d.texto}</p>
              <p className="text-corpo text-text-2">Máx {grau(hoje.maxC)} · Mín {grau(hoje.minC)}</p>
            </Card>

            <dl className="grid grid-cols-2 gap-3">
              {agora.sensacaoC !== null && <Dado rotulo="Sensação térmica" valor={grau(agora.sensacaoC)} />}
              <Dado rotulo="Umidade do ar" valor={`${Math.round(agora.umidadePct)}%`} />
              {agora.ventoKmh !== null && <Dado rotulo="Vento" valor={`${Math.round(agora.ventoKmh)} km/h`} />}
              <Dado rotulo="Chuva agora" valor={milimetros(agora.chuvaMm)} />
            </dl>

            <Card className="space-y-1">
              <h2 className="text-secao">Próximos dias</h2>
              <ul className="divide-y divide-line">{dias.map((x, i) => <LinhaDoDia key={x.dia} d={x} i={i} />)}</ul>
            </Card>

            <Card className="space-y-2 bg-surface-2">
              <h2 className="text-secao">De onde vêm os dados</h2>
              <p className="text-apoio leading-relaxed text-text-2">
                Fonte: <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="font-semibold text-brand underline">Open-Meteo</a>, serviço gratuito de previsão por modelos meteorológicos. Não é uma estação na fazenda: é a estimativa para o ponto {local.lat.toFixed(3)}, {local.lng.toFixed(3)}, no centro do primeiro talhão.
              </p>
              <p className="text-apoio text-text-2">
                {t.doCache ? `Sem internet: mostrando o último dado guardado, de ${horaLocal(t.buscadoEm)}.` : `Atualizado às ${horaLocal(t.buscadoEm)}; renova sozinho a cada 15 minutos.`}
              </p>
            </Card>

            <Link to="/alertas" className="flex min-h-12 items-center justify-between gap-3 rounded-card border border-line bg-surface p-4 font-semibold hover:bg-surface-2">
              Risco de doenças pelo clima
              <Icon name="seta" size={18} className="text-text-2" />
            </Link>
          </>
        )
      })()}
    </article>
  )
}
