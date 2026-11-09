import { useMemo, useState } from 'react'
import { usePendencias, useRegistros } from '@/data/hooks'
import { useFotoUrl } from '@/data/fotos'
import { avaliarRegistro, serieTemporal } from '@/domain/analise'
import type { PlanoSalvo, Talhao } from '@/domain/entidades'
import { estadosDosPontos, ROTULO_ESTADO, type EstadoPonto } from '@/domain/ponto'
import { amostrasNaData, ateODia, celulasCalor, LIMITE_ACAO, niveisNaData, resumirResultado, UNIDADE_ALVO, valorDoRegistro, visitas } from '@/domain/resultados'
import { ALVOS, LISTA_ALVOS, type AlvoId } from '@/knowledge/alvos'
import { SerieTemporal } from './Graficos'
import { Icon } from './Icon'
import { Badge, Card, Vazio, type Tom } from './kit'
import { Mapa } from './Mapa'
import { COR_ESTADO, type MarcadorPonto } from './estadoPonto'

const dataBr = (d: string) => `${d.slice(8)}/${d.slice(5, 7)}`
const TOM: Record<string, Tom> = { ausente: 'ok', abaixo: 'ok', proximo: 'warn', atingido: 'danger', deteccao: 'info', nao_aplicavel: 'neutral' }
const LEGENDA: EstadoPonto[] = ['sem_ocorrencia', 'leve', 'acao', 'doenca', 'diagnostico', 'diagnosticado']

function Foto({ id }: { id: string }) {
  const url = useFotoUrl(id)
  return <div className="size-20 overflow-hidden rounded-xl border border-line bg-surface-2">{url && <img src={url} alt="Foto do ponto" className="size-full object-cover" />}</div>
}

