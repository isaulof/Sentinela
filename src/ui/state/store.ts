import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface Sessao {
  talhaoId: string | null
  amostrador: string
  setTalhao: (id: string | null) => void
  setAmostrador: (nome: string) => void
  /** Ponto para abrir no Campo (vindo de uma ordem de checagem). */
  pontoFoco: string | null
  setPontoFoco: (id: string | null) => void
  /** Ponto (e achado pendente) que o Diagnóstico deve atender; vem da Coleta. */
  /** Visão aberta em Talhões: configurar o plano ou ver os resultados. */
  talhaoAba: 'plano' | 'resultados'
  setTalhaoAba: (a: 'plano' | 'resultados') => void
  diagnosticoPara: { talhaoId: string; pontoId: string; pendenciaId: string | null } | null
  setDiagnosticoPara: (v: Sessao['diagnosticoPara']) => void
}

/** Estado de sessão (preferências). Os dados de domínio ficam no IndexedDB, nunca aqui. */
export const useSessao = create<Sessao>()(
  persist(
    (set) => ({
      talhaoId: null,
      amostrador: '',
      setTalhao: (talhaoId) => set({ talhaoId }),
      setAmostrador: (amostrador) => set({ amostrador }),
      pontoFoco: null,
      setPontoFoco: (pontoFoco) => set({ pontoFoco }),
      talhaoAba: 'resultados',
      setTalhaoAba: (talhaoAba) => set({ talhaoAba }),
      diagnosticoPara: null,
      setDiagnosticoPara: (diagnosticoPara) => set({ diagnosticoPara }),
    }),
    {
      name: 'sentinela:sessao',
      // A aba aberta no talhão não é preferência: cada visita começa no mapa inteligente.
      partialize: ({ talhaoAba: _aba, pontoFoco: _foco, diagnosticoPara: _diag, ...resto }) => resto,
      storage: createJSONStorage(() => ({
        getItem: (k) => { try { return localStorage.getItem(k) } catch { return null } },
        setItem: (k, v) => { try { localStorage.setItem(k, v) } catch { /* sem armazenamento: segue em memória */ } },
        removeItem: (k) => { try { localStorage.removeItem(k) } catch { /* idem */ } },
      })),
    },
  ),
)
