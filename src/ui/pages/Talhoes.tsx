import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { repo, novoId } from '@/data/repo'
import { usePlano, usePlanos, useTalhoes } from '@/data/hooks'
import type { Talhao } from '@/domain/entidades'
import { polygonAreaHa, type LngLat } from '@/domain/geo'
import { ESTADIOS } from '@/domain/phenology'
import { DEFAULT_BUFFER_M, generatePlan, MIN_POINTS, recommendedPointCount, type SamplingMethod, type SamplingParams } from '@/domain/sampling'
import { Badge, Button, Campo, Card, Folha, Input, Segmentado, Select, Titulo, Vazio } from '../components/kit'
import { Croqui } from '../components/Croqui'
import { Icon } from '../components/Icon'
import { Mapa } from '../components/Mapa'
import { MiniTalhao } from '../components/MiniTalhao'
import { Resultados } from '../components/Resultados'
import { useSessao } from '../state/store'
import { useToast } from '../state/toast'

const METODOS: { id: SamplingMethod; nome: string; quando: string }[] = [
  { id: 'zigzag', nome: 'Zigue-zague', quando: 'Talhões regulares ou grandes, com boa cobertura da área; é o padrão para praga distribuída de forma uniforme.' },
  { id: 'diagonais', nome: 'Diagonais', quando: 'Talhões mais quadrados e de relevo uniforme; cruza o talhão nas duas diagonais e é mais rápido de caminhar.' },
]
const NOME_METODO: Record<SamplingMethod, string> = { zigzag: 'zigue-zague', diagonais: 'diagonais' }

/* ─────────────── Lista de talhões ─────────────── */

