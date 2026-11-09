import { Link, Outlet, useLocation } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { Icon, type IconName } from './components/Icon'
import { AtualizacaoPwa } from './components/AtualizacaoPwa'
import { Toast } from './components/Toast'
import { useOnline, useTema } from './hooks/useTema'
import { useSessao } from './state/store'

interface Item { to: '/' | '/talhoes' | '/coleta' | '/diagnostico' | '/biblioteca'; nome: string; icone: IconName }

const ITENS: Item[] = [
  { to: '/', nome: 'Início', icone: 'painel' },
  { to: '/talhoes', nome: 'Talhões', icone: 'mapa' },
  { to: '/coleta', nome: 'Coleta', icone: 'campo' },
  { to: '/diagnostico', nome: 'Diagnóstico', icone: 'diag' },
  { to: '/biblioteca', nome: 'Biblioteca', icone: 'livro' },
]

function Marca({ compacta = false }: { compacta?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 place-items-center rounded-2xl text-on-brand shadow-card" style={{ background: 'var(--hero)' }}><Icon name="folha" size={22} /></span>
      <div className="leading-tight">
        <p className="font-[family-name:var(--font-display)] text-xl font-extrabold tracking-tight">Sentinela</p>
        {!compacta && <p className="text-xs font-medium text-text-2">Monitoramento de soja</p>}
      </div>
    </div>
  )
}

function Conexao() {
  const on = useOnline()
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${on ? 'bg-ok-soft text-ok' : 'bg-warn-soft text-warn'}`}>
      <span aria-hidden className={`size-2 rounded-full ${on ? 'bg-ok' : 'bg-warn'}`} />
      {on ? 'Online' : 'Offline'}
    </span>
  )
}

function BotaoTema() {
  const { alternar } = useTema()
  return (
    <button type="button" onClick={alternar} aria-label="Alternar tema claro e escuro" className="grid size-11 place-items-center rounded-2xl text-text-2 transition hover:bg-surface-2 active:scale-95">
      <Icon name="lua" className="dark:hidden [[data-theme=dark]_&]:hidden" />
      <Icon name="sol" className="hidden dark:block [[data-theme=dark]_&]:block [[data-theme=light]_&]:hidden" />
    </button>
  )
}

function Perfil({ completo = false }: { completo?: boolean }) {
  const nome = useSessao((s) => s.amostrador).trim()
  return (
    <Link to="/perfil" {...(completo ? {} : { 'aria-label': 'Perfil e configurações' })} className={`flex items-center gap-3 rounded-2xl transition hover:bg-surface-2 active:scale-[0.98] data-[status=active]:bg-brand-soft ${completo ? 'min-h-12 px-2 py-1.5' : 'size-11 justify-center'}`}>
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft font-[family-name:var(--font-display)] text-sm font-extrabold text-brand">{nome ? nome[0]!.toUpperCase() : <Icon name="perfil" size={18} />}</span>
      {completo && <span className="min-w-0 leading-tight"><span className="block truncate text-sm font-bold">{nome || 'Seu perfil'}</span><span className="block text-xs text-text-2">Preferências</span></span>}
    </Link>
  )
}

export function Shell() {
  const principal = useRef<HTMLElement>(null)
  const { pathname } = useLocation()
  // A cada troca de tela, o foco vai para o conteúdo (leitores de tela e teclado).
  const primeira = useRef(true)
  useEffect(() => {
    if (primeira.current) { primeira.current = false; return }
    principal.current?.focus({ preventScroll: true })
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17.5rem_1fr]">
      <button type="button" onClick={() => principal.current?.focus()} className="sr-only z-50 rounded-xl bg-brand px-4 py-3 font-semibold text-on-brand focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Pular para o conteúdo</button>

      {/* Barra lateral (desktop) */}
      <aside className="sticky top-0 hidden h-dvh flex-col p-4 lg:flex">
        <div className="flex h-full flex-col rounded-[1.75rem] bg-surface p-5 shadow-card ring-1 ring-line/70">
          <Marca />
          <nav aria-label="Principal" className="mt-8 flex flex-1 flex-col gap-1.5">
            {ITENS.map((i) => (
              <Link key={i.to} to={i.to} activeOptions={{ exact: i.to === '/' }} className="group flex min-h-12 items-center gap-3 rounded-2xl px-3.5 font-semibold text-text-2 transition duration-150 hover:bg-surface-2 hover:text-text data-[status=active]:bg-brand data-[status=active]:text-on-brand data-[status=active]:shadow-card">
                <Icon name={i.icone} size={20} />
                {i.nome}
              </Link>
            ))}
          </nav>
          <div className="space-y-3 border-t border-line pt-4">
            <Perfil completo />
            <div className="flex items-center justify-between"><Conexao /><BotaoTema /></div>
          </div>
        </div>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-col">
        {/* Barra superior (celular/tablet) */}
        <header className="safe-t sticky top-0 z-20 flex items-center justify-between bg-bg/85 px-4 py-2.5 backdrop-blur-xl lg:hidden">
          <Marca compacta />
          <div className="flex items-center gap-0.5">
            <Conexao />
            <BotaoTema />
            <Perfil />
          </div>
        </header>

        <main id="conteudo" ref={principal} tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 pb-36 pt-3 outline-none sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
          <div key={pathname} className="animate-[entrar_.28s_ease-out]"><Outlet /></div>
        </main>

        {/* Navegação inferior flutuante (celular/tablet) */}
        <nav aria-label="Principal" className="safe-b fixed inset-x-0 bottom-0 z-20 px-3 pb-3 lg:hidden">
          <ul className="mx-auto grid max-w-xl grid-cols-5 rounded-[1.75rem] bg-surface/92 p-1.5 shadow-lift ring-1 ring-line/80 backdrop-blur-xl">
            {ITENS.map((i) => (
              <li key={i.to}>
                <Link to={i.to} activeOptions={{ exact: i.to === '/' }} className="group flex min-h-[3.75rem] flex-col items-center justify-center gap-0.5 rounded-[1.25rem] px-0.5 text-[0.6875rem] font-semibold tracking-tight text-text-2 transition duration-150 active:scale-95 data-[status=active]:bg-brand data-[status=active]:text-on-brand">
                  <Icon name={i.icone} size={21} />
                  {i.nome}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <Toast />
      <AtualizacaoPwa />
    </div>
  )
}
