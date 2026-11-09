import { Link, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { anexarDiagnostico } from '@/data/coleta'
import { useFotoUrl } from '@/data/fotos'
import { usePendencias, usePlano, useTalhoes } from '@/data/hooks'
import { classificar, confianca, podeEncerrar, proximaPergunta, type Candidato, type Classificado, type Confianca, type PerguntaFunil, type Respostas } from '@/domain/funil'
import { CANDIDATOS, PERGUNTAS } from '@/knowledge/diagnostico'
import { FONTES } from '@/knowledge/fontes'
import { slugDe, slugDeNome } from '../pages/slug'
import { LISTA_ALVOS } from '@/knowledge/alvos'
import { useSessao } from '../state/store'
import { useToast } from '../state/toast'
import { FotoRef } from './FotoRef'
import { Icon, type IconName } from './Icon'
import { Badge, Button, Card, Input, Select, type Tom } from './kit'

const TIPO: Record<Candidato['tipo'], { rotulo: string; tom: Tom }> = {
  praga: { rotulo: 'Praga', tom: 'warn' },
  doenca: { rotulo: 'Doença', tom: 'danger' },
  abiotico: { rotulo: 'Causa não viva', tom: 'info' },
}
const CONFIANCA: Record<Confianca, string> = { alta: 'Compatibilidade alta', media: 'Compatibilidade média', baixa: 'Compatibilidade baixa' }
const pct = (x: number) => Math.round(x * 100)
const slugCandidato = (c: Candidato) => (c.alvo ? slugDe(LISTA_ALVOS.find((a) => a.id === c.alvo)!) : slugDeNome(c.nome))

interface Passo { perguntaId: string; opcaoId: string | null }

function Miniatura({ id }: { id: string }) {
  const url = useFotoUrl(id)
  return <div className="size-16 overflow-hidden rounded-xl border border-line bg-surface-2">{url && <img src={url} alt="Foto do achado" className="size-full object-cover" />}</div>
}

function Barras({ ranking }: { ranking: Classificado[] }) {
  return (
    <ul className="space-y-2" aria-label="Possibilidades até agora">
      {ranking.slice(0, 3).map((r) => (
        <li key={r.candidato.id}>
          <div className="flex items-baseline justify-between gap-2 text-sm"><span className="font-semibold">{r.candidato.nome}</span><span className="tabular-nums text-text-2">{pct(r.compat)}%</span></div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct(r.compat)}%` }} /></div>
        </li>
      ))}
    </ul>
  )
}

function Pergunta({ p, numero, onResponder, onPular }: { p: PerguntaFunil; numero: number; onResponder: (opcaoId: string) => void; onPular: () => void }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-brand">Pergunta {numero}</p>
        <h2 className="mt-1 text-2xl leading-snug">{p.texto}</h2>
        {p.dica && <p className="mt-2 flex gap-2 text-text-2"><Icon name="info" size={20} className="mt-0.5 shrink-0" />{p.dica}</p>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {p.opcoes.map((o) => (
          <button key={o.id} type="button" onClick={() => onResponder(o.id)} className="flex min-h-[4.5rem] items-center gap-3 rounded-2xl border border-line bg-surface-2 p-3 text-left transition hover:border-brand active:scale-[0.99]">
            <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface text-brand">
              <FotoRef arquivo={`resposta-${p.id}-${o.id}.jpg`} alt="" className="size-full object-cover" fallback={<Icon name={(o.icone ?? 'folha') as IconName} size={26} />} />
            </span>
            <span><span className="block text-base font-semibold leading-tight">{o.rotulo}</span>{o.detalhe && <span className="mt-0.5 block text-sm text-text-2">{o.detalhe}</span>}</span>
          </button>
        ))}
      </div>
      <Button variant="ghost" onClick={onPular}>Não sei responder</Button>
    </div>
  )
}

function Detalhe({ r, aberto }: { r: Classificado; aberto?: boolean }) {
  const c = r.candidato
  const t = TIPO[c.tipo]
  return (
    <details open={aberto} className="rounded-2xl border border-line bg-surface p-4">
      <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-lg font-bold">{c.nome}</span>
        <Badge tom={t.tom}>{t.rotulo}</Badge>
        <span className="ml-auto text-xl font-bold tabular-nums">{pct(r.compat)}%</span>
      </summary>
      <div className="mt-4 space-y-4">
        <FotoRef arquivo={`${slugCandidato(c)}.jpg`} alt={`Foto de referência: ${c.nome}`} className="aspect-video w-full rounded-card border border-line object-cover" />
        {c.cientifico && <p className="italic text-text-2">{c.cientifico}</p>}
        <p className="text-lg">{c.resumo}</p>
        <div><h4 className="mb-1 font-semibold">Como confirmar</h4><ul className="list-disc space-y-1 pl-5 text-text-2">{c.comoConfirmar.map((x) => <li key={x}>{x}</li>)}</ul></div>
        <p className="text-text-2"><b className="text-text">Pode ser confundido com: </b>{c.confundeCom.join(', ')}</p>
        <div><h4 className="mb-1 font-semibold">O que fazer agora</h4><ol className="space-y-2">{c.proximosPassos.map((x, i) => <li key={x} className="flex gap-3"><span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand">{i + 1}</span><span>{x}</span></li>)}</ol></div>
        <div className="flex flex-wrap gap-3">
          {c.alvo && <Link to="/biblioteca/$slug" params={{ slug: slugCandidato(c) }} className="inline-flex min-h-11 items-center gap-1 font-semibold text-brand">Ler na Biblioteca<Icon name="seta" size={18} /></Link>}
        </div>
        <p className="text-sm text-text-2">
          Perfil de sintomas montado pela equipe a partir da literatura, a conferir. Fontes: {c.fontes.map((f, i) => { const fo = FONTES[f]; return <span key={f}>{i > 0 && ' · '}{'url' in fo && fo.url ? <a className="underline" href={fo.url} target="_blank" rel="noreferrer">{fo.rotulo}</a> : fo.rotulo}</span> })}
        </p>
      </div>
    </details>
  )
}

/** Escolhe a qual ponto anexar e grava o diagnóstico nele. */
function Anexar({ ranking }: { ranking: Classificado[] }) {
  const navegar = useNavigate()
  const mostrar = useToast((s) => s.mostrar)
  const { talhaoId, setTalhao, amostrador, setAmostrador, diagnosticoPara, setDiagnosticoPara, setPontoFoco } = useSessao()
  const talhoes = useTalhoes()
  const [talhaoEsc, setTalhaoEsc] = useState<string | null>(null)
  const [pontoEsc, setPontoEsc] = useState('')
  const [candidatoId, setCandidatoId] = useState<string | null>(null)
  const [nome, setNome] = useState(amostrador)
  const [salvando, setSalvando] = useState(false)

  const tid = diagnosticoPara?.talhaoId ?? talhaoEsc ?? talhaoId ?? talhoes?.[0]?.id ?? null
  const talhao = talhoes?.find((t) => t.id === tid)
  const plano = usePlano(tid)
  const pontoId = diagnosticoPara?.pontoId ?? (pontoEsc || null)
  const ponto = plano?.pontos.find((p) => p.id === pontoId)
  const escolhido = ranking.find((r) => r.candidato.id === (candidatoId ?? ranking[0]?.candidato.id)) ?? ranking[0]
  const semNome = amostrador.trim().length < 2 && nome.trim().length < 2
  const pode = !!talhao && !!ponto && !!escolhido && !semNome && !salvando

  async function anexar() {
    if (!pode || !talhao || !ponto || !escolhido) return
    setSalvando(true)
    try {
      const quem = amostrador.trim() || nome.trim()
      setAmostrador(quem)
      await anexarDiagnostico({ talhaoId: talhao.id, pontoId: ponto.id, pendenciaId: diagnosticoPara?.pendenciaId ?? null, titulo: escolhido.candidato.nome, ...(escolhido.candidato.alvo ? { alvoId: escolhido.candidato.alvo } : {}), compatibilidadePct: pct(escolhido.compat), estadio: talhao.estadio, amostrador: quem })
      mostrar(`Diagnóstico anexado ao ponto ${ponto.order}`)
      setDiagnosticoPara(null)
      setTalhao(talhao.id)
      setPontoFoco(ponto.id)
      void navegar({ to: '/coleta' })
    } catch (e) {
      mostrar(e instanceof Error ? e.message : 'Não foi possível anexar o diagnóstico.', 'erro')
    } finally {
      setSalvando(false)
    }
  }

  if (!talhoes || talhoes.length === 0) return <p className="text-text-2">Crie um talhão em Talhões para poder anexar o diagnóstico a um ponto.</p>

  return (
    <Card className="space-y-4">
      <h3 className="text-xl">Anexar ao ponto de coleta</h3>
      <fieldset className="space-y-2">
        <legend className="mb-1 font-semibold">Qual é o diagnóstico?</legend>
        {ranking.slice(0, 3).map((r) => (
          <label key={r.candidato.id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-line px-4 has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
            <input type="radio" name="diag" checked={escolhido?.candidato.id === r.candidato.id} onChange={() => setCandidatoId(r.candidato.id)} className="size-5 accent-[var(--brand)]" />
            <span className="flex-1 font-semibold">{r.candidato.nome}</span><span className="tabular-nums text-text-2">{pct(r.compat)}%</span>
          </label>
        ))}
      </fieldset>
      {diagnosticoPara ? (
        <p className="rounded-2xl bg-info-soft p-3 text-info">Este diagnóstico será ligado ao <b>ponto {ponto?.order ?? '…'}</b> de {talhao?.nome}, o achado que você guardou na Coleta.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1"><span aria-hidden className="font-semibold">Talhão</span><Select aria-label="Talhão" value={tid ?? ''} onChange={(e) => { setTalhaoEsc(e.target.value); setPontoEsc('') }}>{talhoes.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}</Select></div>
          <div className="space-y-1"><span aria-hidden className="font-semibold">Ponto onde encontrou</span><Select aria-label="Ponto onde encontrou" value={pontoEsc} onChange={(e) => setPontoEsc(e.target.value)}><option value="">Escolha o ponto</option>{plano?.pontos.map((p) => <option key={p.id} value={p.id}>Ponto {p.order}</option>)}</Select></div>
        </div>
      )}
      {amostrador.trim().length < 2 && <label className="block space-y-1"><span className="font-semibold">Seu nome</span><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome e sobrenome" /></label>}
      <Button block icon="check" disabled={!pode} onClick={() => void anexar()}>{salvando ? 'Anexando…' : ponto ? `Anexar ao ponto ${ponto.order}` : 'Anexar ao ponto'}</Button>
    </Card>
  )
}

export function FunilDiagnostico() {
  const [historico, setHistorico] = useState<Passo[]>([])
  const [forcado, setForcado] = useState(false)
  const respostas = useMemo<Respostas>(() => Object.fromEntries(historico.filter((h) => h.opcaoId).map((h) => [h.perguntaId, h.opcaoId!])), [historico])
  const puladas = useMemo(() => new Set(historico.filter((h) => !h.opcaoId).map((h) => h.perguntaId)), [historico])
  const ranking = useMemo(() => classificar(CANDIDATOS, respostas), [respostas])
  const proxima = useMemo(() => proximaPergunta(PERGUNTAS, CANDIDATOS, respostas, puladas, 'onde'), [respostas, puladas])
  const nResp = Object.keys(respostas).length
  const encerrado = nResp > 0 && (forcado || podeEncerrar(ranking, nResp, !!proxima))
  const conf = confianca(ranking)

  const voltar = () => { setForcado(false); setHistorico((h) => h.slice(0, -1)) }
  const recomecar = () => { setForcado(false); setHistorico([]) }

  if (encerrado) {
    return (
      <div className="space-y-4" aria-live="polite">
        <Card className="space-y-2">
          <p className="text-sm font-semibold text-brand">Resultado</p>
          <h2 className="text-2xl leading-snug">{ranking[0]!.candidato.nome} é o mais compatível</h2>
          <div className="flex flex-wrap items-center gap-2"><Badge tom={conf === 'alta' ? 'ok' : conf === 'media' ? 'warn' : 'neutral'}>{CONFIANCA[conf]}</Badge></div>
          <p className="text-text-2">A porcentagem mostra o quanto o que você viu combina com cada causa. Não é uma probabilidade medida nem um laudo.</p>
        </Card>
        <div className="space-y-3">
          {ranking.slice(0, 3).map((r, i) => <Detalhe key={r.candidato.id} r={r} aberto={i === 0} />)}
        </div>
        <Anexar ranking={ranking} />
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={voltar}>Voltar</Button>
          <Button variant="ghost" onClick={recomecar}>Recomeçar</Button>
        </div>
        <p className="text-sm text-text-2">Isto é uma pista, não um laudo. Quem decide se aplica algum produto é o agrônomo.</p>
        <details className="text-sm text-text-2"><summary className="cursor-pointer font-semibold">Suas respostas</summary>
          <ol className="mt-2 space-y-1">{historico.map((h) => { const p = PERGUNTAS.find((x) => x.id === h.perguntaId)!; return <li key={h.perguntaId}>{p.texto} <b className="text-text">{h.opcaoId ? p.opcoes.find((o) => o.id === h.opcaoId)?.rotulo : 'Não sei'}</b></li> })}</ol>
        </details>
      </div>
    )
  }

  const atual = proxima
  return (
    <Card className="space-y-5">
      {nResp > 0 && <Barras ranking={ranking} />}
      {atual ? (
        <Pergunta key={atual.id} p={atual} numero={historico.length + 1} onResponder={(o) => setHistorico([...historico, { perguntaId: atual.id, opcaoId: o }])} onPular={() => setHistorico([...historico, { perguntaId: atual.id, opcaoId: null }])} />
      ) : (
        <div className="space-y-3">
          <p className="text-lg">Não há mais perguntas que ajudem. Responda ao menos uma pergunta para ver o resultado.</p>
          <Button variant="secondary" onClick={recomecar}>Recomeçar</Button>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" onClick={voltar} disabled={historico.length === 0}>Voltar</Button>
        <div className="flex items-center gap-3">
          {nResp >= 2 && <Button variant="secondary" onClick={() => setForcado(true)}>Ver resultado agora</Button>}
          <span className="text-sm text-text-2">{historico.length === 0 ? 'Leva menos de 1 minuto' : `${nResp} respondida${nResp === 1 ? '' : 's'}`}</span>
        </div>
      </div>
    </Card>
  )
}

/** Achados que o usuário guardou na Coleta e ainda esperam um diagnóstico. */
export function PendentesParaDiagnosticar() {
  const { talhaoId, diagnosticoPara, setDiagnosticoPara, setTalhao } = useSessao()
  const talhoes = useTalhoes()
  const tid = talhaoId ?? talhoes?.[0]?.id
  const plano = usePlano(tid)
  const pendencias = usePendencias(tid)
  const abertas = (pendencias ?? []).filter((p) => !p.resolvida)
  if (!tid || abertas.length === 0) return null
  const foco = diagnosticoPara?.talhaoId === tid ? abertas.find((p) => p.id === diagnosticoPara.pendenciaId) : undefined
  return (
    <Card className="space-y-3">
      <h2 className="text-lg">Achados aguardando diagnóstico ({abertas.length})</h2>
      <ul className="space-y-2">
        {abertas.map((p) => {
          const ordem = plano?.pontos.find((x) => x.id === p.pontoId)?.order
          const ativo = foco?.id === p.id
          return (
            <li key={p.id} className={`flex flex-wrap items-center gap-3 rounded-2xl border p-3 ${ativo ? 'border-brand bg-brand-soft' : 'border-line'}`}>
              <div className="flex gap-1.5">{p.fotoIds.slice(0, 2).map((f) => <Miniatura key={f} id={f} />)}</div>
              <div className="min-w-0 flex-1"><p className="font-semibold">Ponto {ordem ?? p.pontoId}</p><p className="truncate text-sm text-text-2">{p.nota || 'Sem descrição'}</p></div>
              <Button variant={ativo ? 'primary' : 'secondary'} onClick={() => { setTalhao(tid); setDiagnosticoPara(ativo ? null : { talhaoId: tid, pontoId: p.pontoId, pendenciaId: p.id }) }}>{ativo ? 'Diagnosticando' : 'Diagnosticar'}</Button>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
