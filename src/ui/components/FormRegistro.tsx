import { useMemo, useState } from 'react'
import { useFazenda, useOrdens } from '@/data/hooks'
import { salvarFoto, useFotoUrl } from '@/data/fotos'
import { novoId, repo } from '@/data/repo'
import type { Talhao, PlanoSalvo } from '@/domain/entidades'
import { resolverOrdem } from '@/domain/hibrido'
import { ESTADIOS } from '@/domain/phenology'
import { camposV2, descreverAmostra, type CondicoesDia, type Registro } from '@/domain/registro'
import { mediaHistorica, validarRegistro } from '@/domain/validation'
import { ALVOS, LISTA_ALVOS, type AlvoId } from '@/knowledge/alvos'
import { FONTES } from '@/knowledge/fontes'
import { useSessao } from '../state/store'
import { useToast } from '../state/toast'
import type { Fix } from '../hooks/useGps'
import { Icon } from './Icon'
import { Badge, Button, Campo, Input, Segmentado, Select, type Tom } from './kit'

const TOM: Record<string, Tom> = { ausente: 'ok', abaixo: 'ok', proximo: 'warn', atingido: 'danger', deteccao: 'info', nao_aplicavel: 'neutral' }

export function Miniatura({ id, onRemover }: { id: string; onRemover: () => void }) {
  const url = useFotoUrl(id)
  return (
    <div className="relative size-20 overflow-hidden rounded-xl border border-line bg-surface-2">
      {url && <img src={url} alt="Foto de evidência" className="size-full object-cover" />}
      <button type="button" onClick={onRemover} aria-label="Remover foto" className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-black/60 text-white"><Icon name="x" size={14} /></button>
    </div>
  )
}

interface Props {
  talhao: Talhao
  plano: PlanoSalvo
  pontoId: string
  registrosTalhao: readonly Registro[]
  gps: Fix | null
  /** Guia ligado: a posição do registro é a do GPS mesmo que a preferência de demonstração esteja ativa. */
  forcarGps?: boolean
  /** Chamado depois de gravar, com o registro salvo (a tela mostra a confirmação e permite desfazer). */
  onSalvo: (registro: Registro) => void
}

