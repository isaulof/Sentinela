import { useState } from 'react'
import { mensagemDeGravacao } from '@/data/erros'
import { useFotoUrl } from '@/data/fotos'
import { usePendencias, useVersoesDoPonto } from '@/data/hooks'
import { repo } from '@/data/repo'
import { avaliarRegistro } from '@/domain/analise'
import type { Nivel } from '@/domain/decision'
import type { Talhao } from '@/domain/entidades'
import { condicoesDoRegistro, duracaoDoRegistro, estadoDaVersao, linhaDoTempoDoPonto, medidaDoRegistro, posicaoDoRegistro, rastroDaVersao } from '@/domain/ficha'
import { rotuloDiagnostico } from '@/domain/funil'
import { metodoDoRegistro, type Correcao, type Registro } from '@/domain/registro'
import { dataHoraBr } from '@/domain/tempo'
import { ALVOS } from '@/knowledge/alvos'
import { useSessao } from '../state/store'
import { useToast } from '../state/toast'
import { Badge, Button, Campo, Input, Segmentado, type Tom } from './kit'

const TOM: Record<Nivel, Tom> = { ausente: 'ok', abaixo: 'ok', proximo: 'warn', atingido: 'danger', deteccao: 'info', nao_aplicavel: 'neutral' }

function Miniatura({ id }: { id: string }) {
  const url = useFotoUrl(id)
  return <div className="size-16 overflow-hidden rounded-xl bg-surface-2 ring-1 ring-line">{url && <img src={url} alt="Foto de evidência" className="size-full object-cover" />}</div>
}

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return <div className="contents"><dt className="text-text-2">{rotulo}</dt><dd className="min-w-0 break-words">{children}</dd></div>
}

/** Corrige a medida de um registro gerando uma nova versão (autor e motivo obrigatórios). */
function FormCorrecao({ registro, onFechar }: { registro: Registro; onFechar: () => void }) {
  const mostrar = useToast((s) => s.mostrar)
  const amostrador = useSessao((s) => s.amostrador)
  const ehDoenca = ALVOS[registro.alvo].tipo === 'doenca'
  const [quantidade, setQuantidade] = useState(String(registro.quantidade))
  const [presente, setPresente] = useState<boolean>(registro.presente ?? false)
  const [severidade, setSeveridade] = useState(registro.severidadePct === undefined ? '' : String(registro.severidadePct))
  const [desfolha, setDesfolha] = useState(registro.desfolhaPct === undefined ? '' : String(registro.desfolhaPct))
  const [obs, setObs] = useState(registro.observacao)
  const [motivo, setMotivo] = useState('')
  const [autor, setAutor] = useState(amostrador)
  const [erros, setErros] = useState<string[]>([])
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    const q = ehDoenca ? 0 : Math.max(0, Math.floor(Number(quantidade) || 0))
    const sev = severidade === '' ? undefined : Number(severidade)
    const desf = desfolha === '' ? undefined : Number(desfolha)
    const semNada = q === 0 && !(ehDoenca && presente) && (sev ?? 0) === 0 && (desf ?? 0) === 0
    const mudancas: Correcao = {
      quantidade: q, zero: semNada, observacao: obs,
      ...(ehDoenca ? { presente, ...(sev !== undefined ? { severidadePct: sev } : {}) } : {}),
      ...(registro.alvo === 'lagarta' && desf !== undefined ? { desfolhaPct: desf } : {}),
    }
    setSalvando(true)
    try {
      const r = await repo.corrigirRegistro(registro.id, mudancas, { autor, motivo })
      if (!r.gravado) { setErros(r.problemas.filter((p) => p.gravidade === 'erro').map((p) => p.mensagem)); return }
      mostrar('Correção salva. A versão anterior continua guardada.')
      onFechar()
    } catch (e) {
      setErros([mensagemDeGravacao(e, 'Não foi possível salvar a correção. Tente de novo.')])
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl bg-surface-2 p-3">
      <p className="text-apoio font-semibold">Corrigir registro</p>
      {!ehDoenca && <Campo rotulo="Quantidade"><Input type="number" inputMode="numeric" min={0} value={quantidade} onChange={(e) => setQuantidade(e.target.value)} /></Campo>}
      {ehDoenca && (
        <>
          <Campo grupo rotulo="Sinal ou sintoma"><Segmentado rotulo="Presença" valor={presente ? 'sim' : 'nao'} onChange={(x) => setPresente(x === 'sim')} opcoes={[{ id: 'sim', nome: 'Encontrei' }, { id: 'nao', nome: 'Não encontrei' }]} /></Campo>
          <Campo rotulo="Severidade (%)"><Input type="number" inputMode="decimal" min={0} max={100} value={severidade} onChange={(e) => setSeveridade(e.target.value)} /></Campo>
        </>
      )}
      {registro.alvo === 'lagarta' && <Campo rotulo="Desfolha (%)"><Input type="number" inputMode="decimal" min={0} max={100} value={desfolha} onChange={(e) => setDesfolha(e.target.value)} /></Campo>}
      <Campo rotulo="Observação"><Input value={obs} onChange={(e) => setObs(e.target.value)} /></Campo>
      <Campo rotulo="Motivo da correção" ajuda="Fica registrado na trilha de auditoria."><Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: contei de novo no pano" /></Campo>
      <Campo rotulo="Quem está corrigindo"><Input value={autor} onChange={(e) => setAutor(e.target.value)} placeholder="Nome e sobrenome" /></Campo>
      {erros.map((e) => <p key={e} role="alert" className="text-apoio text-danger">{e}</p>)}
      <div className="flex gap-2"><Button variant="secondary" onClick={onFechar}>Cancelar</Button><Button disabled={salvando || motivo.trim().length < 3 || autor.trim().length < 2} onClick={() => void salvar()}>Salvar correção</Button></div>
    </div>
  )
}

