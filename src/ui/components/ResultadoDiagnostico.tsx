import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { explicar, ROTULO_CONFIANCA, type Candidato, type Classificado, type Confianca, type Respostas } from '@/domain/funil'
import { LISTA_ALVOS } from '@/knowledge/alvos'
import { PERGUNTAS } from '@/knowledge/diagnostico'
import { FONTES } from '@/knowledge/fontes'
import { slugDe, slugDeNome } from '../pages/slug'
import { FotoRef } from './FotoRef'
import { Icon } from './Icon'
import { Badge, Button, Card, type Tom } from './kit'

const TIPO: Record<Candidato['tipo'], { rotulo: string; tom: Tom }> = {
  praga: { rotulo: 'Praga', tom: 'warn' },
  doenca: { rotulo: 'Doença', tom: 'danger' },
  abiotico: { rotulo: 'Clima, solo ou manejo', tom: 'info' },
}
const slugCandidato = (c: Candidato) => (c.alvo ? slugDe(LISTA_ALVOS.find((a) => a.id === c.alvo)!) : slugDeNome(c.nome))

/** Medidor de 3 níveis: palavra + barras, nunca só cor. */
function Medidor({ nivel }: { nivel: Confianca }) {
  const cheias = nivel === 'alta' ? 3 : nivel === 'media' ? 2 : 1
  const cor = nivel === 'alta' ? 'bg-ok' : nivel === 'media' ? 'bg-warn' : 'bg-text-2/50'
  return (
    <div className="flex items-center gap-2.5" role="img" aria-label={`Confiança: ${ROTULO_CONFIANCA[nivel]}`}>
      <span aria-hidden className="flex gap-1">{[1, 2, 3].map((i) => <span key={i} className={`h-2 w-7 rounded-full ${i <= cheias ? cor : 'bg-surface-2'}`} />)}</span>
      <span className="text-sm font-semibold">{ROTULO_CONFIANCA[nivel]}</span>
    </div>
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
  /** Texto do botão principal: "Salvar no ponto 3" ou "Salvar em um ponto". */
  rotuloSalvar: string
  onSalvar: () => void
  onEnviar: () => void
  onVoltar: () => void
  onRecomecar: () => void
}

/** Resultado em linguagem de campo: o que é, o que fazer agora, por que o app pensa assim e como confirmar. */
export function ResultadoDiagnostico({ ranking, confianca, respostas, rotuloSalvar, onSalvar, onEnviar, onVoltar, onRecomecar }: Props) {
  const top = ranking[0]!.candidato
  const t = TIPO[top.tipo]
  const incerto = confianca === 'baixa'
  const { combina, naoCombina } = explicar(top, PERGUNTAS, respostas)
  const outras = ranking.slice(1, 4).filter((r) => r.compat >= 0.05)

  return (
    <div className="mx-auto max-w-2xl space-y-4" aria-live="polite">
      <h1 className="sr-only">Resultado do diagnóstico</h1>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tom={t.tom}>{t.rotulo}</Badge>
          <Medidor nivel={confianca} />
        </div>
        <div>
          <p className="text-sm text-text-2">{incerto ? 'Ainda não dá para ter certeza. A causa mais compatível é' : confianca === 'alta' ? 'Muito provavelmente é' : 'Provavelmente é'}</p>
          <h2 className="mt-0.5 text-[1.75rem] leading-tight">{top.nome}</h2>
          {top.cientifico && <p className="italic text-text-2">{top.cientifico}</p>}
        </div>
        <p className="text-[1.0625rem] leading-relaxed">{top.resumo}</p>
        <FotoRef arquivo={`${slugCandidato(top)}.jpg`} alt={`Foto de referência: ${top.nome}`} className="aspect-video w-full rounded-xl object-cover ring-1 ring-line" />
        {incerto && <p className="rounded-xl bg-warn-soft p-3 text-sm text-warn">O que você viu combina com mais de uma causa. Confira os passos abaixo e leve as fotos ao agrônomo.</p>}
      </Card>

      <Card className="space-y-3 bg-brand-soft! ring-brand/20!">
        <h3 className="text-base">O que fazer agora</h3>
        <ol className="space-y-2.5">
          {top.proximosPassos.map((p, i) => (
            <li key={p} className="flex gap-3"><span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-on-brand">{i + 1}</span><span className="leading-snug">{p}</span></li>
          ))}
        </ol>
      </Card>

      {(combina.length > 0 || naoCombina.length > 0) && (
        <Secao titulo="Por que o app pensa isso" icone={<Icon name="lupa" size={18} className="text-brand" />}>
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

      <Secao titulo="Como ter certeza" icone={<Icon name="lista" size={18} className="text-brand" />}>
        <ul className="space-y-2">
          {top.comoConfirmar.map((x) => <li key={x} className="flex gap-2.5"><Icon name="check" size={18} className="mt-0.5 shrink-0 text-brand" /><span className="leading-snug">{x}</span></li>)}
        </ul>
        {top.confundeCom.length > 0 && <p className="text-sm text-text-2"><b className="text-text">Pode ser confundido com: </b>{top.confundeCom.join(', ')}.</p>}
        {top.alvo && <Link to="/biblioteca/$slug" params={{ slug: slugCandidato(top) }} className="inline-flex min-h-11 items-center gap-1 font-semibold text-brand">Ler mais na Biblioteca<Icon name="seta" size={18} /></Link>}
      </Secao>

      {outras.length > 0 && (
        <section aria-labelledby="outras" className="space-y-2">
          <h3 id="outras" className="px-1 text-base">Outras possibilidades</h3>
          {outras.map((r) => {
            const c = r.candidato
            return (
              <details key={c.id} className="group rounded-card bg-surface ring-1 ring-line">
                <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-2.5">
                  <span className="min-w-0 flex-1"><span className="block font-semibold leading-snug">{c.nome}</span><span className="text-sm text-text-2">{TIPO[c.tipo].rotulo}</span></span>
                  <Icon name="baixo" size={18} className="shrink-0 text-text-2 transition group-open:rotate-180" />
                </summary>
                <div className="space-y-3 border-t border-line px-4 py-3">
                  <p className="leading-relaxed">{c.resumo}</p>
                  <div><p className="mb-1 text-sm font-semibold">Para diferenciar</p><ul className="list-disc space-y-1 pl-5 text-sm text-text-2">{c.comoConfirmar.map((x) => <li key={x}>{x}</li>)}</ul></div>
                  {c.alvo && <Link to="/biblioteca/$slug" params={{ slug: slugCandidato(c) }} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand">Ler na Biblioteca<Icon name="seta" size={16} /></Link>}
                </div>
              </details>
            )
          })}
        </section>
      )}

      <details className="rounded-card bg-surface ring-1 ring-line">
        <summary className="flex min-h-12 cursor-pointer items-center px-4 text-sm font-semibold">Como o app chegou a esse resultado</summary>
        <div className="space-y-2 border-t border-line px-4 py-3 text-sm text-text-2">
          <p>O app compara o que você viu com o perfil de cada causa e a fase da lavoura. É uma comparação, não uma probabilidade medida nem um laudo.</p>
          <p>Os perfis de sintomas foram montados pela equipe a partir da literatura e ainda estão sendo conferidos. Fontes: {top.fontes.map((f, i) => { const fo = FONTES[f]; return <span key={f}>{i > 0 && ' · '}{'url' in fo && fo.url ? <a className="underline" href={fo.url} target="_blank" rel="noreferrer">{fo.rotulo}</a> : fo.rotulo}</span> })}.</p>
        </div>
      </details>

      <p className="px-1 text-sm text-text-2">Isto é uma pista, não um laudo. Quem decide se aplica algum produto é o agrônomo.</p>

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
