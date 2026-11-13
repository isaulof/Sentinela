import { Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { registrarSemOcorrencia } from '@/data/coleta'
import { ehFaltaDeEspaco, mensagemDeGravacao } from '@/data/erros'
import { useFazenda, usePendencias, usePlano, useRegistros, useTalhoes } from '@/data/hooks'
import { carregarDemonstracao } from '@/data/seed'
import { avaliarRegistro, daRodada, nivelPorPonto } from '@/domain/analise'
import { resumoDoRegistro } from '@/domain/ficha'
import { rotuloDiagnostico } from '@/domain/funil'
import { haversineM } from '@/domain/geo'
import { estadosDosPontos, ROTULO_ESTADO, type EstadoPonto } from '@/domain/ponto'
import { dataHoraBr } from '@/domain/tempo'
import { ALVOS } from '@/knowledge/alvos'
import { ConfirmacaoRegistro, type DadosConfirmacao } from '../components/ConfirmacaoRegistro'
import { FichaPonto } from '../components/FichaPonto'
import { FormPendencia } from '../components/FormPendencia'
import { ModoNavegacao } from '../components/ModoNavegacao'
import { FormRegistro } from '../components/FormRegistro'
import { Icon } from '../components/Icon'
import { Badge, Button, Campo as CampoForm, Card, Folha, Input, Select, Titulo, Vazio, type Tom } from '../components/kit'
import { Mapa } from '../components/Mapa'
import { COR_ESTADO, type MarcadorPonto } from '../components/estadoPonto'
import { useGps, useTelaAcesa } from '../hooks/useGps'
import { useSessao } from '../state/store'
import { useToast } from '../state/toast'

const TOM: Record<string, Tom> = { ausente: 'ok', abaixo: 'ok', proximo: 'warn', atingido: 'danger', deteccao: 'info', nao_aplicavel: 'neutral' }
const TOM_ESTADO: Record<EstadoPonto, Tom> = { a_coletar: 'neutral', sem_ocorrencia: 'ok', leve: 'warn', acao: 'danger', doenca: 'info', diagnostico: 'info', diagnosticado: 'ok' }
const LEGENDA: EstadoPonto[] = ['a_coletar', 'sem_ocorrencia', 'leve', 'acao', 'doenca', 'diagnostico', 'diagnosticado']

type Painel = null | 'acoes' | 'achado' | 'pendencia' | 'nome' | 'ficha'

export function Campo() {
  const talhoes = useTalhoes()
  const { talhaoId, setTalhao, pontoFoco, setPontoFoco, amostrador, setAmostrador, setDiagnosticoPara, setTalhaoAba } = useSessao()
  const mostrar = useToast((s) => s.mostrar)
  const talhao = talhoes?.find((t) => t.id === talhaoId) ?? talhoes?.[0]
  const plano = usePlano(talhao?.id)
  const fazenda = useFazenda()
  const registros = useRegistros(talhao?.id)
  const pendencias = usePendencias(talhao?.id)
  const [navegando, setNavegando] = useState(false)
  const gps = useGps(true)
  useTelaAcesa(navegando)
  const [ponto, setPonto] = useState<string | null>(pontoFoco)
  useEffect(() => { if (pontoFoco) setPontoFoco(null) }, [pontoFoco, setPontoFoco])
  const [painel, setPainel] = useState<Painel>(null)
  const [nomeDigitado, setNomeDigitado] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [confirmacao, setConfirmacao] = useState<DadosConfirmacao | null>(null)
  const [fichaDe, setFichaDe] = useState<string | null>(null)
  const [agora] = useState(() => new Date())

  const rodada = useMemo(() => daRodada(registros ?? [], agora), [registros, agora])
  const niveis = useMemo(() => nivelPorPonto(rodada), [rodada])
  const estados = useMemo(() => (plano ? estadosDosPontos(plano.pontos.map((p) => p.id), niveis, pendencias ?? []) : new Map<string, EstadoPonto>()), [plano, niveis, pendencias])
  const marcadores = useMemo<MarcadorPonto[]>(
    () => (plano ? plano.pontos.map((p) => ({ id: p.id, ordem: p.order, posicao: p.position, estado: estados.get(p.id) ?? 'a_coletar', rotuloEstado: ROTULO_ESTADO[estados.get(p.id) ?? 'a_coletar'] })) : []),
    [plano, estados],
  )
  const enquadrar = useMemo(() => talhao?.anel ?? null, [talhao])

  if (talhoes === undefined) return null
  if (talhoes.length === 0) {
    return (
      <>
        <Titulo>Coleta</Titulo>
        <Vazio icone="campo" titulo="Nenhum talhão para monitorar" texto="Desenhe um talhão em Talhões ou carregue a demonstração para apresentar o app." acao={<div className="flex flex-wrap justify-center gap-3"><Link to="/talhoes/novo" className="inline-flex min-h-12 items-center rounded-xl bg-brand px-5 font-semibold text-on-brand">Desenhar talhão</Link><Button variant="secondary" onClick={() => void carregarDemonstracao()}>Carregar demonstração</Button></div>} />
      </>
    )
  }
  if (!talhao || !plano) return <Vazio icone="mapa" titulo="Este talhão ainda não tem plano" texto="Gere o plano de pontos em Talhões para começar a coletar." acao={<Link to="/talhoes" className="font-semibold text-brand">Ir para Talhões</Link>} />

  const pontos = plano.pontos
  const feitos = pontos.filter((p) => estados.get(p.id) !== 'a_coletar').length
  const proximo = pontos.find((p) => estados.get(p.id) === 'a_coletar')?.id ?? null
  const alvoPonto = ponto ?? proximo ?? pontos[0]?.id ?? null
  const idx = pontos.findIndex((p) => p.id === alvoPonto)
  const pt = idx >= 0 ? pontos[idx] : undefined
  const estadoPt = alvoPonto ? estados.get(alvoPonto) ?? 'a_coletar' : 'a_coletar'
  const dist = gps.estado === 'ok' && pt ? Math.round(haversineM(gps.fix.posicao, pt.position)) : null
  const linhaGuia = navegando && gps.estado === 'ok' && pt ? { de: gps.fix.posicao, ate: pt.position } : null
  const regsPonto = rodada.filter((r) => r.pontoId === alvoPonto)
  const pendPonto = (pendencias ?? []).filter((p) => p.pontoId === alvoPonto)
  const concluida = feitos === pontos.length
  const irPara = (i: number) => { const p = pontos[(i + pontos.length) % pontos.length]; if (p) setPonto(p.id) }

  async function semOcorrencia(nome: string) {
    if (!alvoPonto || !pt || !plano || !talhao) return
    setSalvando(true)
    try {
      const gravados = await registrarSemOcorrencia({ talhao, plano, pontoId: alvoPonto, amostrador: nome, gps: gps.estado === 'ok' ? gps.fix : null, ...(fazenda?.responsavelTecnico ? { responsavel: fazenda.responsavelTecnico } : {}), ...(fazenda?.fuso ? { fuso: fazenda.fuso } : {}) })
      if (gravados.length === 0) { mostrar('Não foi possível registrar. Tente de novo.', 'erro'); return }
      mostrar(`Ponto ${pt.order}: sem ocorrência`)
      setConfirmacao({ ids: gravados.map((g) => g.id), pontoId: alvoPonto, ordem: pt.order, titulo: `Ponto ${pt.order}: sem ocorrência`, linhas: [`${gravados.length} alvos com zero: ${gravados.map((g) => ALVOS[g.alvo].nome).join(', ')}`, dataHoraBr(gravados[0]!.criadoEm, gravados[0]!.fusoHorario)] })
      setPonto(navegando ? null : alvoPonto)
    } catch (e) {
      // Erros nossos (ex.: ponto fora do plano) têm texto claro; falta de espaço ganha a mensagem própria.
      mostrar(ehFaltaDeEspaco(e) ? mensagemDeGravacao(e) : e instanceof Error ? e.message : 'Não foi possível registrar.', 'erro')
    } finally {
      setSalvando(false)
    }
  }
  function pedirSemOcorrencia() {
    if (amostrador.trim().length < 2) { setPainel('nome'); return }
    setPainel(null)
    void semOcorrencia(amostrador.trim())
  }

  const abrirFicha = (id: string) => { setFichaDe(id); setPainel('ficha') }
  const fichaPt = pontos.find((p) => p.id === fichaDe)
  const noMesmoPonto = !navegando && !!confirmacao && alvoPonto === confirmacao.pontoId
  const confirmacaoEl = confirmacao && (
    <ConfirmacaoRegistro
      key={confirmacao.ids.join('+')} dados={confirmacao} autor={amostrador}
      onFicha={() => abrirFicha(confirmacao.pontoId)}
      {...(noMesmoPonto ? { onOutro: () => setPainel('achado'), onSeguir: () => { setConfirmacao(null); setPonto(null) } } : {})}
      onFechar={() => setConfirmacao(null)}
      className={navegando ? '' : 'fixed inset-x-3 top-3 z-30 mx-auto max-w-xl lg:static lg:mx-0 lg:max-w-none'}
    />
  )

  const folhas = (
    <>
      <Folha aberta={painel === 'ficha'} onFechar={() => setPainel(null)} titulo={`Ficha do ponto ${fichaPt?.order ?? ''}`}>
        {painel === 'ficha' && fichaPt && <FichaPonto talhao={talhao} pontoId={fichaPt.id} ordem={fichaPt.order} />}
      </Folha>
      <Folha aberta={painel === 'acoes'} onFechar={() => setPainel(null)} titulo={`Ponto ${pt?.order ?? ''}: o que você encontrou?`}>
        <div className="grid gap-2.5">
          <Button block icon="check" disabled={!alvoPonto || salvando} onClick={pedirSemOcorrencia}>{salvando ? 'Registrando…' : 'Sem ocorrência'}</Button>
          <Button block variant="secondary" icon="lupa" disabled={!alvoPonto} onClick={() => setPainel('achado')}>Registrar achado</Button>
          <Button block variant="secondary" icon="duvida" disabled={!alvoPonto} onClick={() => setPainel('pendencia')}>Não sei o que é</Button>
        </div>
      </Folha>
      <Folha aberta={painel === 'achado'} onFechar={() => setPainel(null)} titulo="Registrar achado">
        {alvoPonto && <FormRegistro talhao={talhao} plano={plano} pontoId={alvoPonto} registrosTalhao={registros ?? []} gps={gps.estado === 'ok' ? gps.fix : null} onSalvo={(r) => { setPainel(null); setConfirmacao({ ids: [r.id], pontoId: r.pontoId, ordem: pt?.order ?? 0, titulo: `Ponto ${pt?.order ?? ''}: registro salvo`, linhas: [resumoDoRegistro(r)] }); setPonto(navegando ? null : r.pontoId) }} />}
      </Folha>
      <Folha aberta={painel === 'pendencia'} onFechar={() => setPainel(null)} titulo="Guardar para diagnóstico">
        {alvoPonto && pt && <FormPendencia talhao={talhao} pontoId={alvoPonto} ordem={pt.order} onSalvo={() => { setPainel(null); setPonto(null) }} />}
      </Folha>
      <Folha aberta={painel === 'nome'} onFechar={() => setPainel(null)} titulo="Quem está coletando?">
        <div className="space-y-4">
          <CampoForm rotulo="Seu nome" ajuda="Assina os registros que você faz."><Input value={nomeDigitado} onChange={(e) => setNomeDigitado(e.target.value)} placeholder="Nome e sobrenome" autoFocus /></CampoForm>
          <Button block icon="check" disabled={nomeDigitado.trim().length < 2} onClick={() => { const n = nomeDigitado.trim(); setAmostrador(n); setPainel(null); void semOcorrencia(n) }}>Continuar</Button>
        </div>
      </Folha>
    </>
  )

  // Guia ligado: tela cheia, só o mapa, a faixa e uma ação. O resto da Coleta volta ao parar o guia.
  if (navegando && pt) {
    return (
      <>
        <ModoNavegacao
          talhao={talhao} plano={plano} marcadores={marcadores} ponto={pt} proximo={proximo} gps={gps}
          onPonto={setPonto} onAnterior={() => irPara(idx - 1)} onProximo={() => irPara(idx + 1)} onParar={() => setNavegando(false)} onRegistrar={() => setPainel('acoes')} rodape={confirmacaoEl}
        />
        {folhas}
      </>
    )
  }

  return (
    <>
      <Titulo sub={concluida ? 'Todos os pontos foram coletados.' : `${feitos} de ${pontos.length} pontos coletados`}>Coleta</Titulo>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="space-y-3">
          <Select aria-label="Talhão" value={talhao.id} onChange={(e) => { setTalhao(e.target.value); setPonto(null); setConfirmacao(null) }}>{talhoes.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}</Select>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={Math.round((feitos / pontos.length) * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso da coleta">
            <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(feitos / pontos.length) * 100}%` }} />
          </div>
          <div className="relative">
            <Mapa
              className="h-[calc(100dvh-31rem)] min-h-72 w-full overflow-hidden rounded-card ring-1 ring-line lg:h-[66dvh]"
              talhoes={[talhao]} selecionadoId={talhao.id} onSelecionar={() => {}}
              marcadores={marcadores} pontoSelecionado={alvoPonto} pontoProximo={proximo} onPonto={setPonto}
              caminho={plano.caminho} enquadrar={enquadrar}
              eu={gps.estado === 'ok' ? { posicao: gps.fix.posicao, precisaoM: gps.fix.precisaoM, rumo: gps.fix.rumo } : null}
              guia={linhaGuia} seguir={navegando}
            />
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-apoio text-text-2" aria-label="Legenda do mapa">
            {LEGENDA.map((e) => (
              <li key={e} className="flex items-center gap-1.5"><span className="size-3.5 rounded-full border border-white/70" style={{ background: COR_ESTADO[e].fundo }} />{ROTULO_ESTADO[e]}</li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          {confirmacaoEl}
          <Card className="fixed inset-x-3 bottom-[5.6rem] z-10 mx-auto max-w-xl space-y-3 shadow-lift lg:static lg:inset-auto lg:mx-0 lg:max-w-none lg:space-y-4">
            <div className="flex items-center justify-between gap-2">
              <button type="button" aria-label="Ponto anterior" onClick={() => irPara(idx - 1)} className="grid size-11 place-items-center rounded-xl border border-line hover:bg-surface-2"><Icon name="seta" className="rotate-180" /></button>
              <div className="text-center">
                <p className="hidden text-apoio font-medium text-text-2 lg:block">{ponto ? 'Ponto selecionado' : concluida ? 'Coleta concluída' : 'Próximo ponto'}</p>
                <p className="text-titulo font-extrabold tracking-tight lg:text-titulo">Ponto {pt?.order ?? '—'} <span className="text-corpo font-semibold text-text-2">de {pontos.length}</span></p>
              </div>
              <button type="button" aria-label="Próximo ponto" onClick={() => irPara(idx + 1)} className="grid size-11 place-items-center rounded-xl border border-line hover:bg-surface-2"><Icon name="seta" /></button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 lg:gap-2">
              <Badge tom={TOM_ESTADO[estadoPt]}>{ROTULO_ESTADO[estadoPt]}</Badge>
              {!navegando && <button type="button" disabled={!alvoPonto} onClick={() => setNavegando(true)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-brand-soft px-3.5 text-apoio font-semibold text-brand transition active:scale-95 disabled:opacity-40"><Icon name="local" size={16} />Ir até o ponto</button>}
              <span className="hidden text-apoio text-text-2 lg:inline">{gps.estado === 'ok' ? `${dist} m de você (GPS ±${Math.round(gps.fix.precisaoM)} m)` : gps.estado === 'erro' ? gps.motivo : 'Procurando GPS…'}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 lg:grid-cols-1 lg:gap-2.5">
              <Button block icon="check" className="min-h-[4.25rem] flex-col gap-1 px-1.5 text-[0.8125rem] leading-tight !whitespace-normal text-center lg:min-h-12 lg:flex-row lg:gap-2 lg:px-5 lg:text-corpo" disabled={!alvoPonto || salvando} onClick={pedirSemOcorrencia}>{salvando ? 'Registrando…' : 'Sem ocorrência'}</Button>
              <Button block variant="secondary" icon="lupa" className="min-h-[4.25rem] flex-col gap-1 px-1.5 text-[0.8125rem] leading-tight !whitespace-normal text-center lg:min-h-12 lg:flex-row lg:gap-2 lg:px-5 lg:text-corpo" disabled={!alvoPonto} onClick={() => setPainel('achado')}>Registrar achado</Button>
              <Button block variant="secondary" icon="duvida" className="min-h-[4.25rem] flex-col gap-1 px-1.5 text-[0.8125rem] leading-tight !whitespace-normal text-center lg:min-h-12 lg:flex-row lg:gap-2 lg:px-5 lg:text-corpo" disabled={!alvoPonto} onClick={() => setPainel('pendencia')}>Não sei o que é</Button>
            </div>
          </Card>

          {pendPonto.length > 0 && (
            <Card className="space-y-2">
              <h2 className="text-subtitulo">Achados deste ponto</h2>
              <ul className="divide-y divide-line">
                {pendPonto.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{p.nota || 'Achado sem descrição'}</p>
                      <p className="text-apoio text-text-2">{p.fotoIds.length} foto(s) · {p.amostrador}</p>
                    </div>
                    <Badge tom={p.resolvida ? 'ok' : 'info'}>{p.resolvida ? rotuloDiagnostico(p.resolvida) : 'Pendente'}</Badge>
                  </li>
                ))}
              </ul>
              {pendPonto.some((p) => !p.resolvida) && (
                <Link to="/diagnostico" onClick={() => { const a = pendPonto.find((p) => !p.resolvida)!; setDiagnosticoPara({ talhaoId: talhao.id, pontoId: a.pontoId, pendenciaId: a.id }) }} className="inline-flex min-h-11 items-center gap-1 font-semibold text-brand">Diagnosticar agora<Icon name="seta" size={18} /></Link>
              )}
            </Card>
          )}

          {regsPonto.length > 0 && (
            <Card className="space-y-2">
              <div className="flex items-center justify-between gap-2"><h2 className="text-subtitulo">Registros neste ponto</h2><button type="button" onClick={() => alvoPonto && abrirFicha(alvoPonto)} className="inline-flex min-h-11 items-center font-semibold text-brand underline">Ver ficha completa</button></div>
              <ul className="divide-y divide-line">
                {regsPonto.slice().reverse().map((r) => {
                  const a = avaliarRegistro(r)
                  return (
                    <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div>
                        <p className="font-semibold">{ALVOS[r.alvo].nome}</p>
                        <p className="text-apoio text-text-2">{r.zero ? 'Nenhuma ocorrência' : r.presente !== undefined ? `Presente · ${r.severidadePct ?? 0}%` : `${r.quantidade} ${ALVOS[r.alvo].por ?? 'por metro'}`}{r.fotoIds.length ? ` · ${r.fotoIds.length} foto(s)` : ''}</p>
                      </div>
                      <Badge tom={TOM[a.nivel] ?? 'neutral'}>{a.titulo}</Badge>
                    </li>
                  )
                })}
              </ul>
            </Card>
          )}

          {concluida && (
            <Card className="space-y-2">
              <h2 className="text-subtitulo">Coleta concluída</h2>
              <p className="text-text-2">Veja onde estão os problemas no mapa do talhão.</p>
              <Link to="/talhoes/$id" params={{ id: talhao.id }} onClick={() => { setTalhao(talhao.id); setTalhaoAba('resultados') }} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 font-semibold text-on-brand">Ver resultados no mapa</Link>
            </Card>
          )}
          <div aria-hidden className="h-40 lg:hidden" />
        </div>
      </div>

      {folhas}
    </>
  )
}