function CartaoRegistro({ r }: { r: Registro }) {
  const [corrigindo, setCorrigindo] = useState(false)
  const estado = estadoDaVersao(r)
  const a = avaliarRegistro(r)
  const rastro = rastroDaVersao(r)
  const cond = condicoesDoRegistro(r)
  const dur = duracaoDoRegistro(r)
  return (
    <li className={`rounded-2xl border border-line p-3.5 ${estado === 'ativa' ? 'bg-surface' : 'bg-surface-2 opacity-80'}`} data-estado={estado}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold">{ALVOS[r.alvo].nome}{(r.versao ?? 1) > 1 && <span className="font-normal text-text-2"> · versão {r.versao}</span>}</p>
          <p className="text-apoio text-text-2">{dataHoraBr(r.criadoEm, r.fusoHorario)} · {medidaDoRegistro(r)}</p>
        </div>
        {estado === 'ativa' ? <Badge tom={TOM[a.nivel] ?? 'neutral'}>{a.titulo}</Badge> : <Badge tom="neutral">{estado === 'corrigida' ? 'Substituída' : 'Desfeita'}</Badge>}
      </div>
      <dl className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-apoio">
        <Linha rotulo="Método">{metodoDoRegistro(r)}</Linha>
        {r.areaAmostrada && <Linha rotulo="Amostra">{r.areaAmostrada}</Linha>}
        <Linha rotulo="Fase">{r.fase}</Linha>
        {cond && <Linha rotulo="Condições">{cond}</Linha>}
        <Linha rotulo="Coletado por">{r.amostrador}</Linha>
        {r.responsavel && <Linha rotulo="Responsável técnico">{r.responsavel}</Linha>}
        <Linha rotulo="Posição">{posicaoDoRegistro(r)}</Linha>
        {dur && <Linha rotulo="Duração">{dur}</Linha>}
        {r.observacao && <Linha rotulo="Observação">{r.observacao}</Linha>}
      </dl>
      {r.fotoIds.length > 0 && <ul className="mt-2.5 flex flex-wrap gap-2">{r.fotoIds.map((id) => <li key={id}><Miniatura id={id} /></li>)}</ul>}
      {rastro && <p className="mt-2.5 rounded-lg bg-surface-2 px-2.5 py-1.5 text-rotulo text-text-2">{rastro}</p>}
      {estado === 'ativa' && !corrigindo && <button type="button" onClick={() => setCorrigindo(true)} className="mt-2.5 inline-flex min-h-11 items-center font-semibold text-brand underline">Corrigir</button>}
      {corrigindo && <FormCorrecao registro={r} onFechar={() => setCorrigindo(false)} />}
    </li>
  )
}

/** Tudo o que se sabe de um ponto, em ordem de data: registros (com todas as versões), achados e diagnósticos. */
export function FichaPonto({ talhao, pontoId, ordem }: { talhao: Talhao; pontoId: string; ordem: number }) {
  const versoes = useVersoesDoPonto(talhao.id, pontoId)
  const pendencias = usePendencias(talhao.id)
  if (versoes === undefined || pendencias === undefined) return null
  const itens = linhaDoTempoDoPonto(versoes, pendencias.filter((p) => p.pontoId === pontoId))
  if (itens.length === 0) return <p className="text-text-2">Ainda não há registros no ponto {ordem}.</p>
  return (
    <div className="space-y-3">
      <p className="text-apoio text-text-2">{talhao.nome} · ponto {ordem} · do mais recente ao mais antigo. Nada é apagado: correções e registros desfeitos ficam aqui.</p>
      <ol className="space-y-3" aria-label={`Histórico do ponto ${ordem}`}>
        {itens.map((e) => e.registro ? <CartaoRegistro key={e.registro.id} r={e.registro} /> : (
          <li key={e.pendencia!.id} className="rounded-2xl border border-line bg-surface p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0"><p className="font-semibold">Achado guardado</p><p className="text-apoio text-text-2">{dataHoraBr(e.pendencia!.criadoEm)} · {e.pendencia!.fotoIds.length} foto(s) · {e.pendencia!.amostrador}</p></div>
              <Badge tom={e.pendencia!.resolvida ? 'ok' : 'info'}>{e.pendencia!.resolvida ? rotuloDiagnostico(e.pendencia!.resolvida) : 'Pendente'}</Badge>
            </div>
            {e.pendencia!.nota && <p className="mt-2 text-apoio">{e.pendencia!.nota}</p>}
            {e.pendencia!.fotoIds.length > 0 && <ul className="mt-2.5 flex flex-wrap gap-2">{e.pendencia!.fotoIds.map((id) => <li key={id}><Miniatura id={id} /></li>)}</ul>}
          </li>
        ))}
      </ol>
    </div>
  )
}