export function Talhoes() {
  const talhoes = useTalhoes()
  const planos = usePlanos()
  const navegar = useNavigate()
  const { setTalhao, setTalhaoAba } = useSessao()
  const todos = useMemo(() => (talhoes ?? []).flatMap((t) => t.anel), [talhoes])
  if (talhoes === undefined) return null

  const novo = () => void navegar({ to: '/talhoes/novo' })
  const abrir = (id: string) => { setTalhao(id); setTalhaoAba('resultados'); void navegar({ to: '/talhoes/$id', params: { id } }) }

  return (
    <>
      <Titulo sub={talhoes.length ? `${talhoes.length} ${talhoes.length === 1 ? 'talhão' : 'talhões'} na fazenda` : undefined} acao={talhoes.length > 0 && <Button icon="mais1" onClick={novo}>Novo</Button>}>Talhões</Titulo>
      {talhoes.length === 0 ? (
        <Vazio icone="mapa" titulo="Nenhum talhão ainda" texto="Desenhe o contorno do primeiro talhão no mapa para gerar o plano de amostragem." acao={<Button icon="lapis" onClick={novo}>Desenhar talhão</Button>} />
      ) : (
        <div className="space-y-4">
          <Mapa className="h-[34dvh] w-full overflow-hidden rounded-card ring-1 ring-line lg:h-[44dvh]" talhoes={talhoes} selecionadoId={null} onSelecionar={abrir} enquadrar={todos} />
          <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface ring-1 ring-line">
            {talhoes.map((t) => {
              const plano = planos?.find((p) => p.talhaoId === t.id)
              return (
                <li key={t.id}>
                  <Link to="/talhoes/$id" params={{ id: t.id }} onClick={() => { setTalhao(t.id); setTalhaoAba('resultados') }} className="flex items-center gap-3.5 p-3.5 transition active:bg-surface-2">
                    <MiniTalhao anel={t.anel} pontos={plano?.pontos ?? []} className="size-14 shrink-0 rounded-xl bg-surface-2" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{t.nome}</p>
                      <p className="truncate text-sm text-text-2">{(plano?.areaHa ?? polygonAreaHa(t.anel)).toFixed(0)} ha · {t.cultivar} · {t.estadio}</p>
                      <p className="truncate text-sm text-text-2">{plano ? `${plano.pontos.length} pontos · ${NOME_METODO[plano.params.method]}` : 'Sem plano de pontos'}</p>
                    </div>
                    <Icon name="seta" size={18} className="shrink-0 text-text-2" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </>
  )
}

/* ─────────────── Desenhar um talhão ─────────────── */

export function NovoTalhao() {
  const talhoes = useTalhoes()
  const navegar = useNavigate()
  const { setTalhao, setTalhaoAba } = useSessao()
  const mostrar = useToast((s) => s.mostrar)
  const [vertices, setVertices] = useState<LngLat[]>([])
  const [contorno, setContorno] = useState<LngLat[] | null>(null) // concluído, aguardando os dados
  const [ir, setIr] = useState<{ ponto: LngLat; n: number } | null>(null)
  const existentes = useMemo(() => (talhoes ?? []).flatMap((t) => t.anel), [talhoes])
  if (talhoes === undefined) return null

  const sair = () => void navegar({ to: talhoes.length ? '/talhoes' : '/' })

  function minhaPosicao() {
    if (!('geolocation' in navigator)) { mostrar('Este aparelho não informa a localização.', 'erro'); return }
    navigator.geolocation.getCurrentPosition(
      (p) => setIr((x) => ({ ponto: [p.coords.longitude, p.coords.latitude], n: (x?.n ?? 0) + 1 })),
      () => mostrar('Não consegui sua localização. Verifique a permissão do navegador.', 'erro'),
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  return (
    <>
      <header className="mb-3 flex items-center gap-1">
        <button type="button" onClick={sair} aria-label="Cancelar e voltar" className="-ml-2 grid size-11 place-items-center rounded-full text-text-2 transition active:bg-surface-2"><Icon name="voltar" size={24} /></button>
        <div className="min-w-0">
          <h1 className="text-xl">Desenhar talhão</h1>
          <p className="text-sm text-text-2">{vertices.length < 3 ? 'Toque no mapa para marcar os cantos do talhão.' : 'Ajuste os cantos se precisar e conclua o contorno.'}</p>
        </div>
      </header>

      <div className="relative">
        <Mapa
          className="h-[calc(100dvh-11rem)] min-h-80 w-full overflow-hidden rounded-card ring-1 ring-line lg:h-[calc(100dvh-10rem)]"
          talhoes={talhoes} selecionadoId={null} onSelecionar={() => {}}
          desenho={vertices} onVertice={(p) => setVertices((d) => [...d, p])} enquadrar={existentes.length ? existentes : null} irPara={ir}
        />
        <button type="button" onClick={minhaPosicao} className="absolute left-2.5 top-2.5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-surface/95 px-3 text-sm font-semibold shadow-card ring-1 ring-line active:bg-surface-2"><Icon name="local" size={18} />Minha posição</button>
        <div className="absolute inset-x-2.5 bottom-9 flex items-center gap-2 rounded-2xl bg-surface/95 p-2 shadow-lift ring-1 ring-line backdrop-blur">
          <button type="button" aria-label="Desfazer último canto" onClick={() => setVertices((d) => d.slice(0, -1))} disabled={vertices.length === 0} className="grid size-11 shrink-0 place-items-center rounded-xl text-text-2 transition active:bg-surface-2 disabled:opacity-35"><Icon name="desfazer" size={20} /></button>
          <button type="button" aria-label="Limpar contorno" onClick={() => setVertices([])} disabled={vertices.length === 0} className="grid size-11 shrink-0 place-items-center rounded-xl text-text-2 transition active:bg-surface-2 disabled:opacity-35"><Icon name="lixo" size={20} /></button>
          <p className="min-w-0 flex-1 truncate text-center text-sm font-medium text-text-2">{vertices.length === 0 ? 'Nenhum canto' : `${vertices.length} ${vertices.length === 1 ? 'canto' : 'cantos'}${vertices.length >= 3 ? ` · ${polygonAreaHa(vertices).toFixed(1)} ha` : ''}`}</p>
          <Button icon="check" disabled={vertices.length < 3} onClick={() => setContorno(vertices)}>Concluir</Button>
        </div>
      </div>

      <FormTalhao anel={contorno} sugestao={`Talhão ${talhoes.length + 1}`} onFechar={() => setContorno(null)} onSalvo={(t) => { setTalhao(t.id); setTalhaoAba('plano'); void navegar({ to: '/talhoes/$id', params: { id: t.id }, replace: true }) }} />
    </>
  )
}

/* ─────────────── Detalhe do talhão: mapa inteligente e plano ─────────────── */

export function TalhaoDetalhe() {
  const { id } = useParams({ from: '/talhoes/$id' })
  const talhoes = useTalhoes()
  const { talhaoAba, setTalhaoAba, setTalhao } = useSessao()
  const talhao = talhoes?.find((t) => t.id === id)
  const planos = usePlanos()
  if (talhoes === undefined || planos === undefined) return null
  const plano = planos.find((p) => p.talhaoId === id)
  if (!talhao) return <><Titulo>Talhão não encontrado</Titulo><Vazio icone="mapa" titulo="Este talhão não existe mais" texto="Ele pode ter sido apagado deste aparelho." acao={<Link to="/talhoes" className="font-semibold text-brand">Ver talhões</Link>} /></>

  const aba = plano ? talhaoAba : 'plano'
  return (
    <>
      <header className="mb-3 flex items-center gap-1">
        <Link to="/talhoes" aria-label="Voltar para Talhões" className="-ml-2 grid size-11 shrink-0 place-items-center rounded-full text-text-2 transition active:bg-surface-2"><Icon name="voltar" size={24} /></Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl">{talhao.nome}</h1>
          <p className="truncate text-sm text-text-2">{polygonAreaHa(talhao.anel).toFixed(1)} ha · {talhao.cultivar} · {talhao.estadio}</p>
        </div>
        {plano && <Link to="/coleta" onClick={() => setTalhao(talhao.id)} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-brand px-4 text-sm font-semibold text-on-brand transition active:scale-95"><Icon name="campo" size={17} />Coletar</Link>}
      </header>

      <div role="tablist" aria-label="Visão do talhão" className="mb-4 grid grid-cols-2 border-b border-line">
        {([['resultados', 'Mapa inteligente'], ['plano', 'Plano de pontos']] as const).map(([k, nome]) => (
          <button key={k} type="button" role="tab" aria-selected={aba === k} disabled={k === 'resultados' && !plano} onClick={() => setTalhaoAba(k)} className={`-mb-px min-h-11 border-b-2 text-sm font-semibold transition disabled:opacity-40 ${aba === k ? 'border-brand text-brand' : 'border-transparent text-text-2'}`}>{nome}</button>
        ))}
      </div>

      {aba === 'resultados' && plano ? <Resultados talhao={talhao} plano={plano} /> : <PlanoTalhao talhao={talhao} />}
    </>
  )
}

/**
 * Campo numérico que deixa apagar e digitar à vontade: o texto é livre enquanto se edita, o plano só recebe
 * valores dentro do limite, e ao sair do campo o número é ajustado a [min, max].
 */
function InputNumero({ valor, min, max, onValor }: { valor: number; min: number; max: number; onValor: (n: number) => void }) {
  const [texto, setTexto] = useState(String(valor))
  const [anterior, setAnterior] = useState(valor)
  // Se o valor mudar por fora (outro talhão, plano salvo), o texto acompanha.
  if (valor !== anterior) { setAnterior(valor); if (Number(texto) !== valor) setTexto(String(valor)) }
  return (
    <Input
      type="number" inputMode="numeric" min={min} max={max} value={texto}
      onChange={(e) => {
        setTexto(e.target.value)
        const n = Number(e.target.value)
        if (e.target.value.trim() !== '' && Number.isFinite(n) && n >= min && n <= max) { setAnterior(Math.round(n)); onValor(Math.round(n)) }
      }}
      onBlur={() => {
        const n = Number(texto)
        const ok = Math.max(min, Math.min(max, texto.trim() === '' || !Number.isFinite(n) ? valor : Math.round(n)))
        setTexto(String(ok))
        if (ok !== valor) { setAnterior(ok); onValor(ok) }
      }}
    />
  )
}

function PlanoTalhao({ talhao }: { talhao: Talhao }) {
  const planoSalvo = usePlano(talhao.id)
  const [params, setParams] = useState<SamplingParams | null>(null)
  const efetivo = useMemo<SamplingParams>(() => params ?? planoSalvo?.params ?? { method: 'zigzag', bufferM: DEFAULT_BUFFER_M, targetPoints: 10 }, [params, planoSalvo])
  const areaHa = polygonAreaHa(talhao.anel)
  const preview = useMemo(() => generatePlan(talhao.anel, efetivo), [talhao, efetivo])
  const alterado = !!params && JSON.stringify(params) !== JSON.stringify(planoSalvo?.params)

  async function salvarPlano() {
    await repo.salvarPlano({ talhaoId: talhao.id, params: preview.params, pontos: preview.points, caminho: preview.paths, areaHa: preview.areaHa, geradoEm: new Date().toISOString() })
    setParams(null)
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <Mapa
        className="h-[46dvh] w-full overflow-hidden rounded-card ring-1 ring-line lg:h-[68dvh]"
        talhoes={[talhao]} selecionadoId={talhao.id} onSelecionar={() => {}}
        pontos={preview.points} caminho={preview.paths} enquadrar={talhao.anel}
      />
      <div className="space-y-4">
        <Card className="space-y-4">
          <h2 className="text-lg">Plano de amostragem</h2>
          <Campo rotulo="Caminhamento" ajuda={METODOS.find((m) => m.id === efetivo.method)?.quando}>
            <Segmentado rotulo="Caminhamento" valor={efetivo.method} onChange={(method) => setParams({ ...efetivo, method })} opcoes={METODOS.map((m) => ({ id: m.id, nome: m.nome }))} />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Pontos" ajuda={`Sugerido: ${recommendedPointCount(areaHa)} (mín. ${MIN_POINTS})`}>
              <InputNumero min={3} max={40} valor={efetivo.targetPoints} onValor={(targetPoints) => setParams({ ...efetivo, targetPoints })} />
            </Campo>
            <Campo rotulo="Bordadura (m)" ajuda="Descartada nas bordas">
              <InputNumero min={0} max={100} valor={efetivo.bufferM} onValor={(bufferM) => setParams({ ...efetivo, bufferM })} />
            </Campo>
          </div>
          <ul className="space-y-1.5 text-sm">
            <li>{preview.points.length} pontos · caminhada de ~{(preview.walkLengthM / 1000).toFixed(1)} km · espaçamento médio de {preview.meanSpacingM.toFixed(0)} m</li>
            {preview.issues.map((i) => (
              <li key={i.code}><Badge tom={i.severity === 'erro' ? 'danger' : 'warn'} icon="alerta">{i.severity === 'erro' ? 'Erro' : 'Atenção'}</Badge> <span className="text-text-2">{i.message}</span></li>
            ))}
          </ul>
          <Button block icon="check" onClick={() => void salvarPlano()} disabled={(!alterado && !!planoSalvo) || preview.points.length === 0}>
            {planoSalvo ? (alterado ? 'Salvar novo plano' : 'Plano salvo') : 'Salvar plano'}
          </Button>
          {planoSalvo && alterado && <p className="text-sm text-text-2">Salvar o novo plano mantém os registros anteriores, mas os pontos mudam.</p>}
        </Card>

        <Card className="space-y-3">
          <h2 className="text-lg">Croqui</h2>
          <Croqui anel={talhao.anel} pontos={preview.points} caminho={preview.paths} titulo={`Croqui de ${talhao.nome}`} />
          <p className="text-sm text-text-2">Linha tracejada: caminhamento. Círculos: pontos de amostragem.</p>
        </Card>
      </div>
    </div>
  )
}

function FormTalhao({ anel, sugestao, onFechar, onSalvo }: { anel: LngLat[] | null; sugestao: string; onFechar: () => void; onSalvo: (t: Talhao) => void }) {
  const mostrar = useToast((s) => s.mostrar)
  const [nome, setNome] = useState<string | null>(null) // null = ainda não editou: vale a sugestão
  const nomeFinal = nome ?? sugestao
  const [salvando, setSalvando] = useState(false)
  const [cultivar, setCultivar] = useState('')
  const [plantio, setPlantio] = useState('2026-09-20')
  const [estadio, setEstadio] = useState('V4')
  const [finalidade, setFinalidade] = useState<'graos' | 'sementes'>('graos')
  const ok = nomeFinal.trim().length >= 2 && !!anel && !salvando

  async function salvar() {
    if (!anel || !ok) return
    setSalvando(true)
    try {
      const t: Talhao = { id: novoId('T'), nome: nomeFinal.trim(), anel, cultivar: cultivar.trim() || 'Não informada', dataPlantio: plantio, estadio, finalidade, criadoEm: new Date().toISOString() }
      await repo.salvarTalhao(t)
      const plano = generatePlan(anel, { method: 'zigzag', bufferM: DEFAULT_BUFFER_M, targetPoints: recommendedPointCount(polygonAreaHa(anel)) })
      await repo.salvarPlano({ talhaoId: t.id, params: plano.params, pontos: plano.points, caminho: plano.paths, areaHa: plano.areaHa, geradoEm: t.criadoEm })
      setNome(null); setCultivar('')
      mostrar(`${t.nome} salvo com ${plano.points.length} pontos de amostragem`)
      onSalvo(t)
    } catch (e) {
      mostrar(e instanceof Error ? `Não foi possível salvar: ${e.message}` : 'Não foi possível salvar o talhão.', 'erro')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Folha aberta={!!anel} onFechar={onFechar} titulo="Dados do novo talhão">
      <div className="space-y-4">
        {anel && <p className="text-text-2">Área desenhada: <b className="text-text">{polygonAreaHa(anel).toFixed(1)} ha</b></p>}
        <Campo rotulo="Nome do talhão"><Input value={nomeFinal} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: T-05 Sede" autoFocus onFocus={(e) => e.currentTarget.select()} /></Campo>
        <Campo rotulo="Cultivar"><Input value={cultivar} onChange={(e) => setCultivar(e.target.value)} placeholder="Ex.: precoce" /></Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Data de plantio" ajuda="Plantio em MT: 7/9/2026 a 7/1/2027"><Input type="date" value={plantio} onChange={(e) => setPlantio(e.target.value)} /></Campo>
          <Campo rotulo="Estádio atual"><Select value={estadio} onChange={(e) => setEstadio(e.target.value)}>{ESTADIOS.map((e) => <option key={e}>{e}</option>)}</Select></Campo>
        </div>
        <Campo grupo rotulo="Finalidade" ajuda="Sementes têm nível de ação mais rígido para percevejo">
          <Segmentado rotulo="Finalidade" valor={finalidade} onChange={setFinalidade} opcoes={[{ id: 'graos', nome: 'Grãos' }, { id: 'sementes', nome: 'Sementes' }]} />
        </Campo>
        {nomeFinal.trim().length < 2 && <p className="text-sm text-danger" role="alert">Dê um nome ao talhão para salvar.</p>}
        <Button block icon="check" disabled={!ok} onClick={() => void salvar()}>{salvando ? 'Salvando…' : 'Salvar talhão e gerar plano'}</Button>
      </div>
    </Folha>
  )
}
