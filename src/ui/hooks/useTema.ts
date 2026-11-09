import { useCallback, useEffect, useState } from 'react'

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

export function useTema() {
  const [tema, setTema] = useState<Tema>(ler)
  useEffect(() => aplicarTema(tema), [tema])
  const alternar = useCallback(() => {
    setTema((atual) => {
      const escuroAgora = atual === 'escuro' || (atual === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches)
      const prox: Tema = escuroAgora ? 'claro' : 'escuro'
      try { localStorage.setItem(CHAVE, prox) } catch { /* armazenamento indisponível: segue sem persistir */ }
      return prox
    })
  }, [])
  return { tema, alternar }
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