export function FormRegistro({ talhao, plano, pontoId, registrosTalhao, gps, forcarGps = false, onSalvo }: Props) {
  const { amostrador, setAmostrador, gpsReal } = useSessao()
  const mostrar = useToast((s) => s.mostrar)
  const ordens = useOrdens()
  const fazenda = useFazenda()
  const ordem = ordens?.find((o) => o.status === 'aberta' && o.talhaoId === talhao.id && o.pontoId === pontoId)

  const ponto = plano.pontos.find((p) => p.id === pontoId)!
  const [estadio, setEstadio] = useState(talhao.estadio)
  const [alvoId, setAlvoId] = useState<AlvoId>('percevejo')
  const [fase, setFase] = useState('')
  const [quantidade, setQuantidade] = useState(0)
  const [zero, setZero] = useState(false)
  const [presente, setPresente] = useState<boolean | undefined>(undefined)
  const [severidade, setSeveridade] = useState<number | undefined>(undefined)
  const [desfolha, setDesfolha] = useState<number | undefined>(undefined)
  const [fotos, setFotos] = useState<string[]>([])
  const [obs, setObs] = useState('')
  const [repeticoes, setRepeticoes] = useState(1)
  const [condicoes, setCondicoes] = useState<CondicoesDia>({})
  const [nome, setNome] = useState(amostrador)
  const [resultado, setResultado] = useState<'confirmada' | 'falso_positivo' | null>(null)
  const [causa, setCausa] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [t0] = useState(() => new Date())

  const alvo = ALVOS[alvoId]
  const ehDoenca = alvo.tipo === 'doenca'
  const usaGps = (gpsReal || forcarGps) && gps

  const rascunho: Registro = useMemo(
    () => ({
      id: 'rascunho', talhaoId: talhao.id, amostrador: nome.trim() || 'Sem nome', criadoEm: t0.toISOString(), estadio, finalidade: talhao.finalidade,
      pontoId, posicao: usaGps ? gps.posicao : ponto.position, posicaoSimulada: !usaGps, ...(usaGps ? { precisaoM: gps.precisaoM } : {}),
      alvo: alvoId, fase, quantidade, zero, ...(presente !== undefined ? { presente } : {}),
      ...(severidade !== undefined ? { severidadePct: severidade } : {}), ...(desfolha !== undefined ? { desfolhaPct: desfolha } : {}),
      fotoIds: fotos, observacao: obs,
      repeticoes, areaAmostrada: descreverAmostra(alvo.tipo, repeticoes), ...(Object.keys(condicoes).length ? { condicoes } : {}),
      ...camposV2({ posicao: usaGps ? gps.posicao : ponto.position }, { metodo: alvo.coleta.metodo, parteDaPlanta: alvo.coleta.parte, planejada: ponto.position, inicio: t0, fim: t0, ...(fazenda?.responsavelTecnico ? { responsavel: fazenda.responsavelTecnico } : {}), ...(fazenda?.fuso ? { fuso: fazenda.fuso } : {}) }),
    }),
    [t0, fazenda, alvo, repeticoes, condicoes, talhao, nome, estadio, pontoId, usaGps, gps, ponto, alvoId, fase, quantidade, zero, presente, severidade, desfolha, fotos, obs],
  )
  const hist = useMemo(() => mediaHistorica(registrosTalhao.filter((r) => r.alvo === alvoId).map((r) => r.quantidade)), [registrosTalhao, alvoId])
  const v = useMemo(
    () => validarRegistro(rascunho, { agora: t0, anelTalhao: talhao.anel, pontosDoPlano: plano.pontos.map((p) => p.id), ...(hist !== undefined ? { mediaHistorica: hist } : {}) }),
    [rascunho, t0, talhao.anel, plano.pontos, hist],
  )
  const semNome = nome.trim().length < 2
  const faltaResultado = !!ordem && (!resultado || (resultado === 'falso_positivo' && causa.trim().length < 3))
  // Os erros de "zero" só aparecem depois que o usuário tocou em algo, para não gritar ao abrir.
  const pode = v.ok && !semNome && !faltaResultado && !salvando

  const alterar = (fn: () => void) => { fn(); setZero(false) }

  async function anexar(arquivos: FileList | null) {
    if (!arquivos) return
    try {
      const ids = await Promise.all([...arquivos].map((f) => salvarFoto(f)))
      setFotos((x) => [...x, ...ids])
    } catch {
      mostrar('Não foi possível ler a foto. Tente outra imagem.', 'erro')
    }
  }

  async function salvar() {
    if (!pode) return
    setSalvando(true)
    try {
      setAmostrador(nome.trim())
      const agora = new Date()
      const reg: Registro = { ...rascunho, id: novoId('REG'), criadoEm: agora.toISOString(), fimEm: agora.toISOString(), ...(ordem ? { ordemId: ordem.id } : {}) }
      const r = await repo.salvarRegistro(reg, { agora: new Date(), anelTalhao: talhao.anel, pontosDoPlano: plano.pontos.map((p) => p.id) })
      if (!r.gravado) { mostrar('Corrija os erros antes de salvar.', 'erro'); return }
      if (ordem && resultado) {
        const res = resultado === 'confirmada' ? ({ confirmada: true } as const) : ({ confirmada: false, causa } as const)
        await repo.salvarOrdem(resolverOrdem(ordem, res, new Date(), reg.id))
      }
      mostrar(`Registro salvo em ${pontoId}`)
      onSalvo(reg)
    } finally {
      setSalvando(false)
    }
  }

  const erros = v.problemas.filter((p) => p.gravidade === 'erro')
  const avisos = v.problemas.filter((p) => p.gravidade === 'aviso')

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-apoio text-text-2">
        <Badge tom="neutral" icon="campo">Ponto {pontoId}</Badge>
        <span>{talhao.nome}</span>
        <Badge tom={usaGps ? 'ok' : 'info'}>{usaGps ? `GPS ±${Math.round(gps.precisaoM)} m` : 'Posição simulada (demonstração)'}</Badge>
      </div>

      {ordem && (
        <div className="rounded-2xl border border-warn bg-warn-soft p-4 text-apoio">
          <p className="font-semibold text-warn">Ordem de checagem aberta ({ordem.origem})</p>
          <p className="mt-1">{ordem.motivo}</p>
        </div>
      )}

      {!amostrador && <Campo rotulo="Seu nome"><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome e sobrenome" /></Campo>}

      <Campo rotulo="Estádio fenológico" ajuda="R3 = início de formação de vagens">
        <Select value={estadio} onChange={(e) => setEstadio(e.target.value)}>{ESTADIOS.map((e) => <option key={e}>{e}</option>)}</Select>
      </Campo>

      <Campo grupo rotulo="Alvo">
        <Segmentado rotulo="Alvo" valor={alvoId} onChange={(id) => { setAlvoId(id); setFase(''); setRepeticoes(1); setQuantidade(0); setZero(false); setPresente(undefined); setSeveridade(undefined); setDesfolha(undefined) }} opcoes={LISTA_ALVOS.map((a) => ({ id: a.id, nome: a.nome }))} />
      </Campo>

      <div className="rounded-2xl bg-surface-2 p-4 text-apoio text-text-2">
        <p><i>{alvo.cientifico}</i></p>
        <p className="mt-1"><b className="text-text">Método:</b> {alvo.coleta.metodo}</p>
        <p><b className="text-text">Onde olhar:</b> {alvo.coleta.parte}</p>
      </div>

      <Campo grupo rotulo="Fase">
        <Segmentado rotulo="Fase" valor={fase} onChange={setFase} opcoes={alvo.fases.map((f) => ({ id: f, nome: f }))} />
      </Campo>

      {!ehDoenca ? (
        <Campo grupo rotulo={`Quantidade (${alvo.coleta.unidade})`}>
          <div className="flex items-center justify-center gap-5 py-1">
            <button type="button" aria-label="Diminuir" className="grid size-16 place-items-center rounded-full bg-surface-2 text-titulo active:scale-95" onClick={() => alterar(() => setQuantidade((q) => Math.max(0, q - 1)))}>−</button>
            <input aria-label="Quantidade" inputMode="numeric" value={quantidade} onChange={(e) => alterar(() => setQuantidade(Math.max(0, Math.floor(Number(e.target.value.replace(/\D/g, '')) || 0))))} className="w-24 bg-transparent text-center text-5xl font-bold" />
            <button type="button" aria-label="Aumentar" className="grid size-16 place-items-center rounded-full bg-surface-2 text-titulo active:scale-95" onClick={() => alterar(() => setQuantidade((q) => q + 1))}>+</button>
          </div>
        </Campo>
      ) : (
        <Campo grupo rotulo="Sinal ou sintoma encontrado neste ponto?">
          <Segmentado rotulo="Presença" valor={presente === undefined ? '' : presente ? 'sim' : 'nao'} onChange={(x) => alterar(() => setPresente(x === 'sim'))} opcoes={[{ id: 'sim', nome: 'Sim, encontrei' }, { id: 'nao', nome: 'Não encontrei' }]} />
        </Campo>
      )}

      {(ehDoenca || alvoId === 'lagarta') && (
        <Campo rotulo={ehDoenca ? 'Severidade (% da área foliar)' : 'Desfolha (%)'}>
          <Input type="number" inputMode="decimal" min={0} max={100} step={0.5} value={(ehDoenca ? severidade : desfolha) ?? ''} placeholder="0 a 100" onChange={(e) => alterar(() => { const n = e.target.value === '' ? undefined : Number(e.target.value); if (ehDoenca) setSeveridade(n); else setDesfolha(n) })} />
        </Campo>
      )}

      <Button block variant={zero ? 'primary' : 'secondary'} icon={zero ? 'check' : undefined} onClick={() => { setZero((z) => !z); if (!zero) { setQuantidade(0); setPresente(ehDoenca ? false : undefined); setSeveridade(undefined); setDesfolha(undefined) } }}>
        Nenhuma ocorrência (registrar zero)
      </Button>

      <Campo grupo rotulo="Evidência" ajuda="Tire a foto agora ou escolha uma da galeria.">
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl border border-line bg-surface-2 px-4 font-semibold"><Icon name="camera" size={20} />Câmera<input type="file" accept="image/*" capture="environment" hidden onChange={(e) => { void anexar(e.target.files); e.target.value = '' }} /></label>
          <label className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl border border-line bg-surface-2 px-4 font-semibold"><Icon name="mais1" size={20} />Galeria<input type="file" accept="image/*" multiple hidden onChange={(e) => { void anexar(e.target.files); e.target.value = '' }} /></label>
          {fotos.map((id) => <Miniatura key={id} id={id} onRemover={() => setFotos((x) => x.filter((y) => y !== id))} />)}
        </div>
      </Campo>

      <Campo rotulo={ehDoenca ? 'Folhas inspecionadas' : 'Batidas / repetições'} ajuda={`Anotado como: ${descreverAmostra(alvo.tipo, repeticoes)}`}>
        <Input type="number" inputMode="numeric" min={1} max={100} value={repeticoes} onChange={(e) => setRepeticoes(Math.min(100, Math.max(1, Math.floor(Number(e.target.value) || 1))))} />
      </Campo>

      <details className="rounded-2xl border border-line p-4">
        <summary className="cursor-pointer font-semibold">Condições do dia (opcional)</summary>
        <div className="mt-3 space-y-4">
          <Campo grupo rotulo="Tempo"><Segmentado rotulo="Tempo" valor={condicoes.tempo ?? ''} onChange={(x) => setCondicoes((c) => ({ ...c, tempo: x as NonNullable<CondicoesDia['tempo']> }))} opcoes={[{ id: 'ensolarado', nome: 'Ensolarado' }, { id: 'nublado', nome: 'Nublado' }, { id: 'chuvoso', nome: 'Chuvoso' }]} /></Campo>
          <Campo grupo rotulo="Vento"><Segmentado rotulo="Vento" valor={condicoes.vento ?? ''} onChange={(x) => setCondicoes((c) => ({ ...c, vento: x as NonNullable<CondicoesDia['vento']> }))} opcoes={[{ id: 'calmo', nome: 'Calmo' }, { id: 'moderado', nome: 'Moderado' }, { id: 'forte', nome: 'Forte' }]} /></Campo>
          <Campo grupo rotulo="Folha"><Segmentado rotulo="Folha" valor={condicoes.folhaMolhada === undefined ? '' : condicoes.folhaMolhada ? 'molhada' : 'seca'} onChange={(x) => setCondicoes((c) => ({ ...c, folhaMolhada: x === 'molhada' }))} opcoes={[{ id: 'seca', nome: 'Seca' }, { id: 'molhada', nome: 'Molhada' }]} /></Campo>
        </div>
      </details>

      <Campo rotulo="Observação técnica (opcional)">
        <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} className="w-full rounded-2xl border border-line bg-surface-2 p-3 text-corpo" />
      </Campo>

      {ordem && (
        <Campo grupo rotulo="Resultado da checagem">
          <Segmentado rotulo="Resultado" valor={resultado ?? ''} onChange={(x) => setResultado(x as 'confirmada' | 'falso_positivo')} opcoes={[{ id: 'confirmada', nome: 'Causa biótica confirmada' }, { id: 'falso_positivo', nome: 'Falso positivo (abiótica)' }]} />
          {resultado === 'falso_positivo' && <div className="mt-3"><Input value={causa} onChange={(e) => setCausa(e.target.value)} placeholder="Causa: herbicida, compactação, estresse hídrico…" /></div>}
        </Campo>
      )}

      <section aria-live="polite" className="space-y-2 rounded-2xl border border-line p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tom={TOM[v.avaliacao.nivel] ?? 'neutral'}>{v.avaliacao.titulo}</Badge>
        </div>
        <p className="text-apoio text-text-2">{v.avaliacao.detalhe}</p>
        <p className="text-rotulo text-text-2">Fonte: {v.avaliacao.fontes.map((f) => FONTES[f].rotulo).join(' · ')}</p>
        {erros.map((p) => <p key={p.regra + p.campo} className="text-apoio text-danger" role="alert"><b>{p.regra}</b> · {p.mensagem}</p>)}
        {avisos.map((p) => <p key={p.regra + p.campo} className="text-apoio text-warn"><b>{p.regra}</b> · {p.mensagem}</p>)}
        {semNome && <p className="text-apoio text-danger" role="alert">Informe seu nome para assinar o registro.</p>}
      </section>

      <Button block icon="check" disabled={!pode} onClick={() => void salvar()}>Salvar registro</Button>
    </div>
  )
}
