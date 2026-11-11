import { Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useFotoUrl } from '@/data/fotos'
import { usePlano, usePlanos, useTalhoes, useTodasPendencias } from '@/data/hooks'
import { proximoPasso } from '@/domain/fluxo'
import { classificar, confianca as confiancaDe, contarEvidencias, percentual, possibilidadesRestantes, veredito as vereditoDe, progresso as progressoDe, type EscolhaFoto, type Respostas } from '@/domain/funil'
import { mensagemParaAgronomo } from '@/domain/relatorio'
import { CANDIDATOS, PERGUNTAS } from '@/knowledge/diagnostico'
import { CompararFotos } from '../components/CompararFotos'
import { Icon } from '../components/Icon'
import { Perguntas } from '../components/Perguntas'
import { ResultadoDiagnostico } from '../components/ResultadoDiagnostico'
import { SalvarDiagnostico } from '../components/SalvarDiagnostico'
import { Button, Campo, Card, Select, Titulo } from '../components/kit'
import { useSessao } from '../state/store'
import { useToast } from '../state/toast'

/** O que o usuário fez, em ordem: responder (ou pular) uma pergunta, ou escolher uma foto. Voltar desfaz o último. */
type Evento = { t: 'resp'; perguntaId: string; opcaoId: string | null } | { t: 'foto'; escolha: EscolhaFoto }
interface Achado { talhaoId: string; pontoId: string; pendenciaId: string }

function Miniatura({ id, className = 'size-14' }: { id: string; className?: string }) {
  const url = useFotoUrl(id)
  return <div className={`${className} shrink-0 overflow-hidden rounded-xl bg-surface-2 ring-1 ring-line`}>{url && <img src={url} alt="Foto do achado" className="size-full object-cover" />}</div>
}

