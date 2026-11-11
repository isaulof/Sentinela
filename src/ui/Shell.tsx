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

function Marca() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-xl bg-brand text-on-brand"><Icon name="folha" size={20} /></span>
      <p className="text-subtitulo font-bold tracking-tight">Sentinela</p>
    </div>
  )
}

/** Só aparece quando falta internet: com tudo normal, o app não tem o que avisar. */
function AvisoOffline() {
  const on = useOnline()
  if (on) return null
  return (
    <div role="status" className="safe-t sticky top-0 z-30 print:hidden flex items-center justify-center gap-2 bg-warn-soft px-4 py-2 text-apoio font-medium text-warn lg:col-span-2">
      <Icon name="semwifi" size={16} />Sem internet. Seus dados continuam salvos no aparelho.
    </div>
  )
}

function Perfil() {
  const nome = useSessao((s) => s.amostrador).trim()
  return (
    <Link to="/perfil" className="flex min-h-12 items-center gap-3 rounded-xl px-2.5 py-1.5 transition hover:bg-surface-2 data-[status=active]:bg-brand-soft">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-apoio font-bold text-brand">{nome ? nome[0]!.toUpperCase() : <Icon name="perfil" size={18} />}</span>
      <span className="min-w-0 leading-tight"><span className="block truncate text-apoio font-semibold">{nome || 'Seu perfil'}</span><span className="block text-rotulo text-text-2">Preferências</span></span>
    </Link>
  )
}

export function Shell() {
  useTema() // aplica o tema salvo ao abrir
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
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr] lg:grid-rows-[auto_1fr] print:block">
      <button type="button" onClick={() => principal.current?.focus()} className="sr-only z-50 print:hidden rounded-xl bg-brand px-4 py-3 font-semibold text-on-brand focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Pular para o conteúdo</button>
      <AvisoOffline />

      {/* Barra lateral (desktop) */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface p-4 lg:row-span-2 lg:flex print:hidden">
        <Marca />
        <nav aria-label="Principal" className="mt-8 flex flex-1 flex-col gap-1">
          {ITENS.map((i) => (
            <Link key={i.to} to={i.to} activeOptions={{ exact: i.to === '/' }} className="flex min-h-11 items-center gap-3 rounded-xl px-3 font-medium text-text-2 transition hover:bg-surface-2 hover:text-text data-[status=active]:bg-brand-soft data-[status=active]:font-semibold data-[status=active]:text-brand">
              <Icon name={i.icone} size={20} />
              {i.nome}
            </Link>
          ))}
        </nav>
        <div className="border-t border-line pt-3"><Perfil /></div>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-col">
        <main id="conteudo" ref={principal} tabIndex={-1} className="safe-t mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 outline-none sm:px-6 lg:px-10 lg:pb-12 lg:pt-8 print:max-w-none print:p-0">
          <div key={pathname} className="animate-[entrar_.2s_ease-out]"><Outlet /></div>
        </main>

        {/* Abas inferiores (celular/tablet) */}
        <nav aria-label="Principal" className="safe-b fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur lg:hidden print:hidden">
          <ul className="mx-auto grid max-w-xl grid-cols-5">
            {ITENS.map((i) => (
              <li key={i.to}>
                <Link to={i.to} activeOptions={{ exact: i.to === '/' }} className="group relative flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 text-[0.6875rem] font-medium text-text-2 transition active:bg-surface-2 data-[status=active]:font-semibold data-[status=active]:text-brand">
                  <span aria-hidden className="absolute inset-x-5 top-0 h-0.5 rounded-b bg-brand opacity-0 group-data-[status=active]:opacity-100" />
                  <Icon name={i.icone} size={22} />
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
