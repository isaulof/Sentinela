import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { explicar, percentual, porGrupo, ROTULO_CONFIANCA, type Candidato, type Classificado, type Confianca, type EscolhaFoto, type Respostas, type Veredito } from '@/domain/funil'
import { PERGUNTAS } from '@/knowledge/diagnostico'
import { FONTES } from '@/knowledge/fontes'
import { FOTO_CLASSE, fotosDoCandidato } from './fotosDiagnostico'
import { FotoRef } from './FotoRef'
import { Icon } from './Icon'
import { Badge, Button, Card, type Tom } from './kit'

const TIPO: Record<Candidato['tipo'], { rotulo: string; tom: Tom }> = {
  praga: { rotulo: 'Praga', tom: 'warn' },
  doenca: { rotulo: 'Doença', tom: 'danger' },
  abiotico: { rotulo: 'Clima, solo ou manejo', tom: 'info' },
}

/** Medidor de 3 níveis: palavra + barras, nunca só cor. */
function Medidor({ nivel, pct }: { nivel: Confianca; pct: number }) {
  const cheias = nivel === 'alta' ? 3 : nivel === 'media' ? 2 : 1
  const cor = nivel === 'alta' ? 'bg-ok' : nivel === 'media' ? 'bg-warn' : 'bg-text-2/50'
  return (
    <div className="flex items-center gap-2.5" role="img" aria-label={`Certeza: ${pct}%, ${ROTULO_CONFIANCA[nivel].toLowerCase()}`}>
      <span aria-hidden className="flex gap-1">{[1, 2, 3].map((i) => <span key={i} className={`h-2 w-7 rounded-full ${i <= cheias ? cor : 'bg-surface-2'}`} />)}</span>
      <span className="text-sm font-semibold"><span className="text-base">{pct}%</span> de certeza · {ROTULO_CONFIANCA[nivel]}</span>
    </div>
  )
}

/** Primeira resposta que o produtor quer: foi doença/praga ou foi algo que não é vivo (produto, nutriente, clima)? */
function Grupo({ viva, naoViva }: { viva: number; naoViva: number }) {
  return (
    <Card className="space-y-2.5">
      <h3 className="text-base">É doença ou praga? Ou outra causa?</h3>
      <div role="img" aria-label={`Doença ou praga: ${viva}%. Causa não viva (produto, nutriente, clima ou solo): ${naoViva}%`} className="flex h-3 overflow-hidden rounded-full bg-surface-2">
        <span className="bg-danger" style={{ width: `${viva}%` }} />
        <span className="bg-info" style={{ width: `${naoViva}%` }} />
      </div>
      <div className="flex justify-between gap-3 text-sm">
        <span><b>{viva}%</b> <span className="text-text-2">doença ou praga</span></span>
        <span className="text-right"><b>{naoViva}%</b> <span className="text-text-2">produto, nutriente, clima ou solo</span></span>
      </div>
    </Card>
  )
}

function Secao({ titulo, icone, children }: { titulo: string; icone?: ReactNode; children: ReactNode }) {
  return (
    <Card className="space-y-3">
      <h3 className="flex items-center gap-2 text-base">{icone}{titulo}</h3>
      {children}
    </Card>
  )
}

interface Props {
  ranking: Classificado[]
  confianca: Confianca
  respostas: Respostas
  /** Fotos comparadas e escolhidas, em ordem. */
  fotos: readonly EscolhaFoto[]
  /** Respostas dadas + fotos escolhidas: quanto mais evidência, maior o teto do percentual. */
  evidencias: number
  /** 'inconclusivo': sem base para dar nome ao problema; mostra as possibilidades em vez de uma resposta. */
  veredito: Veredito
  /** Ainda há perguntas úteis a fazer. */
  podePerguntarMais: boolean
  onMaisPerguntas: () => void
  /** Texto do botão principal: "Salvar no ponto 3" ou "Salvar em um ponto". */
  rotuloSalvar: string
  onSalvar: () => void
  onEnviar: () => void
  onVoltar: () => void
  onRecomecar: () => void
}