/** Mapa inteligente do talhão: estado de cada ponto, mapa de calor por alvo e linha do tempo entre as visitas. */
export function Resultados({ talhao, plano }: { talhao: Talhao; plano: PlanoSalvo }) {
  const registros = useRegistros(talhao.id)
  const pendencias = usePendencias(talhao.id)
  const [alvo, setAlvo] = useState<AlvoId | null>(null)
  const [diaSel, setDiaSel] = useState<number | null>(null) // índice na lista de visitas; null = a mais recente
  const [calorLigado, setCalorLigado] = useState(true)
  const [pontoSel, setPontoSel] = useState<string | null>(null)

  const regs = useMemo(() => registros ?? [], [registros])
  const dias = useMemo(() => visitas(regs), [regs])
  const i = diaSel === null ? dias.length - 1 : Math.min(diaSel, dias.length - 1)
  const dia = dias[i]
  const alvoCalor: AlvoId = alvo ?? 'percevejo'

  const pendNaData = useMemo(() => (pendencias ?? []).filter((p) => !dia || p.criadoEm.slice(0, 10) <= dia), [pendencias, dia])
  const niveis = useMemo(() => (dia ? niveisNaData(regs, dia, alvo) : new Map()), [regs, dia, alvo])
  const estados = useMemo(() => estadosDosPontos(plano.pontos.map((p) => p.id), niveis, alvo ? [] : pendNaData), [plano, niveis, pendNaData, alvo])
  const marcadores = useMemo<MarcadorPonto[]>(() => plano.pontos.map((p) => ({ id: p.id, ordem: p.order, posicao: p.position, estado: estados.get(p.id) ?? 'a_coletar', rotuloEstado: ROTULO_ESTADO[estados.get(p.id) ?? 'a_coletar'] })), [plano, estados])

  const amostras = useMemo(() => (dia ? amostrasNaData(regs, dia, alvoCalor) : []), [regs, dia, alvoCalor])
  const limite = LIMITE_ACAO[alvoCalor]
  const calor = useMemo(() => {
    if (!calorLigado || !alvo || amostras.length === 0) return null
    const { celulas, max } = celulasCalor(talhao.anel, amostras)
    return { celulas, teto: Math.max(max, limite ?? 0, 1) }
  }, [calorLigado, alvo, amostras, talhao.anel, limite])

  const resumo = useMemo(() => (dia ? resumirResultado(plano.pontos.map((p) => p.id), regs, dia) : null), [plano, regs, dia])
  const serie = useMemo(() => serieTemporal(ateODia(regs, dia ?? '').filter((r) => r.alvo === alvoCalor).map((r) => ({ ...r, quantidade: valorDoRegistro(r) }))), [regs, dia, alvoCalor])
  const enquadrar = useMemo(() => talhao.anel, [talhao])

  if (registros === undefined) return null
  if (dias.length === 0) return <Vazio icone="mapa" titulo="Ainda não há coleta neste talhão" texto="Quando você registrar os primeiros pontos, o mapa de resultados começa a se montar aqui." />

  const ponto = plano.pontos.find((p) => p.id === pontoSel)
  const regsPonto = ponto && dia ? ateODia(regs, dia).filter((r) => r.pontoId === ponto.id && (!alvo || r.alvo === alvo)) : []
  const pendPonto = ponto ? pendNaData.filter((p) => p.pontoId === ponto.id) : []
  const fotos = [...regsPonto.flatMap((r) => r.fotoIds), ...pendPonto.flatMap((p) => p.fotoIds)]
  const ehUltima = i === dias.length - 1

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por alvo">
          <button type="button" aria-pressed={alvo === null} onClick={() => setAlvo(null)} className={`min-h-11 rounded-xl border px-4 text-sm font-semibold ${alvo === null ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface hover:bg-surface-2'}`}>Todos</button>
          {LISTA_ALVOS.map((a) => (
            <button key={a.id} type="button" aria-pressed={alvo === a.id} onClick={() => setAlvo(a.id)} className={`min-h-11 rounded-xl border px-4 text-sm font-semibold ${alvo === a.id ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface hover:bg-surface-2'}`}>{a.nome}</button>
          ))}
        </div>

        <Mapa
          className="h-[48dvh] w-full overflow-hidden rounded-card border border-line lg:h-[64dvh]"
          talhoes={[talhao]} selecionadoId={talhao.id} onSelecionar={() => {}}
          marcadores={marcadores} pontoSelecionado={pontoSel} onPonto={setPontoSel} calor={calor} caminho={[]} enquadrar={enquadrar}
        />

        <div className="space-y-2">
          <label className="flex items-center justify-between gap-3 font-semibold" htmlFor="visita">
            <span>Visita: {dia ? dataBr(dia) : '—'}{ehUltima ? ' (mais recente)' : ''}</span>
            <span className="text-sm font-normal text-text-2">{i + 1} de {dias.length}</span>
          </label>
          <input id="visita" type="range" min={0} max={Math.max(0, dias.length - 1)} step={1} value={i} disabled={dias.length < 2} onChange={(e) => setDiaSel(Number(e.target.value))} className="w-full accent-[var(--brand)]" aria-valuetext={dia ? `Visita de ${dataBr(dia)}` : ''} />
          {dias.length < 2 && <p className="text-sm text-text-2">Com mais de uma visita, você poderá ver a evolução ao longo do tempo.</p>}
        </div>

        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-2" aria-label="Legenda do mapa">
          {LEGENDA.map((e) => <li key={e} className="flex items-center gap-1.5"><span className="size-3.5 rounded-full border border-white/70" style={{ background: COR_ESTADO[e].fundo }} />{ROTULO_ESTADO[e]}</li>)}
        </ul>
      </div>

      <div className="space-y-4">
        {resumo && (
          <Card className="space-y-3">
            <h2 className="text-lg">Resumo do talhão</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-surface-2 p-3"><p className="text-3xl font-bold tabular-nums">{resumo.pctComOcorrencia}%</p><p className="text-sm text-text-2">dos pontos com ocorrência</p></div>
              <div className="rounded-2xl bg-surface-2 p-3"><p className="text-3xl font-bold tabular-nums">{resumo.coletados}/{resumo.total}</p><p className="text-sm text-text-2">pontos coletados</p></div>
            </div>
            <p>{resumo.alvoDominante ? <>Maior atenção: <b>{ALVOS[resumo.alvoDominante].nome}</b>{resumo.pontosEmAtencao.length > 0 && <> em {resumo.pontosEmAtencao.length} ponto(s)</>}.</> : 'Nenhum ponto em atenção nesta visita.'}</p>
            <p className="text-sm text-text-2">Quem decide se aplica algum produto é o agrônomo.</p>
          </Card>
        )}

        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg">Mapa de calor</h2>
            {alvo && <button type="button" role="switch" aria-checked={calorLigado} onClick={() => setCalorLigado((v) => !v)} className={`min-h-10 rounded-full px-4 text-sm font-semibold ${calorLigado ? 'bg-brand text-on-brand' : 'bg-surface-2 text-text-2'}`}>{calorLigado ? 'Ligado' : 'Desligado'}</button>}
          </div>
          {!alvo ? <p className="text-text-2">Escolha um alvo acima (por exemplo, Percevejo-marrom) para ver onde o problema se concentra.</p> : amostras.length === 0 ? <p className="text-text-2">Sem registros de {ALVOS[alvo].nome} até esta visita.</p> : (
            <>
              <p className="text-text-2">{ALVOS[alvo].nome}: cores mais fortes indicam valores mais altos ({UNIDADE_ALVO[alvo]}).{limite !== undefined && <> Nível de ação: <b className="text-text">{limite}</b>.</>}</p>
              <div className="h-3 rounded-full" style={{ background: 'linear-gradient(90deg,#fff3b0,#f59f3a,#c0391f)' }} aria-hidden />
              <p className="text-xs text-text-2">Estimativa por interpolação (IDW) entre os pontos coletados; não é uma medição em cada metro do talhão.</p>
            </>
          )}
        </Card>

        {alvo && serie.length > 0 && (
          <Card className="space-y-2">
            <h2 className="text-lg">Evolução no tempo</h2>
            <SerieTemporal serie={serie} {...(limite !== undefined ? { limite } : {})} unidade={UNIDADE_ALVO[alvo]} />
          </Card>
        )}

        <Card className="space-y-3" aria-live="polite">
          {!ponto ? <><h2 className="text-lg">Ponto selecionado</h2><p className="text-text-2">Toque em um ponto do mapa para ver as fotos, as medidas e o diagnóstico.</p></> : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg">Ponto {ponto.order}</h2><Badge tom={estados.get(ponto.id) === 'acao' ? 'danger' : estados.get(ponto.id) === 'leve' ? 'warn' : 'neutral'}>{ROTULO_ESTADO[estados.get(ponto.id) ?? 'a_coletar']}</Badge></div>
              {pendPonto.map((p) => (
                <div key={p.id} className="rounded-2xl bg-surface-2 p-3">
                  <p className="font-semibold">{p.resolvida ? `Diagnóstico: ${p.resolvida.titulo}${p.resolvida.compatibilidadePct !== undefined ? ` · ${p.resolvida.compatibilidadePct}% compatível` : ''}` : 'Aguardando diagnóstico'}</p>
                  {p.nota && <p className="text-sm text-text-2">{p.nota}</p>}
                </div>
              ))}
              {regsPonto.length === 0 && pendPonto.length === 0 && <p className="text-text-2">Sem registros neste ponto{alvo ? ` para ${ALVOS[alvo].nome}` : ''} até esta visita.</p>}
              <ul className="divide-y divide-line">
                {regsPonto.slice().reverse().map((r) => {
                  const a = avaliarRegistro(r)
                  return (
                    <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                      <div><p className="font-semibold">{ALVOS[r.alvo].nome}</p><p className="text-sm text-text-2">{dataBr(r.criadoEm.slice(0, 10))} · {r.zero ? 'nenhuma ocorrência' : r.presente !== undefined ? `presente · ${r.severidadePct ?? 0}%` : `${r.quantidade} por metro`}</p></div>
                      <Badge tom={TOM[a.nivel] ?? 'neutral'}>{a.titulo}</Badge>
                    </li>
                  )
                })}
              </ul>
              {fotos.length > 0 && <div className="flex flex-wrap gap-2">{fotos.map((f) => <Foto key={f} id={f} />)}</div>}
              <div className="flex flex-wrap gap-3 text-sm font-semibold">
                <span className="inline-flex items-center gap-1 text-text-2"><Icon name="info" size={16} />{regsPonto[0]?.posicaoSimulada ? 'Posição simulada (sala de aula)' : 'Posição por GPS'}</span>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
