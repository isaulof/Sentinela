import { useLiveQuery } from 'dexie-react-hooks'
import { ativos } from '@/domain/registro'
import { db } from './db'

/** Leituras reativas: a tela atualiza sozinha quando o IndexedDB muda. */
export const useTalhoes = () => useLiveQuery(() => db.talhoes.orderBy('nome').toArray(), [])
export const usePlano = (talhaoId: string | null | undefined) =>
  useLiveQuery(() => (talhaoId ? db.planos.get(talhaoId) : undefined), [talhaoId])
export const useRegistros = (talhaoId: string | null | undefined) =>
  useLiveQuery(async () => (talhaoId ? ativos(await db.registros.where('talhaoId').equals(talhaoId).sortBy('criadoEm')) : []), [talhaoId])
export const usePendencias = (talhaoId: string | null | undefined) =>
  useLiveQuery(() => (talhaoId ? db.pendencias.where('talhaoId').equals(talhaoId).sortBy('criadoEm') : []), [talhaoId])
export const useTodosRegistros = () => useLiveQuery(async () => ativos(await db.registros.orderBy('criadoEm').toArray()), [])
/** Todas as versões dos registros de um ponto (inclusive substituídas e anuladas), para a ficha e a auditoria. */
export const useVersoesDoPonto = (talhaoId: string | null | undefined, pontoId: string | null | undefined) =>
  useLiveQuery(async () => (talhaoId && pontoId ? (await db.registros.where('[talhaoId+pontoId]').equals([talhaoId, pontoId]).toArray()).sort((a, b) => a.criadoEm.localeCompare(b.criadoEm) || (a.versao ?? 1) - (b.versao ?? 1)) : []), [talhaoId, pontoId])
/** Todas as versões de todos os registros do talhão (inclusive substituídas e anuladas): exportação e auditoria. */
export const useRegistrosComHistorico = (talhaoId: string | null | undefined) =>
  useLiveQuery(() => (talhaoId ? db.registros.where('talhaoId').equals(talhaoId).sortBy('criadoEm') : []), [talhaoId])
export const usePlanos = () => useLiveQuery(() => db.planos.toArray(), [])
export const useOrdens = () => useLiveQuery(() => db.ordens.orderBy('id').toArray(), [])
export const useTodasPendencias = () => useLiveQuery(() => db.pendencias.toArray(), [])
export const useFazenda = () => useLiveQuery(async () => (await db.fazendas.get('fazenda')) ?? null, [])
