import { useMemo, useState } from 'react'
import { repo, novoId } from '@/data/repo'
import { usePlano, useTalhoes } from '@/data/hooks'
import { carregarDemonstracao } from '@/data/seed'
import type { Talhao } from '@/domain/entidades'
import { polygonAreaHa, type LngLat } from '@/domain/geo'
import { ESTADIOS } from '@/domain/phenology'
import { DEFAULT_BUFFER_M, generatePlan, MIN_POINTS, recommendedPointCount, type SamplingMethod, type SamplingParams } from '@/domain/sampling'
import { Badge, Button, Campo, Card, Folha, Input, Segmentado, Select, Titulo, Vazio } from '../components/kit'
import { Croqui } from '../components/Croqui'
import { Resultados } from '../components/Resultados'
import { Mapa } from '../components/Mapa'
import { useSessao } from '../state/store'
import { useToast } from '../state/toast'

const METODOS: { id: SamplingMethod; nome: string; quando: string }[] = [
  { id: 'zigzag', nome: 'Zigue-zague', quando: 'Talhões regulares ou grandes, com boa cobertura da área; é o padrão para praga distribuída de forma uniforme.' },
  { id: 'diagonais', nome: 'Diagonais', quando: 'Talhões mais quadrados e de relevo uniforme; cruza o talhão nas duas diagonais e é mais rápido de caminhar.' },
]

