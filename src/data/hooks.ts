import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'

/** Leituras reativas: a tela atualiza sozinha quando o IndexedDB muda. */
export const useTalhoes = () => useLiveQuery(() => db.talhoes.orderBy('nome').toArray(), [])
export const usePlano = (talhaoId: string | null | undefined) =>
  useLiveQuery(() => (talhaoId ? db.planos.get(talhaoId) : undefined), [talhaoId])
export const useRegistros = (talhaoId: string | null | undefined) =>
  useLiveQuery(() => (talhaoId ? db.registros.where('talhaoId').equals(talhaoId).sortBy('criadoEm') : []), [talhaoId])
export const usePendencias = (talhaoId: string | null | undefined) =>
  useLiveQuery(() => (talhaoId ? db.pendencias.where('talhaoId').equals(talhaoId).sortBy('criadoEm') : []), [talhaoId])
export const useTodosRegistros = () => useLiveQuery(() => db.registros.orderBy('criadoEm').toArray(), [])
export const usePlanos = () => useLiveQuery(() => db.planos.toArray(), [])
export const useOrdens = () => useLiveQuery(() => db.ordens.orderBy('id').toArray(), [])
export const useTodasPendencias = () => useLiveQuery(() => db.pendencias.toArray(), [])
export const useFazenda = () => useLiveQuery(async () => (await db.fazendas.get('fazenda')) ?? null, [])