/** Resultado em linguagem de campo: o que é, o que fazer agora, por que o app pensa assim e como confirmar. */
export function ResultadoDiagnostico({ ranking, confianca, respostas, fotos, evidencias, veredito, podePerguntarMais, onMaisPerguntas, rotuloSalvar, onSalvar, onEnviar, onVoltar, onRecomecar }: Props) {
  const top = ranking[0]!.candidato
  const t = TIPO[top.tipo]
  const inconclusivo = veredito === 'inconclusivo'
  const incerto = confianca === 'baixa'
  const { combina, naoCombina } = explicar(top, PERGUNTAS, respostas)
  const outras = ranking.slice(1, 4).filter((r) => r.compat >= 0.05)
  const pct = percentual(ranking[0]!.compat, evidencias)
  const grupo = porGrupo(ranking, evidencias)
  const escolhas = fotos.filter((f) => f.escolhido !== 'nao_sei' && f.escolhido !== 'nenhuma').map((f) => ranking.find((r) => r.candidato.id === f.escolhido)?.candidato).filter((c): c is Candidato => !!c)

  return (
    <div className="mx-auto max-w-2xl space-y-4" aria-live="polite">
      <h1 className="sr-only">Resultado do diagnóstico</h1>

      {inconclusivo ? (
        <Card className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tom="warn">Resultado incerto</Badge>
            <Medidor nivel="baixa" pct={pct} />
          </div>
          <h2 className="text-[1.5rem] leading-tight">Ainda não dá para dizer o que é</h2>
          <p className="leading-relaxed">Com o que você respondeu, o app não tem base para apontar uma causa. Estas são as mais compatíveis, sem ordem de certeza:</p>
          <ul className="space-y-2">
            {ranking.slice(0, 3).map((r) => (
              <li key={r.candidato.id} className="rounded-xl bg-surface-2 px-3 py-2.5">
                <p className="flex items-baseline justify-between gap-3"><b>{r.candidato.nome}</b><span className="text-sm text-text-2">{TIPO[r.candidato.tipo].rotulo} · {percentual(r.compat, evidencias)}%</span></p>
                <p className="mt-0.5 text-sm leading-snug text-text-2">{r.candidato.sinalChave ?? r.candidato.resumo}</p>
              </li>
            ))}
          </ul>
          {podePerguntarMais && <Button block icon="seta" onClick={onMaisPerguntas}>Responder mais perguntas</Button>}
          <p className="rounded-xl bg-warn-soft p-3 text-sm text-warn">Quanto mais características você confirmar (corpo, patas, tamanho, cor, onde está), mais firme fica o resultado. Se não conseguir, leve as fotos ao agrônomo.</p>
        </Card>
      ) : (
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tom={t.tom}>{t.rotulo}</Badge>
          <Medidor nivel={confianca} pct={pct} />
        </div>
        <div>
          <p className="text-sm text-text-2">{incerto ? 'Ainda não dá para ter certeza. A causa mais compatível é' : confianca === 'alta' ? 'Muito provavelmente é' : 'Provavelmente é'}</p>
          <h2 className="mt-0.5 text-[1.75rem] leading-tight">{top.nome}</h2>
          {top.cientifico && <p className="italic text-text-2">{top.cientifico}</p>}
        </div>
        <p className="text-[1.0625rem] leading-relaxed">{top.resumo}</p>
        <FotoRef arquivo={fotosDoCandidato(top)} alt={`Foto de referência: ${top.nome}`} className={`${FOTO_CLASSE} rounded-xl ring-1 ring-line`} />
        {incerto && <p className="rounded-xl bg-warn-soft p-3 text-sm text-warn">O que você viu combina com mais de uma causa. Confira os passos abaixo e leve as fotos ao agrônomo.</p>}
      </Card>
      )}

      <Grupo viva={grupo.viva} naoViva={grupo.naoViva} />

      {inconclusivo ? (
        <Card className="space-y-3 bg-brand-soft! ring-brand/20!">
          <h3 className="text-base">O que fazer agora</h3>
          <ol className="space-y-2.5">
            {['Tire uma foto de perto do problema e outra da área toda, e marque o ponto no mapa.', 'Se for bicho, tente pegar um e olhar o corpo, as patas e o tamanho.', 'Leve as fotos ao agrônomo: a decisão de aplicar é dele.'].map((p, i) => (
              <li key={p} className="flex gap-3"><span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-on-brand">{i + 1}</span><span className="leading-snug">{p}</span></li>
            ))}
          </ol>
        </Card>
      ) : (
      <Card className="space-y-3 bg-brand-soft! ring-brand/20!">
        <h3 className="text-base">O que fazer agora</h3>
        <ol className="space-y-2.5">
          {top.proximosPassos.map((p, i) => (
            <li key={p} className="flex gap-3"><span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-on-brand">{i + 1}</span><span className="leading-snug">{p}</span></li>
          ))}
        </ol>
      </Card>
      )}

      {(combina.length > 0 || naoCombina.length > 0 || escolhas.length > 0) && (
        <Secao titulo="Por que o app pensa isso" icone={<Icon name="lupa" size={18} className="text-brand" />}>
          {escolhas.map((c) => (
            <p key={c.id} className="flex gap-2.5 leading-snug">
              <Icon name={c.id === top.id ? 'check' : 'alerta'} size={18} className={`mt-0.5 shrink-0 ${c.id === top.id ? 'text-ok' : 'text-warn'}`} />
              <span><span className="text-text-2">Na comparação de fotos você escolheu</span> <b>{c.nome}</b>{c.id === top.id ? <span className="text-text-2"> · combina com o resultado</span> : <span className="text-text-2"> · mas as respostas apontam para outra causa</span>}</span>
            </p>
          ))}
          {combina.length > 0 && (
            <ul className="space-y-2">
              {combina.map((l) => (
                <li key={l.pergunta} className="flex gap-2.5"><Icon name="check" size={18} className="mt-0.5 shrink-0 text-ok" /><span className="leading-snug"><span className="text-text-2">{l.pergunta}</span> <b>{l.resposta}</b> <span className="text-text-2">· {l.frequencia === 'tipico' ? 'é o típico dessa causa' : 'é comum nessa causa'}</span></span></li>
              ))}
            </ul>
          )}
          {naoCombina.length > 0 && (
            <div className="space-y-2 rounded-xl bg-warn-soft p-3">
              <p className="text-sm font-semibold text-warn">Mas isto não combina muito:</p>
              <ul className="space-y-1.5 text-sm">
                {naoCombina.map((l) => <li key={l.pergunta} className="flex gap-2"><Icon name="alerta" size={16} className="mt-0.5 shrink-0 text-warn" /><span><span className="text-text-2">{l.pergunta}</span> <b>{l.resposta}</b></span></li>)}
              </ul>
            </div>
          )}
        </Secao>
      )}

      {!inconclusivo && (
      <Secao titulo="Como ter certeza" icone={<Icon name="lista" size={18} className="text-brand" />}>
        <ul className="space-y-2">
          {top.comoConfirmar.map((x) => <li key={x} className="flex gap-2.5"><Icon name="check" size={18} className="mt-0.5 shrink-0 text-brand" /><span className="leading-snug">{x}</span></li>)}
        </ul>
        {top.confundeCom.length > 0 && <p className="text-sm text-text-2"><b className="text-text">Pode ser confundido com: </b>{top.confundeCom.join(', ')}.</p>}
        <Link to="/biblioteca/$slug" params={{ slug: top.id }} className="inline-flex min-h-11 items-center gap-1 font-semibold text-brand">Ler mais na Biblioteca<Icon name="seta" size={18} /></Link>
      </Secao>
      )}

      {!inconclusivo && outras.length > 0 && (
        <section aria-labelledby="outras" className="space-y-2">
          <h3 id="outras" className="px-1 text-base">Outras possibilidades</h3>
          {outras.map((r) => {
            const c = r.candidato
            return (
              <details key={c.id} className="group rounded-card bg-surface ring-1 ring-line">
                <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-2.5">
                  <span className="min-w-0 flex-1"><span className="block font-semibold leading-snug">{c.nome}</span><span className="text-sm text-text-2">{TIPO[c.tipo].rotulo} · {percentual(r.compat, evidencias)}%</span></span>
                  <Icon name="baixo" size={18} className="shrink-0 text-text-2 transition group-open:rotate-180" />
                </summary>
                <div className="space-y-3 border-t border-line px-4 py-3">
                  <p className="leading-relaxed">{c.resumo}</p>
                  <div><p className="mb-1 text-sm font-semibold">Para diferenciar</p><ul className="list-disc space-y-1 pl-5 text-sm text-text-2">{c.comoConfirmar.map((x) => <li key={x}>{x}</li>)}</ul></div>
                  <Link to="/biblioteca/$slug" params={{ slug: c.id }} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand">Ler na Biblioteca<Icon name="seta" size={16} /></Link>
                </div>
              </details>
            )
          })}
        </section>
      )}

      <details className="rounded-card bg-surface ring-1 ring-line">
        <summary className="flex min-h-12 cursor-pointer items-center px-4 text-sm font-semibold">Como o app chegou a esse resultado</summary>
        <div className="space-y-2 border-t border-line px-4 py-3 text-sm text-text-2">
          <p>O app compara o que você viu (respostas e fotos) com o perfil de cada causa e a fase da lavoura. O percentual é um índice de certeza: cresce com o número de respostas e nunca passa de 95%. É uma comparação, não uma probabilidade medida nem um laudo.</p>
          <p>Os perfis de sintomas foram montados pela equipe a partir da literatura e ainda estão sendo conferidos. Fontes: {top.fontes.map((f, i) => { const fo = FONTES[f]; return <span key={f}>{i > 0 && ' · '}{'url' in fo && fo.url ? <a className="underline" href={fo.url} target="_blank" rel="noreferrer">{fo.rotulo}</a> : fo.rotulo}</span> })}.</p>
        </div>
      </details>

      <p className="px-1 text-sm text-text-2">Isto é um norte, não a decisão final. Quem decide se aplica algum produto é o agrônomo.</p>

      <div className="sticky bottom-[calc(3.6rem+env(safe-area-inset-bottom,0px))] z-10 -mx-4 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-card sm:border lg:bottom-3">
        <div className="flex gap-2.5">
          <Button className="flex-1" icon="check" onClick={onSalvar}>{rotuloSalvar}</Button>
          <Button variant="secondary" icon="compartilhar" onClick={onEnviar}>Enviar<span className="sr-only"> ao agrônomo</span></Button>
        </div>
        <div className="mt-1 flex justify-center gap-2">
          <Button variant="ghost" className="min-h-10 text-sm" onClick={onVoltar}>Voltar</Button>
          <Button variant="ghost" className="min-h-10 text-sm" icon="refazer" onClick={onRecomecar}>Recomeçar</Button>
        </div>
      </div>
    </div>
  )
}
