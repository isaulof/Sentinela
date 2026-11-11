import { useEffect, useState } from 'react'
import { mensagemDeGravacao } from '@/data/erros'
import { repo } from '@/data/repo'
import { useToast } from '../state/toast'
import { Icon } from './Icon'

export interface DadosConfirmacao {
  /** ids dos registros gravados (todos entram no "Desfazer"). */
  ids: string[]
  pontoId: string
  ordem: number
  titulo: string
  linhas: string[]
}

interface Props {
  dados: DadosConfirmacao
  autor: string
  /** Segundos em que o "Desfazer" fica disponível. */
  janelaS?: number
  onFicha: () => void
  onOutro?: () => void
  onSeguir?: () => void
  onFechar: () => void
  className?: string
}

/**
 * Cartão que fica na tela depois de salvar: mostra o que foi gravado (com data, hora e nível), permite desfazer por 30 s,
 * abrir a ficha do ponto, registrar outro achado no mesmo ponto ou seguir. O registro desfeito é anulado, nunca apagado.
 */
export function ConfirmacaoRegistro({ dados, autor, janelaS = 30, onFicha, onOutro, onSeguir, onFechar, className = '' }: Props) {
  const mostrar = useToast((s) => s.mostrar)
  // O cartão é remontado a cada novo registro (key no pai), então o relógio começa aqui.
  const [inicio] = useState(() => Date.now())
  const [agora, setAgora] = useState(inicio)
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const restante = Math.max(0, janelaS - Math.floor((agora - inicio) / 1000))

  async function desfazer() {
    try {
      const n = await repo.anularRegistros(dados.ids, { autor })
      mostrar(n > 0 ? 'Registro desfeito. Continua guardado na ficha do ponto.' : 'Nada para desfazer.', n > 0 ? 'ok' : 'erro')
      onFechar()
    } catch (e) {
      mostrar(mensagemDeGravacao(e, 'Não foi possível desfazer. Tente de novo.'), 'erro')
    }
  }

  return (
    <section aria-label="Registro salvo" className={`rounded-2xl bg-surface p-3.5 shadow-lift ring-1 ring-brand/40 ${className}`}>
      <div className="flex items-start gap-2.5">
        <span aria-hidden className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-brand text-on-brand"><Icon name="check" size={16} /></span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug">{dados.titulo}</p>
          <ul className="mt-0.5 space-y-0.5 text-apoio text-text-2">{dados.linhas.map((l) => <li key={l}>{l}</li>)}</ul>
        </div>
        <button type="button" onClick={onFechar} aria-label="Fechar confirmação" className="grid size-9 shrink-0 place-items-center rounded-full text-text-2 hover:bg-surface-2"><Icon name="x" size={18} /></button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {restante > 0 && <button type="button" onClick={() => void desfazer()} className="inline-flex min-h-11 items-center rounded-xl border border-line px-4 text-apoio font-semibold hover:bg-surface-2">Desfazer <span className="ml-1 tabular-nums text-text-2">({restante} s)</span></button>}
        <button type="button" onClick={onFicha} className="inline-flex min-h-11 items-center rounded-xl border border-line px-4 text-apoio font-semibold hover:bg-surface-2">Ver ficha</button>
        {onOutro && <button type="button" onClick={onOutro} className="inline-flex min-h-11 items-center rounded-xl border border-line px-4 text-apoio font-semibold hover:bg-surface-2">Outro achado aqui</button>}
        {onSeguir && <button type="button" onClick={onSeguir} className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-brand px-4 text-apoio font-semibold text-on-brand">Próximo ponto<Icon name="seta" size={16} /></button>}
      </div>
    </section>
  )
}
