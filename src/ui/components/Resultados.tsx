import { Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { usePendencias, useRegistros } from '@/data/hooks'
import { useFotoUrl } from '@/data/fotos'
import { avaliarRegistro, serieTemporal } from '@/domain/analise'
import type { Nivel } from '@/domain/decision'
import type { PlanoSalvo, Talhao } from '@/domain/entidades'
import { rotuloDiagnostico } from '@/domain/funil'
import { estadosDosPontos, ROTULO_ESTADO, type EstadoPonto } from '@/domain/ponto'
import { calorHonesto, diferencaEntreVisitas, escalaDoAlvo, rotuloValor, type DiferencaPonto } from '@/domain/mapa'
import { amostrasNaData, ateODia, LIMITE_ACAO, niveisNaData, resumirResultado, setorDoFoco, UNIDADE_ALVO, valorDoRegistro, visitas } from '@/domain/resultados'
import { dataBr, dataHoraBr, diaLocal } from '@/domain/tempo'
import { ALVOS, LISTA_ALVOS, type AlvoId } from '@/knowledge/alvos'
import { useSessao } from '../state/store'
import { LegendaCalor, LegendaMudanca, PainelAnalise, PainelQualidade } from './AnaliseMapa'
import { ExportarTalhao } from './ExportarTalhao'
import { FichaPonto } from './FichaPonto'
import { FormPendencia } from './FormPendencia'
import { SerieTemporal } from './Graficos'
import { Icon } from './Icon'
import { Badge, Button, Card, Folha, Segmentado, Vazio, type Tom } from './kit'
import { Mapa } from './Mapa'
import { COR_ESTADO, COR_MUDANCA, type MarcadorPonto } from './estadoPonto'

const TOM: Record<string, Tom> = { ausente: 'ok', abaixo: 'ok', proximo: 'warn', atingido: 'danger', deteccao: 'info', nao_aplicavel: 'neutral' }
const TOM_ESTADO: Record<EstadoPonto, Tom> = { a_coletar: 'neutral', sem_ocorrencia: 'ok', leve: 'warn', acao: 'danger', doenca: 'info', diagnostico: 'info', diagnosticado: 'ok' }
const LEGENDA: EstadoPonto[] = ['sem_ocorrencia', 'leve', 'acao', 'doenca', 'diagnostico', 'diagnosticado']
const EM_ATENCAO: Nivel[] = ['proximo', 'atingido', 'deteccao']

function descreverMudanca(d: DiferencaPonto): string {
  const r = COR_MUDANCA[d.mudanca].rotulo
  if (d.mudanca === 'piorou' || d.mudanca === 'melhorou' || d.mudanca === 'igual') return `${r} (de ${rotuloValor(d.antes!)} para ${rotuloValor(d.agora)})`
  return `${r} (${rotuloValor(d.agora)})`
}

const lista = (ns: number[]) => (ns.length <= 1 ? ns.join('') : `${ns.slice(0, -1).join(', ')} e ${ns[ns.length - 1]}`)

function Foto({ id, className }: { id: string; className?: string }) {
  const url = useFotoUrl(id)
  return <div className={`overflow-hidden bg-surface-2 ${className ?? ''}`}>{url && <img src={url} alt="Foto do ponto" className="size-full object-cover" />}</div>
}

type Vista = { tipo: 'detalhe' } | { tipo: 'achado' } | { tipo: 'foto'; id: string } | { tipo: 'ficha' }

/** Mapa inteligente do talhão: estado de cada ponto, mapa de calor por alvo, leitura em texto e linha do tempo entre as visitas. */
export function Resultados({ talhao, plano }: { talhao: Talhao; plano: PlanoSalvo }) {
  const registros = useRegistros(talhao.id)
  const pendencias = usePendencias(talhao.id)
  const { setTalhao, setPontoFoco } = useSessao()
  const [escolha, setEscolha] = useState<AlvoId | null | undefined>(undefined) // undefined = ainda não escolheu: vale o alvo dominante
  const [diaSel, setDiaSel] = useState<number | null>(null) // índice na lista de visitas; null = a mais recente
  const [camada, setCamada] = useState<'calor' | 'estado' | 'mudanca'>('calor')
  const [valores, setValores] = useState(false)
  const [pontoSel, setPontoSel] = useState<string | null>(null)
  const [vista, setVista] = useState<Vista>({ tipo: 'detalhe' })
  const [tocando, setTocando] = useState(false)

  const regs = useMemo(() => registros ?? [], [registros])
  const dias = useMemo(() => visitas(regs), [regs])
  const i = diaSel === null ? dias.length - 1 : Math.min(diaSel, dias.length - 1)
  const dia = dias[i]
  const ehUltima = i === dias.length - 1

  const resumo = useMemo(() => (dia ? resumirResultado(plano.pontos.map((p) => p.id), regs, dia) : null), [plano, regs, dia])
  const alvo: AlvoId | null = escolha === undefined ? (resumo?.alvoDominante ?? null) : escolha
  const alvoCalor: AlvoId = alvo ?? 'percevejo'

  // Reprodução da linha do tempo: avança uma visita por vez e para na última.
  useEffect(() => {
    if (!tocando) return
    const t = setInterval(() => {
      setDiaSel((x) => {
        const atual = x === null ? dias.length - 1 : x
        if (atual >= dias.length - 1) { setTocando(false); return null }
        return atual + 1
      })
    }, 1100)
    return () => clearInterval(t)
  }, [tocando, dias.length])

  const pendNaData = useMemo(() => (pendencias ?? []).filter((p) => !dia || ehUltima || diaLocal(p.criadoEm) <= dia), [pendencias, dia, ehUltima])
  const niveis = useMemo(() => (dia ? niveisNaData(regs, dia, alvo) : new Map<string, Nivel>()), [regs, dia, alvo])
  const niveisAntes = useMemo(() => (i > 0 && dias[i - 1] ? niveisNaData(regs, dias[i - 1]!, alvo) : null), [regs, dias, i, alvo])
  const estados = useMemo(() => estadosDosPontos(plano.pontos.map((p) => p.id), niveis, alvo ? [] : pendNaData), [plano, niveis, pendNaData, alvo])

  const comFoto = useMemo(() => {
    const m = new Set<string>()
    if (dia) for (const r of ateODia(regs, dia)) if (r.fotoIds.length) m.add(r.pontoId)
    for (const p of pendNaData) if (p.fotoIds.length) m.add(p.pontoId)
    return m
  }, [regs, dia, pendNaData])
  const marcadores = useMemo<MarcadorPonto[]>(() => plano.pontos.map((p) => ({ id: p.id, ordem: p.order, posicao: p.position, estado: estados.get(p.id) ?? 'a_coletar', rotuloEstado: ROTULO_ESTADO[estados.get(p.id) ?? 'a_coletar'], temFoto: comFoto.has(p.id) })), [plano, estados, comFoto])

  const amostras = useMemo(() => (dia ? amostrasNaData(regs, dia, alvoCalor) : []), [regs, dia, alvoCalor])
  const limite = LIMITE_ACAO[alvoCalor]
  // Calor honesto: só com pelo menos 3 pontos, só dentro do raio de influência, na mesma escala em todas as visitas.
  const escala = useMemo(() => escalaDoAlvo(regs, alvoCalor), [regs, alvoCalor])
  const calorH = useMemo(() => (alvo ? calorHonesto(talhao.anel, amostras) : null), [alvo, talhao.anel, amostras])
  const calor = useMemo(() => (camada === 'calor' && calorH && calorH.celulas.length > 0 ? { celulas: calorH.celulas, teto: escala.teto, semDado: calorH.semDado } : null), [camada, calorH, escala.teto])
  const diaAnterior = i > 0 ? (dias[i - 1] ?? null) : null
  const diffs = useMemo(() => (alvo && dia && diaAnterior ? diferencaEntreVisitas(regs, dia, diaAnterior, alvo) : []), [regs, alvo, dia, diaAnterior])
  const valorPorPonto = useMemo(() => new Map(amostras.map((a) => [a.id, a.valor])), [amostras])
  const diffPorPonto = useMemo(() => new Map(diffs.map((d) => [d.pontoId, d])), [diffs])
  const marcadoresVista = useMemo<MarcadorPonto[]>(() => marcadores.map((m) => {
    if (!alvo) return m
    if (camada === 'mudanca' && diaAnterior) {
      const d = diffPorPonto.get(m.id)
      if (!d) return m
      const c = COR_MUDANCA[d.mudanca]
      return { ...m, cor: { fundo: c.fundo, texto: c.texto }, texto: c.simbolo, rotuloEstado: descreverMudanca(d) }
    }
    const v = valores ? valorPorPonto.get(m.id) : undefined
    return v === undefined ? m : { ...m, texto: rotuloValor(v) }
  }), [marcadores, alvo, camada, diaAnterior, diffPorPonto, valores, valorPorPonto])

  const serie = useMemo(() => serieTemporal(ateODia(regs, dia ?? '').filter((r) => r.alvo === alvoCalor).map((r) => ({ ...r, quantidade: valorDoRegistro(r) }))), [regs, dia, alvoCalor])

  // Leitura em texto: quantos pontos pedem atenção, onde se concentram e como está em relação à visita anterior.
  const leitura = useMemo(() => {
    const emAtencao = plano.pontos.filter((p) => EM_ATENCAO.includes(niveis.get(p.id) ?? 'nao_aplicavel'))
    const antes = niveisAntes ? plano.pontos.filter((p) => EM_ATENCAO.includes(niveisAntes.get(p.id) ?? 'nao_aplicavel')).length : null
    const acima = plano.pontos.filter((p) => niveis.get(p.id) === 'atingido').length
    return { emAtencao, antes, acima, setor: emAtencao.length ? setorDoFoco(talhao.anel, emAtencao.map((p) => p.position)) : null }
  }, [plano, niveis, niveisAntes, talhao.anel])

  const fotosTalhao = useMemo(() => {
    const ordem = new Map(plano.pontos.map((p) => [p.id, p.order]))
    const todas = [
      ...(dia ? ateODia(regs, dia) : []).flatMap((r) => r.fotoIds.map((id) => ({ id, pontoId: r.pontoId, quando: r.criadoEm }))),
      ...pendNaData.flatMap((p) => p.fotoIds.map((id) => ({ id, pontoId: p.pontoId, quando: p.criadoEm }))),
    ]
    return todas.filter((f) => ordem.has(f.pontoId)).sort((a, b) => b.quando.localeCompare(a.quando)).map((f) => ({ ...f, ordem: ordem.get(f.pontoId)! }))
  }, [plano, regs, dia, pendNaData])

  if (registros === undefined) return null
  if (dias.length === 0) return <Vazio icone="mapa" titulo="Ainda não há coleta neste talhão" texto="Registre os primeiros pontos e o mapa passa a mostrar onde estão os problemas, com mapa de calor e fotos." acao={<Link to="/coleta" onClick={() => setTalhao(talhao.id)} className="inline-flex min-h-12 items-center rounded-xl bg-brand px-5 font-semibold text-on-brand">Começar a coleta</Link>} />

  const ponto = plano.pontos.find((p) => p.id === pontoSel)
  const regsPonto = ponto && dia ? ateODia(regs, dia).filter((r) => r.pontoId === ponto.id && (!alvo || r.alvo === alvo)) : []
  const pendPonto = ponto ? pendNaData.filter((p) => p.pontoId === ponto.id) : []
  const fotosPonto = [...regsPonto.flatMap((r) => r.fotoIds), ...pendPonto.flatMap((p) => p.fotoIds)]
  const abrirPonto = (id: string, v: Vista = { tipo: 'detalhe' }) => { setPontoSel(id); setVista(v) }
  const fecharPonto = () => { setPontoSel(null); setVista({ tipo: 'detalhe' }) }
  const nomeAlvo = alvo ? ALVOS[alvo].nome : null

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_23rem]">
      <div className="min-w-0 space-y-3">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden" role="group" aria-label="Alvo do mapa">
          {[{ id: null, nome: 'Só pontos' }, ...LISTA_ALVOS].map((a) => (
            <button key={a.id ?? 'todos'} type="button" aria-pressed={alvo === a.id} onClick={() => setEscolha(a.id)} className={`min-h-10 shrink-0 rounded-full px-4 text-apoio font-semibold transition active:scale-95 ${alvo === a.id ? 'bg-brand text-on-brand' : 'bg-surface text-text-2 ring-1 ring-line'}`}>{a.nome}</button>
          ))}
        </div>

        {alvo && (
          <div className="flex flex-wrap items-center gap-2">
            <Segmentado rotulo="Camada do mapa" valor={camada} onChange={setCamada} opcoes={[{ id: 'calor', nome: 'Calor' }, { id: 'estado', nome: 'Estado' }, { id: 'mudanca', nome: 'Mudança', desabilitado: !diaAnterior }]} />
            <button type="button" aria-pressed={valores} onClick={() => setValores((v) => !v)} className={`min-h-11 rounded-xl border px-4 text-apoio font-semibold transition ${valores ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface-2 text-text hover:bg-line'}`}>Valores nos pontos</button>
          </div>
        )}

        <div className="relative">
          <Mapa
            className="h-[50dvh] w-full overflow-hidden rounded-card ring-1 ring-line lg:h-[62dvh]"
            talhoes={[talhao]} selecionadoId={talhao.id} onSelecionar={() => {}}
            marcadores={marcadoresVista} pontoSelecionado={pontoSel} onPonto={(id) => abrirPonto(id)} calor={calor} caminho={[]} enquadrar={talhao.anel}
          />
        </div>

        {alvo && camada === 'calor' && calorH && <LegendaCalor escala={escala} unidade={UNIDADE_ALVO[alvo]} calor={calorH} />}
        {alvo && camada === 'mudanca' && <LegendaMudanca diffs={diffs} anterior={diaAnterior} />}

        <div className="flex items-center gap-2 rounded-card bg-surface p-2 pr-4 ring-1 ring-line">
          <button type="button" aria-label={tocando ? 'Pausar' : 'Reproduzir evolução'} disabled={dias.length < 2} onClick={() => { if (!tocando && ehUltima) setDiaSel(0); setTocando((v) => !v) }} className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-soft text-brand transition active:scale-95 disabled:opacity-40"><Icon name={tocando ? 'pausar' : 'tocar'} size={20} /></button>
          <div className="min-w-0 flex-1">
            <label htmlFor="visita" className="flex items-baseline justify-between gap-2 text-apoio"><span className="font-semibold">Visita de {dia ? dataBr(dia) : '—'}{ehUltima ? ' · mais recente' : ''}</span><span className="text-text-2">{i + 1} de {dias.length}</span></label>
            <input id="visita" type="range" min={0} max={Math.max(0, dias.length - 1)} step={1} value={i} disabled={dias.length < 2} onChange={(e) => { setTocando(false); setDiaSel(Number(e.target.value)) }} className="h-6 w-full accent-[var(--brand)]" aria-valuetext={dia ? `Visita de ${dataBr(dia)}` : ''} />
          </div>
        </div>
        {dias.length < 2 && <p className="px-1 text-apoio text-text-2">Com mais de uma visita, você acompanha a evolução do talhão ao longo do tempo.</p>}

        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 px-1 text-[0.8125rem] text-text-2" aria-label="Legenda do mapa">
          {LEGENDA.map((e) => <li key={e} className="flex items-center gap-1.5"><span className="size-3 rounded-full ring-1 ring-black/10" style={{ background: COR_ESTADO[e].fundo }} />{ROTULO_ESTADO[e]}</li>)}
          <li className="flex items-center gap-1.5"><Icon name="camera" size={13} />Tem foto</li>
        </ul>
      </div>

      <div className="min-w-0 space-y-4">
        <Card className="space-y-3">
          <h2 className="text-corpo">Leitura do mapa</h2>
          {leitura.emAtencao.length === 0 ? (
            <p>Nenhum ponto em atenção{nomeAlvo ? ` para ${nomeAlvo}` : ''} nesta visita.</p>
          ) : (
            <p>
              <b>{leitura.emAtencao.length} de {resumo?.coletados ?? 0} pontos</b> em atenção{nomeAlvo ? <> para <b>{nomeAlvo}</b></> : ''}
              {leitura.setor && (leitura.setor === 'centro' ? ', no centro do talhão' : <>, concentrados no <b>{leitura.setor}</b></>)}
              {' '}(ponto{leitura.emAtencao.length > 1 ? 's' : ''} {lista(leitura.emAtencao.map((p) => p.order))}).
              {leitura.acima > 0 && <> {leitura.acima} acima do nível de ação.</>}
            </p>
          )}
          {leitura.antes !== null && dias[i - 1] && (
            <p className="flex items-center gap-1.5 text-apoio text-text-2"><Icon name={leitura.emAtencao.length > leitura.antes ? 'cima' : leitura.emAtencao.length < leitura.antes ? 'baixo' : 'faixas'} size={15} />Na visita de {dataBr(dias[i - 1]!)} eram {leitura.antes} {leitura.antes === 1 ? 'ponto' : 'pontos'}.</p>
          )}
          {resumo && (
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="rounded-xl bg-surface-2 p-2.5"><p className="text-secao font-bold tabular-nums">{resumo.pctComOcorrencia}%</p><p className="text-rotulo text-text-2">com ocorrência</p></div>
              <div className="rounded-xl bg-surface-2 p-2.5"><p className="text-secao font-bold tabular-nums">{resumo.coletados}/{resumo.total}</p><p className="text-rotulo text-text-2">coletados</p></div>
              <div className="rounded-xl bg-surface-2 p-2.5"><p className="text-secao font-bold tabular-nums">{comFoto.size}</p><p className="text-rotulo text-text-2">com foto</p></div>
            </div>
          )}
          {alvo && amostras.length > 0 && <p className="text-rotulo text-text-2">O calor é uma estimativa entre os pontos coletados (interpolação), não uma medição em cada metro.{limite !== undefined && <> Nível de ação: {limite} {UNIDADE_ALVO[alvo]}.</>} Quem decide aplicar algum produto é o agrônomo.</p>}
        </Card>

        {alvo && dia && calorH && amostras.length > 0 && <PainelAnalise plano={plano} regs={regs} dia={dia} dias={dias} alvo={alvo} niveis={niveis} limite={limite ?? null} calor={calorH} />}
        {dia && <PainelQualidade plano={plano} regs={regs} dia={dia} />}

        {alvo && serie.length > 0 && (
          <Card className="space-y-2">
            <h2 className="text-corpo">Evolução · {ALVOS[alvo].nome}</h2>
            <SerieTemporal serie={serie} {...(limite !== undefined ? { limite } : {})} unidade={UNIDADE_ALVO[alvo]} />
          </Card>
        )}

        <Card className="space-y-3">
          <div className="flex items-center justify-between"><h2 className="text-corpo">Fotos do talhão</h2><span className="text-apoio text-text-2">{fotosTalhao.length}</span></div>
          {fotosTalhao.length === 0 ? <p className="text-apoio text-text-2">As fotos que você tirar na coleta aparecem aqui e também em cada ponto do mapa.</p> : (
            <ul className="grid grid-cols-4 gap-2">
              {fotosTalhao.slice(0, 8).map((f) => (
                <li key={f.id} className="relative">
                  <button type="button" onClick={() => abrirPonto(f.pontoId, { tipo: 'foto', id: f.id })} aria-label={`Foto do ponto ${f.ordem}`} className="block aspect-square w-full overflow-hidden rounded-xl ring-1 ring-line transition active:scale-95"><Foto id={f.id} className="size-full" /></button>
                  <span aria-hidden className="absolute bottom-1 left-1 rounded-full bg-black/65 px-1.5 text-[0.6875rem] font-bold text-white">{f.ordem}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <ExportarTalhao talhao={talhao} plano={plano} />

      <Folha aberta={!!ponto} onFechar={fecharPonto} titulo={vista.tipo === 'achado' ? `Foto no ponto ${ponto?.order ?? ''}` : vista.tipo === 'ficha' ? `Ficha do ponto ${ponto?.order ?? ''}` : `Ponto ${ponto?.order ?? ''}`}>
        {ponto && vista.tipo === 'achado' && (
          <div className="space-y-4">
            <button type="button" onClick={() => setVista({ tipo: 'detalhe' })} className="inline-flex min-h-10 items-center gap-1 font-semibold text-brand"><Icon name="voltar" size={18} />Voltar ao ponto</button>
            <FormPendencia talhao={talhao} pontoId={ponto.id} ordem={ponto.order} onSalvo={() => setVista({ tipo: 'detalhe' })} />
          </div>
        )}
        {ponto && vista.tipo === 'ficha' && (
          <div className="space-y-4">
            <button type="button" onClick={() => setVista({ tipo: 'detalhe' })} className="inline-flex min-h-10 items-center gap-1 font-semibold text-brand"><Icon name="voltar" size={18} />Voltar ao ponto</button>
            <FichaPonto talhao={talhao} pontoId={ponto.id} ordem={ponto.order} />
          </div>
        )}
        {ponto && vista.tipo === 'foto' && (
          <div className="space-y-3">
            <button type="button" onClick={() => setVista({ tipo: 'detalhe' })} className="inline-flex min-h-10 items-center gap-1 font-semibold text-brand"><Icon name="voltar" size={18} />Voltar ao ponto</button>
            <Foto id={vista.id} className="aspect-[4/3] w-full rounded-2xl" />
          </div>
        )}
        {ponto && vista.tipo === 'detalhe' && (
          <div className="space-y-4" aria-live="polite">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tom={TOM_ESTADO[estados.get(ponto.id) ?? 'a_coletar']}>{ROTULO_ESTADO[estados.get(ponto.id) ?? 'a_coletar']}</Badge>
              <span className="text-apoio text-text-2">{regsPonto[0]?.posicaoSimulada ? 'Posição simulada (demonstração)' : regsPonto.length ? 'Posição por GPS' : ''}</span>
            </div>
            {pendPonto.map((p) => (
              <div key={p.id} className="rounded-xl bg-surface-2 p-3">
                <p className="font-semibold">{p.resolvida ? `Diagnóstico: ${rotuloDiagnostico(p.resolvida)}` : 'Aguardando diagnóstico'}</p>
                {p.nota && <p className="text-apoio text-text-2">{p.nota}</p>}
              </div>
            ))}
            {regsPonto.length === 0 && pendPonto.length === 0 && <p className="text-text-2">Sem registros neste ponto{nomeAlvo ? ` para ${nomeAlvo}` : ''} até esta visita.</p>}
            {regsPonto.length > 0 && (
              <ul className="divide-y divide-line">
                {regsPonto.slice().reverse().map((r) => {
                  const a = avaliarRegistro(r)
                  return (
                    <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div><p className="font-semibold">{ALVOS[r.alvo].nome}</p><p className="text-apoio text-text-2">{dataHoraBr(r.criadoEm)} · {r.zero ? 'nenhuma ocorrência' : r.presente !== undefined ? `presente · ${r.severidadePct ?? 0}%` : `${r.quantidade} por metro`}</p></div>
                      <Badge tom={TOM[a.nivel] ?? 'neutral'}>{a.titulo}</Badge>
                    </li>
                  )
                })}
              </ul>
            )}
            <div>
              <p className="mb-2 text-apoio font-semibold">Fotos {fotosPonto.length > 0 && <span className="font-normal text-text-2">({fotosPonto.length})</span>}</p>
              {fotosPonto.length === 0 ? <p className="text-apoio text-text-2">Nenhuma foto neste ponto ainda.</p> : (
                <ul className="grid grid-cols-3 gap-2">
                  {fotosPonto.map((f) => <li key={f}><button type="button" aria-label="Ampliar foto" onClick={() => setVista({ tipo: 'foto', id: f })} className="block aspect-square w-full overflow-hidden rounded-xl ring-1 ring-line"><Foto id={f} className="size-full" /></button></li>)}
                </ul>
              )}
            </div>
            <Button block variant="secondary" icon="lupa" onClick={() => setVista({ tipo: 'ficha' })}>Ficha completa do ponto</Button>
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <Button variant="secondary" icon="camera" onClick={() => setVista({ tipo: 'achado' })}>Adicionar foto</Button>
              <Link to="/coleta" onClick={() => { setTalhao(talhao.id); setPontoFoco(ponto.id) }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 font-semibold text-on-brand transition active:scale-[0.97]"><Icon name="campo" size={20} />Coletar aqui</Link>
            </div>
          </div>
        )}
      </Folha>
    </div>
  )
}