export function Talhoes() {
  const talhoes = useTalhoes()
  const { talhaoId, setTalhao, talhaoAba, setTalhaoAba } = useSessao()
  const selecionado = talhoes?.find((t) => t.id === talhaoId) ?? talhoes?.[0] ?? null
  const planoSalvo = usePlano(selecionado?.id)

  const [desenho, setDesenho] = useState<LngLat[] | null>(null)
  const [novo, setNovo] = useState<LngLat[] | null>(null) // contorno concluído, aguardando dados
  const [params, setParams] = useState<SamplingParams | null>(null)

  const efetivo = useMemo<SamplingParams>(() => params ?? planoSalvo?.params ?? { method: 'zigzag', bufferM: DEFAULT_BUFFER_M, targetPoints: 10 }, [params, planoSalvo])
  const areaHa = selecionado ? polygonAreaHa(selecionado.anel) : 0
  const preview = useMemo(() => (selecionado ? generatePlan(selecionado.anel, efetivo) : null), [selecionado, efetivo])

  const enquadrar = useMemo(() => (selecionado ? selecionado.anel : null), [selecionado])
  const alterado = !!params && JSON.stringify(params) !== JSON.stringify(planoSalvo?.params)

  async function salvarPlano() {
    if (!selecionado || !preview) return
    await repo.salvarPlano({ talhaoId: selecionado.id, params: preview.params, pontos: preview.points, caminho: preview.paths, areaHa: preview.areaHa, geradoEm: new Date().toISOString() })
    setParams(null)
  }

  if (talhoes === undefined) return null
  const verResultados = talhaoAba === 'resultados' && !desenho && !!selecionado && !!planoSalvo

  if (talhoes.length === 0 && !desenho && !novo) {
    return (
      <>
        <Titulo>Talhões</Titulo>
        <Vazio
          icone="mapa" titulo="Nenhum talhão ainda"
          texto="Desenhe o contorno do primeiro talhão no mapa para gerar o plano de amostragem, ou carregue a Fazenda Santa Aurora para apresentar o app."
          acao={<div className="flex flex-wrap justify-center gap-3"><Button icon="mais1" onClick={() => setDesenho([])}>Desenhar talhão</Button><Button variant="secondary" onClick={() => void carregarDemonstracao()}>Carregar demonstração</Button></div>}
        />
      </>
    )
  }

  return (
    <>
      <Titulo sub={desenho ? 'Toque no mapa para marcar os vértices do contorno.' : 'Selecione um talhão no mapa ou na lista.'} acao={!desenho && <Button icon="mais1" variant="secondary" onClick={() => setDesenho([])}>Novo talhão</Button>}>Talhões</Titulo>

      {!desenho && selecionado && planoSalvo && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="w-60"><Segmentado rotulo="Visão do talhão" valor={talhaoAba} onChange={setTalhaoAba} opcoes={[{ id: 'plano', nome: 'Plano' }, { id: 'resultados', nome: 'Resultados' }]} /></div>
          {verResultados && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Talhões">
              {talhoes.map((t) => (
                <button key={t.id} type="button" onClick={() => setTalhao(t.id)} className={`min-h-11 rounded-xl border px-4 text-sm font-semibold ${t.id === selecionado.id ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface hover:bg-surface-2'}`}>{t.nome}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {verResultados ? (
        <div className="space-y-4">
          <Resultados talhao={selecionado} plano={planoSalvo} />
        </div>
      ) : (
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-3">
          <Mapa
            className="h-[52dvh] w-full overflow-hidden rounded-card border border-line lg:h-[68dvh]"
            talhoes={talhoes} selecionadoId={selecionado?.id ?? null} onSelecionar={(id) => { setTalhao(id); setParams(null) }}
            pontos={desenho ? [] : preview?.points ?? []} caminho={desenho ? [] : preview?.paths ?? []}
            desenho={desenho} onVertice={(p) => setDesenho((d) => (d ? [...d, p] : d))} enquadrar={enquadrar}
          />
          {desenho && (
            <Card className="flex flex-wrap items-center gap-2">
              <Badge tom="info">{desenho.length} vértices</Badge>
              <Button variant="ghost" onClick={() => setDesenho((d) => d?.slice(0, -1) ?? d)} disabled={desenho.length === 0}>Desfazer</Button>
              <Button variant="ghost" onClick={() => setDesenho([])} disabled={desenho.length === 0}>Limpar</Button>
              <span className="flex-1" />
              <Button variant="secondary" onClick={() => setDesenho(null)}>Cancelar</Button>
              <Button icon="check" disabled={desenho.length < 3} onClick={() => { setNovo(desenho); setDesenho(null) }}>Concluir contorno</Button>
            </Card>
          )}
          <div className="flex flex-wrap gap-2" role="group" aria-label="Talhões">
            {talhoes.map((t) => (
              <button key={t.id} type="button" onClick={() => { setTalhao(t.id); setParams(null) }} className={`min-h-11 rounded-xl border px-4 text-sm font-semibold ${t.id === selecionado?.id ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface hover:bg-surface-2'}`}>
                {t.nome}
              </button>
            ))}
          </div>
        </div>

        {selecionado && preview && !desenho && (
          <div className="space-y-4">
            <Card className="space-y-1">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg">{selecionado.nome}</h2>
                <Badge tom="neutral">{areaHa.toFixed(1)} ha</Badge>
              </div>
              <p className="text-sm text-text-2">{selecionado.cultivar} · plantio {selecionado.dataPlantio.split('-').reverse().join('/')} · {selecionado.estadio}</p>
            </Card>

            <Card className="space-y-4">
              <h2 className="text-lg">Plano de amostragem</h2>
              <Campo rotulo="Caminhamento" ajuda={METODOS.find((m) => m.id === efetivo.method)?.quando}>
                <Segmentado rotulo="Caminhamento" valor={efetivo.method} onChange={(method) => setParams({ ...efetivo, method })} opcoes={METODOS.map((m) => ({ id: m.id, nome: m.nome }))} />
              </Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo rotulo="Pontos" ajuda={`Sugerido: ${recommendedPointCount(areaHa)} (mín. ${MIN_POINTS})`}>
                  <Input type="number" inputMode="numeric" min={3} max={40} value={efetivo.targetPoints} onChange={(e) => setParams({ ...efetivo, targetPoints: Math.max(3, Math.min(40, Number(e.target.value) || 3)) })} />
                </Campo>
                <Campo rotulo="Bordadura (m)" ajuda="Descartada nas bordas">
                  <Input type="number" inputMode="numeric" min={0} max={100} value={efetivo.bufferM} onChange={(e) => setParams({ ...efetivo, bufferM: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} />
                </Campo>
              </div>
              <ul className="space-y-1.5 text-sm">
                <li>{preview.points.length} pontos · caminhada de ~{(preview.walkLengthM / 1000).toFixed(1)} km · espaçamento médio de {preview.meanSpacingM.toFixed(0)} m</li>
                {preview.issues.map((i) => (
                  <li key={i.code}><Badge tom={i.severity === 'erro' ? 'danger' : 'warn'} icon="alerta">{i.severity === 'erro' ? 'Erro' : 'Atenção'}</Badge> <span className="text-text-2">{i.message}</span></li>
                ))}
              </ul>
              <Button block icon="check" onClick={() => void salvarPlano()} disabled={!alterado && !!planoSalvo || preview.points.length === 0}>
                {planoSalvo ? (alterado ? 'Salvar novo plano' : 'Plano salvo') : 'Salvar plano'}
              </Button>
              {planoSalvo && alterado && <p className="text-sm text-text-2">Salvar o novo plano mantém os registros anteriores, mas os pontos mudam.</p>}
            </Card>

            <Card className="space-y-3">
              <h2 className="text-lg">Croqui</h2>
              <Croqui anel={selecionado.anel} pontos={preview.points} caminho={preview.paths} titulo={`Croqui de ${selecionado.nome}`} />
              <p className="text-sm text-text-2">Linha tracejada: caminhamento. Círculos: pontos de amostragem.</p>
            </Card>

          </div>
        )}
      </div>
      )}

      <FormTalhao anel={novo} sugestao={`Talhão ${talhoes.length + 1}`} onFechar={() => setNovo(null)} onSalvo={(t) => { setTalhao(t.id); setNovo(null); setParams(null) }} />
    </>
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
