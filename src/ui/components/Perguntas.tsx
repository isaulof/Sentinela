import { useEffect, useRef, type ReactNode } from 'react'
import type { PerguntaFunil } from '@/domain/funil'
import { FotoRef } from './FotoRef'
import { Icon, type IconName } from './Icon'
import { Button } from './kit'

interface Props {
  pergunta: PerguntaFunil
  /** Triagem (3 perguntas fixas) ou detalhes (perguntas do ramo escolhido). */
  fase: 'triagem' | 'detalhes'
  /** 1 a 3 na triagem; contagem de detalhes depois. */
  n: number
  /** 0 a 1: quanto da incerteza já foi eliminada. */
  progresso: number
  restantes: number
  respondidas: number
  /** Contexto do achado (lavoura, ponto, fotos), mostrado acima da pergunta. */
  contexto?: ReactNode
  onResponder: (opcaoId: string) => void
  onPular: () => void
  onVoltar: () => void
  onVerResultado: () => void
}

const etapa = (respondidas: number, progresso: number) => (respondidas === 0 ? 'Vamos começar' : progresso < 0.34 ? 'Começando a entender' : progresso < 0.67 ? 'Afunilando as causas' : 'Quase lá')
const rotuloEtapa = (fase: 'triagem' | 'detalhes', n: number) => (fase === 'triagem' ? `Triagem · ${n} de 3` : `Detalhes · ${n}`)

/** Uma pergunta por tela, com respostas grandes e fáceis de tocar. Tocar numa resposta já avança. */
export function Perguntas({ pergunta, fase, n, progresso, restantes, respondidas, contexto, onResponder, onPular, onVoltar, onVerResultado }: Props) {
  const titulo = useRef<HTMLHeadingElement>(null)
  // A cada pergunta nova: volta ao topo e leva o foco para o enunciado (leitor de tela e teclado).
  useEffect(() => {
    window.scrollTo(0, 0)
    titulo.current?.focus({ preventScroll: true })
  }, [pergunta.id])

  const duasColunas = pergunta.opcoes.length >= 4
  const pct = Math.round(Math.max(0.04, progresso) * 100)

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-4 flex items-center gap-1">
        <button type="button" onClick={onVoltar} aria-label={respondidas === 0 ? 'Voltar ao início do diagnóstico' : 'Voltar para a pergunta anterior'} className="-ml-2 grid size-11 shrink-0 place-items-center rounded-full text-text-2 transition active:bg-surface-2"><Icon name="voltar" size={24} /></button>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-semibold">{rotuloEtapa(fase, n)}</span>
            <span className="text-text-2">{etapa(respondidas, progresso)}</span>
          </div>
          <div role="progressbar" aria-label="Andamento do diagnóstico" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-valuetext={etapa(respondidas, progresso)} className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </header>

      {contexto && <div className="mb-4">{contexto}</div>}
      {fase === 'triagem' && n === 1 && <p className="mb-3 text-sm text-text-2">Três perguntas rápidas para saber por onde começar. Depois vêm só as perguntas que importam para o seu caso.</p>}

      <div key={pergunta.id} className="animate-[entrar_.22s_ease-out]">
        <h2 ref={titulo} tabIndex={-1} className="text-2xl leading-tight outline-none">{pergunta.texto}</h2>
        {pergunta.dica && (
          <p className="mt-2.5 flex gap-2.5 rounded-xl bg-info-soft px-3 py-2.5 text-sm leading-snug text-info"><Icon name="info" size={20} className="mt-0.5 shrink-0" /><span>{pergunta.dica}</span></p>
        )}

        <div className={`mt-4 grid gap-2.5 ${duasColunas ? 'grid-cols-2' : 'grid-cols-1'} sm:grid-cols-2`}>
          {pergunta.opcoes.map((o) => (
            <button
              key={o.id} type="button" onClick={() => onResponder(o.id)}
              className={`flex rounded-card bg-surface p-3.5 text-left ring-1 ring-line transition active:scale-[0.98] active:bg-brand-soft ${duasColunas ? 'min-h-[6.5rem] flex-col items-start gap-2 sm:min-h-0 sm:flex-row sm:items-center sm:gap-3.5' : 'min-h-[4.75rem] flex-row items-center gap-3.5'}`}
            >
              <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand-soft text-brand">
                <FotoRef arquivo={`resposta-${pergunta.id}-${o.id}.jpg`} alt="" className="size-full object-cover" fallback={o.cor ? <span aria-hidden className="size-7 rounded-full ring-1 ring-black/25" style={{ background: o.cor }} /> : <Icon name={(o.icone ?? 'folha') as IconName} size={24} />} />
              </span>
              <span className="min-w-0">
                <span className="block text-base font-semibold leading-snug">{o.rotulo}</span>
                {o.detalhe && <span className="mt-0.5 block text-sm leading-snug text-text-2">{o.detalhe}</span>}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-col items-stretch gap-1">
          <Button variant="ghost" onClick={onPular}>Não consigo ver isso</Button>
          {respondidas >= 3 && <Button variant="secondary" onClick={onVerResultado}>Ver o que já deu para descobrir</Button>}
        </div>
        <p className="mt-3 text-center text-sm text-text-2">{restantes === 1 ? 'Só resta 1 possibilidade' : `Ainda são ${restantes} possibilidades`}</p>
      </div>
    </div>
  )
}
