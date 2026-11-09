import { useEffect, useState, useSyncExternalStore } from 'react'

export type Tema = 'auto' | 'claro' | 'escuro'
const CHAVE = 'sentinela:tema'

function ler(): Tema {
  try {
    const v = localStorage.getItem(CHAVE)
    return v === 'claro' || v === 'escuro' ? v : 'auto'
  } catch {
    return 'auto'
  }
}

export function aplicarTema(t: Tema): void {
  const el = document.documentElement
  if (t === 'auto') el.removeAttribute('data-theme')
  else el.setAttribute('data-theme', t === 'claro' ? 'light' : 'dark')
}

let atual: Tema = ler()
const ouvintes = new Set<() => void>()
const assinar = (f: () => void) => { ouvintes.add(f); return () => { ouvintes.delete(f) } }

function definirTema(t: Tema) {
  atual = t
  aplicarTema(t)
  try { if (t === 'auto') localStorage.removeItem(CHAVE); else localStorage.setItem(CHAVE, t) } catch { /* armazenamento indisponível: segue sem persistir */ }
  ouvintes.forEach((f) => f())
}

/** Tema compartilhado: o Shell aplica na abertura e o Perfil troca; todos leem o mesmo valor. */
export function useTema() {
  const tema = useSyncExternalStore(assinar, () => atual, () => 'auto' as Tema)
  useEffect(() => aplicarTema(tema), [tema])
  return { tema, definir: definirTema }
}

export function useOnline(): boolean {
  const [on, setOn] = useState(() => navigator.onLine)
  useEffect(() => {
    const a = () => setOn(true)
    const b = () => setOn(false)
    addEventListener('online', a)
    addEventListener('offline', b)
    return () => { removeEventListener('online', a); removeEventListener('offline', b) }
  }, [])
  return on
}