export function Diagnostico() {
  const talhoes = useTalhoes()
  const planos = usePlanos()
  const pendencias = useTodasPendencias()
  const mostrar = useToast((s) => s.mostrar)
  const { talhaoId } = useSessao()

  // Vindo da Coleta ("Diagnosticar agora"), o achado já define talhão e ponto e o questionário abre direto.
  const [achado, setAchado] = useState<Achado | null>(() => {
    const d = useSessao.getState().diagnosticoPara
    return d ? { talhaoId: d.talhaoId, pontoId: d.pontoId, pendenciaId: d.pendenciaId ?? '' } : null
  })
  const [iniciado, setIniciado] = useState(() => !!useSessao.getState().diagnosticoPara)
  const [eventos, setEventos] = useState<Evento[]>([])
  const [forcado, setForcado] = useState(false)
  const [mais, setMais] = useState(0) // perguntas extras pedidas depois de um resultado inconclusivo
  const [escolhaTalhao, setEscolhaTalhao] = useState<string | undefined>(undefined) // undefined = padrão; 'nenhum' = não informar
  const [salvarAberto, setSalvarAberto] = useState(false)
  // O achado em foco vale só enquanto esta tela está aberta.
  useEffect(() => () => useSessao.getState().setDiagnosticoPara(null), [])

  const tid = achado?.talhaoId ?? (escolhaTalhao === 'nenhum' ? null : escolhaTalhao ?? talhaoId ?? talhoes?.[0]?.id ?? null)
  const talhao = talhoes?.find((t) => t.id === tid)
  const plano = usePlano(tid)
  const estadio = talhao?.estadio
  const pendencia = achado ? pendencias?.find((p) => p.id === achado.pendenciaId) : undefined
  const ordemPonto = achado ? plano?.pontos.find((p) => p.id === achado.pontoId)?.order : undefined

  const respostas = useMemo<Respostas>(() => Object.fromEntries(eventos.flatMap((e) => (e.t === 'resp' && e.opcaoId ? [[e.perguntaId, e.opcaoId] as const] : []))), [eventos])
  const puladas = useMemo(() => new Set(eventos.flatMap((e) => (e.t === 'resp' && !e.opcaoId ? [e.perguntaId] : []))), [eventos])
  const fotos = useMemo(() => eventos.flatMap((e) => (e.t === 'foto' ? [e.escolha] : [])), [eventos])
  const ctx = useMemo(() => ({ estadio, perguntas: PERGUNTAS, fotos }), [estadio, fotos])
  const ranking = useMemo(() => classificar(CANDIDATOS, respostas, ctx), [respostas, ctx])
  const passo = useMemo(() => proximoPasso(PERGUNTAS, CANDIDATOS, { respostas, puladas, fotos, encerrar: forcado, mais }, { estadio }), [respostas, puladas, fotos, forcado, mais, estadio])
  const maisPerguntas = useMemo(() => proximoPasso(PERGUNTAS, CANDIDATOS, { respostas, puladas, fotos, mais: mais + 3 }, { estadio }).tipo === 'pergunta', [respostas, puladas, fotos, mais, estadio])
  const progresso = useMemo(() => progressoDe(CANDIDATOS, respostas, ctx), [respostas, ctx])
  const nResp = Object.keys(respostas).length
  const evidencias = contarEvidencias(respostas, fotos)
  const encerrado = iniciado && nResp > 0 && passo.tipo === 'resultado'
  const conf = confiancaDe(ranking)
  const veredito = vereditoDe(ranking, evidencias)

  const recomecar = () => { setForcado(false); setMais(0); setEventos([]); setIniciado(false); setAchado(null) }
  const voltar = () => {
    setForcado(false)
    if (eventos.length === 0) { setIniciado(false); return }
    setEventos((h) => h.slice(0, -1))
  }
  const responder = (perguntaId: string, opcaoId: string | null) => setEventos((h) => [...h, { t: 'resp', perguntaId, opcaoId }])
  const escolherFoto = (mostrados: string[], escolhido: string) => setEventos((h) => [...h, { t: 'foto', escolha: { mostrados, escolhido } }])

  async function enviar() {
    const resp = eventos.flatMap((e) => { if (e.t !== 'resp' || !e.opcaoId) return []; const p = PERGUNTAS.find((x) => x.id === e.perguntaId)!; return [{ pergunta: p.texto, resposta: p.opcoes.find((o) => o.id === e.opcaoId)?.rotulo ?? '' }] })
    const escolhidas = fotos.flatMap((f) => { const c = CANDIDATOS.find((x) => x.id === f.escolhido); return c ? [c.nome] : [] })
    const texto = mensagemParaAgronomo({
      fazenda: 'Fazenda Santa Aurora', ...(talhao ? { talhao: talhao.nome } : {}), ...(ordemPonto !== undefined ? { ponto: ordemPonto } : {}), ...(estadio ? { estadio } : {}),
      principal: { nome: ranking[0]!.candidato.nome, ...(ranking[0]!.candidato.cientifico ? { cientifico: ranking[0]!.candidato.cientifico } : {}), confianca: conf, percentual: percentual(ranking[0]!.compat, evidencias) },
      ...(escolhidas.length ? { fotosEscolhidas: escolhidas } : {}),
      outras: ranking.slice(1, 3).filter((r) => r.compat >= 0.05).map((r) => r.candidato.nome),
      respostas: resp, passos: ranking[0]!.candidato.proximosPassos, quando: new Date(),
    })
    if (typeof navigator.share === 'function') {
      try { await navigator.share({ title: 'Pré-diagnóstico · Sentinela', text: texto }); return } catch (e) { if (e instanceof DOMException && e.name === 'AbortError') return }
    }
    try { await navigator.clipboard.writeText(texto); mostrar('Texto copiado. Cole no WhatsApp ou no e-mail.') } catch { mostrar('Não foi possível copiar o texto.', 'erro') }
  }

  if (talhoes === undefined || pendencias === undefined) return null

  /** Contexto do achado: lavoura, fase e fotos que o usuário guardou na Coleta. */
  const contextoDoAchado = (talhao || pendencia) && (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-surface px-3 py-2.5 text-sm ring-1 ring-line">
      <Icon name="mapa" size={16} className="shrink-0 text-brand" />
      <span className="font-medium">{talhao?.nome}{estadio ? ` · fase ${estadio}` : ''}{ordemPonto !== undefined ? ` · ponto ${ordemPonto}` : ''}</span>
      {pendencia && pendencia.fotoIds.length > 0 && <span className="flex gap-1.5">{pendencia.fotoIds.slice(0, 3).map((f) => <Miniatura key={f} id={f} className="size-10" />)}</span>}
    </div>
  )

  if (encerrado) {
    return (
      <>
        <div className="mx-auto mb-3 max-w-2xl">{contextoDoAchado}</div>
        <ResultadoDiagnostico
          ranking={ranking} confianca={conf} respostas={respostas} fotos={fotos} evidencias={evidencias} veredito={veredito} podePerguntarMais={maisPerguntas} onMaisPerguntas={() => setMais((m) => m + 3)}
          rotuloSalvar={ordemPonto !== undefined ? `Salvar no ponto ${ordemPonto}` : 'Salvar em um ponto'}
          onSalvar={() => setSalvarAberto(true)} onEnviar={() => void enviar()} onVoltar={voltar} onRecomecar={recomecar}
        />
        <SalvarDiagnostico aberta={salvarAberto} onFechar={() => setSalvarAberto(false)} ranking={ranking} confianca={conf} evidencias={evidencias} talhaoId={tid} achado={achado && achado.pendenciaId ? { pontoId: achado.pontoId, pendenciaId: achado.pendenciaId } : null} />
      </>
    )
  }

  if (iniciado) {
    if (passo.tipo === 'fotos') {
      const mostrados = passo.candidatos.map((c) => c.id)
      return (
        <>
          <h1 className="sr-only">Diagnóstico</h1>
          <CompararFotos
            candidatos={passo.candidatos} rodada={passo.rodada} contexto={contextoDoAchado || undefined}
            onEscolher={(id) => escolherFoto(mostrados, id)} onNenhuma={() => escolherFoto(mostrados, 'nenhuma')} onNaoSei={() => escolherFoto(mostrados, 'nao_sei')} onVoltar={voltar}
          />
        </>
      )
    }
    if (passo.tipo === 'resultado') {
      // Só chega aqui sem resposta nenhuma (todas puladas): não há o que mostrar.
      return (
        <div className="mx-auto max-w-2xl space-y-4">
          <h1 className="sr-only">Diagnóstico</h1>
          <Card className="space-y-3 text-center">
            <h2 className="text-lg">Sem respostas, não dá para ajudar</h2>
            <p className="text-text-2">Responda pelo menos uma pergunta para ver uma pista. Você pode recomeçar e tentar de novo.</p>
            <Button variant="secondary" onClick={recomecar}>Recomeçar</Button>
          </Card>
        </div>
      )
    }
    const proxima = passo.pergunta
    return (
      <>
        <h1 className="sr-only">Diagnóstico</h1>
        <Perguntas
          pergunta={proxima} fase={passo.fase} n={passo.n} progresso={progresso} restantes={possibilidadesRestantes(ranking)} respondidas={nResp}
          contexto={contextoDoAchado || undefined}
          onResponder={(o) => responder(proxima.id, o)} onPular={() => responder(proxima.id, null)} onVoltar={voltar} onVerResultado={() => setForcado(true)}
        />
      </>
    )
  }

  // Início
  const abertas = pendencias.filter((p) => !p.resolvida)
  return (
    <>
      <Titulo sub="Apoio à identificação de doenças, pragas e distúrbios na cultura da soja.">Diagnóstico</Titulo>
      <div className="mx-auto max-w-2xl space-y-6">
        <Card className="space-y-4 bg-brand-soft! ring-brand/20!">
          <div className="flex items-start gap-3.5">
            <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-brand text-on-brand"><Icon name="diag" size={24} /></span>
            <div>
              <h2 className="text-lg">Diagnóstico assistido</h2>
              <p className="mt-0.5 text-text-2">Informe o que você observa em campo. O app cruza os sintomas, a fase da lavoura e fotos de referência para indicar as causas mais compatíveis: doença, praga, deficiência nutricional ou efeito de manejo.</p>
            </div>
          </div>
          {talhoes.length > 0 && (
            <Campo rotulo="Talhão avaliado" ajuda="O estádio fenológico da cultura aumenta a precisão da indicação.">
              <Select value={escolhaTalhao ?? tid ?? 'nenhum'} onChange={(e) => setEscolhaTalhao(e.target.value)}>
                {talhoes.map((t) => <option key={t.id} value={t.id}>{t.nome} · fase {t.estadio}</option>)}
                <option value="nenhum">Outro lugar / não quero informar</option>
              </Select>
            </Campo>
          )}
          <Button block onClick={() => setIniciado(true)}>Iniciar diagnóstico</Button>
        </Card>

        {abertas.length > 0 && (
          <section aria-labelledby="aguardando" className="space-y-3">
            <h2 id="aguardando" className="text-lg">Achados aguardando diagnóstico ({abertas.length})</h2>
            <ul className="space-y-2.5">
              {abertas.map((p) => {
                const t = talhoes.find((x) => x.id === p.talhaoId)
                const ordem = planos?.find((x) => x.talhaoId === p.talhaoId)?.pontos.find((x) => x.id === p.pontoId)?.order
                return (
                  <li key={p.id}>
                    <button type="button" onClick={() => { setAchado({ talhaoId: p.talhaoId, pontoId: p.pontoId, pendenciaId: p.id }); setIniciado(true) }} aria-label={`Diagnosticar o ponto ${ordem ?? ''} de ${t?.nome ?? 'talhão'}`} className="flex w-full items-center gap-3 rounded-card bg-surface p-3 text-left ring-1 ring-line transition active:bg-surface-2">
                      <span className="flex gap-1.5">{p.fotoIds.slice(0, 2).map((f) => <Miniatura key={f} id={f} />)}{p.fotoIds.length === 0 && <span aria-hidden className="grid size-14 place-items-center rounded-xl bg-surface-2 text-text-2"><Icon name="camera" size={22} /></span>}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">Ponto {ordem ?? '?'} · {t?.nome ?? p.talhaoId}</span>
                        <span className="block truncate text-sm text-text-2">{p.nota || 'Sem descrição'}</span>
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand">Diagnosticar<Icon name="seta" size={16} /></span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        <p className="text-sm text-text-2">Resultado de apoio à decisão, não é laudo. A recomendação de manejo é do agrônomo responsável.</p>

        <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface ring-1 ring-line">
          <li><Link to="/biblioteca" className="flex min-h-14 items-center gap-3 px-4 transition active:bg-surface-2"><Icon name="livro" size={20} className="text-brand" /><span className="flex-1"><span className="block font-semibold">Guia de pragas e doenças</span><span className="block text-sm text-text-2">Já sabe o nome? Leia na Biblioteca.</span></span><Icon name="seta" size={18} className="text-text-2" /></Link></li>
          <li><Link to="/diagnostico/tecnico" className="flex min-h-14 items-center gap-3 px-4 transition active:bg-surface-2"><Icon name="lista" size={20} className="text-brand" /><span className="flex-1"><span className="block font-semibold">Material do técnico</span><span className="block text-sm text-text-2">Árvores de decisão, sintoma × sinal e regras.</span></span><Icon name="seta" size={18} className="text-text-2" /></Link></li>
        </ul>
      </div>
    </>
  )
}
