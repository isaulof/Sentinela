import clsx from 'clsx'
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { Icon, type IconName } from './Icon'

/* ─ Button ─ */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
const V: Record<Variant, string> = {
  primary: 'bg-brand text-on-brand hover:bg-brand-strong shadow-card',
  secondary: 'bg-surface text-text hover:bg-surface-2 ring-1 ring-inset ring-line shadow-sm',
  ghost: 'text-text-2 hover:bg-surface-2',
  danger: 'bg-danger text-on-brand hover:opacity-90',
}
export function Button({ variant = 'primary', block, icon, className, children, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; block?: boolean; icon?: IconName }) {
  return (
    <button
      type="button"
      {...p}
      className={clsx(
        'inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-5 font-semibold transition duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45',
        V[variant], block && 'w-full', className,
      )}
    >
      {icon && <Icon name={icon} size={20} />}
      {children}
    </button>
  )
}

/* ─ Card ─ */
export function Card({ className, ...p }: HTMLAttributes<HTMLDivElement>) {
  return <div {...p} className={clsx('rounded-card bg-surface p-4 ring-1 ring-line sm:p-5', className)} />
}

/* ─ Badge: estados agronômicos têm cor E texto (nunca só cor) ─ */
export type Tom = 'ok' | 'warn' | 'danger' | 'info' | 'neutral'
const T: Record<Tom, string> = {
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  neutral: 'bg-surface-2 text-text-2',
}
export function Badge({ tom = 'neutral', icon, children }: { tom?: Tom; icon?: IconName; children: ReactNode }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.8125rem] font-semibold', T[tom])}>
      {icon && <Icon name={icon} size={15} />}
      {children}
    </span>
  )
}

/* ─ Stat ─ */
export function Stat({ rotulo, valor, detalhe, tom = 'neutral' }: { rotulo: string; valor: ReactNode; detalhe?: ReactNode; tom?: Tom }) {
  return (
    <Card>
      <p className="text-apoio font-medium text-text-2">{rotulo}</p>
      <p className={clsx('mt-1 text-titulo font-bold tracking-tight', tom === 'danger' && 'text-danger', tom === 'warn' && 'text-warn', tom === 'ok' && 'text-ok')}>{valor}</p>
      {detalhe && <p className="mt-1 text-apoio text-text-2">{detalhe}</p>}
    </Card>
  )
}

/* ─ Campos ─ */
/** `grupo`: o conteúdo é um conjunto de botões (não um único controle), então não pode ficar dentro de um <label>. */
export function Campo({ rotulo, ajuda, erro, grupo, children }: { rotulo: string; ajuda?: string; erro?: string; grupo?: boolean; children: ReactNode }) {
  const Raiz = grupo ? 'div' : 'label'
  return (
    <Raiz className="block" {...(grupo ? { role: 'group', 'aria-label': rotulo } : {})}>
      <span className="mb-1.5 block text-apoio font-semibold">{rotulo}</span>
      {children}
      {erro ? <span className="mt-1 block text-apoio text-danger" role="alert">{erro}</span> : ajuda ? <span className="mt-1 block text-apoio text-text-2">{ajuda}</span> : null}
    </Raiz>
  )
}
const CAMPO = 'min-h-12 w-full rounded-xl border border-line bg-surface-2 px-4 text-corpo text-text placeholder:text-text-2/70 focus:border-brand'
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={clsx(CAMPO, p.className)} />
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={clsx(CAMPO, p.className)} />

/* ─ Segmented (escolha única, alvo de toque >= 44px) ─ */
export function Segmentado<T extends string>({ valor, opcoes, onChange, rotulo }: { valor: T; opcoes: { id: T; nome: string; desabilitado?: boolean }[]; onChange: (v: T) => void; rotulo: string }) {
  return (
    <div role="radiogroup" aria-label={rotulo} className="flex flex-wrap gap-2">
      {opcoes.map((o) => (
        <button
          key={o.id} type="button" role="radio" aria-checked={valor === o.id} disabled={o.desabilitado}
          onClick={() => onChange(o.id)}
          className={clsx(
            'min-h-11 rounded-xl border px-4 text-apoio font-semibold transition disabled:opacity-40',
            valor === o.id ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface-2 text-text hover:bg-line',
          )}
        >
          {o.nome}
        </button>
      ))}
    </div>
  )
}

/* ─ Estado vazio ─ */
export function Vazio({ icone, titulo, texto, acao }: { icone: IconName; titulo: string; texto: string; acao?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-card bg-surface px-6 py-12 text-center ring-1 ring-line">
      <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand"><Icon name={icone} size={30} /></span>
      <h2 className="text-subtitulo">{titulo}</h2>
      <p className="mt-1 max-w-sm text-text-2">{texto}</p>
      {acao && <div className="mt-5">{acao}</div>}
    </div>
  )
}

export function Titulo({ children, sub, acao }: { children: ReactNode; sub?: ReactNode; acao?: ReactNode }) {
  return (
    <header className="mb-4 flex items-start justify-between gap-3 sm:mb-6">
      <div>
        <h1 className="text-titulo">{children}</h1>
        {sub && <p className="mt-1 text-corpo text-text-2 sm:mt-1.5">{sub}</p>}
      </div>
      {acao}
    </header>
  )
}

/* ─ Folha (dialog nativo): bottom sheet no celular, modal centralizado no desktop ─ */
import { useEffect, useId, useRef } from 'react'

export function Folha({ aberta, onFechar, titulo, children }: { aberta: boolean; onFechar: () => void; titulo: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const idTitulo = useId()
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (aberta && !d.open) d.showModal()
    if (!aberta && d.open) d.close()
  }, [aberta])
  return (
    <dialog
      ref={ref}
      aria-labelledby={idTitulo}
      // Só conta como "fechar" quando foi a pessoa (Esc, toque fora, X). Fechamento programático (troca de gaveta) não pode zerar a próxima.
      onClose={() => { if (aberta) onFechar() }}
      onClick={(e) => { if (e.target === ref.current) onFechar() }}
      className="m-0 mt-auto w-full max-w-none rounded-t-3xl border-0 bg-bg p-0 text-text shadow-lift backdrop:bg-black/55 backdrop:backdrop-blur-[2px] open:animate-[subir_.2s_ease-out] sm:m-auto sm:max-w-xl sm:rounded-3xl"
    >
      <div className="flex max-h-[92dvh] flex-col">
        <div aria-hidden className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line sm:hidden" />
        <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-3">
          <h2 id={idTitulo} className="text-subtitulo">{titulo}</h2>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="grid size-11 place-items-center rounded-xl text-text-2 hover:bg-surface-2"><Icon name="x" /></button>
        </div>
        <div className="safe-b overflow-y-auto px-5 py-4">{aberta ? children : null}</div>
      </div>
    </dialog>
  )
}
