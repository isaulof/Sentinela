import { create } from 'zustand'

interface T { msg: string | null; tom: 'ok' | 'erro'; mostrar: (m: string, tom?: 'ok' | 'erro') => void }
let timer: ReturnType<typeof setTimeout> | undefined
export const useToast = create<T>((set) => ({
  msg: null,
  tom: 'ok',
  mostrar: (msg, tom = 'ok') => {
    clearTimeout(timer)
    set({ msg, tom })
    timer = setTimeout(() => set({ msg: null }), 3200)
  },
}))
