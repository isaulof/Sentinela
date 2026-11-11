import type { Fazenda, OrdemChecagem, Pendencia, PlanoSalvo, Talhao } from '@/domain/entidades'
import type { Registro } from '@/domain/registro'
import { mediaHistorica, validarRegistro, type ContextoValidacao, type ResultadoValidacao } from '@/domain/validation'
import type { AlvoId } from '@/knowledge/alvos'
import { db as dbPadrao, type SentinelaDB } from './db'

/** randomUUID só existe em contexto seguro (HTTPS/localhost); getRandomValues funciona também em HTTP na rede local. */
export const novoId = (prefixo: string): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(4))
  return `${prefixo}-${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`
}

/** Repositório: a única porta de entrada para o IndexedDB. Recebe o db por injeção (testável). */
export function criarRepo(db: SentinelaDB = dbPadrao) {
  return {
    // Talhões e planos
    salvarTalhao: (t: Talhao) => db.talhoes.put(t),
    listarTalhoes: () => db.talhoes.orderBy('nome').toArray(),
    obterTalhao: (id: string) => db.talhoes.get(id),
    async apagarTalhao(id: string) {
      await db.transaction('rw', [db.talhoes, db.planos, db.registros, db.ordens, db.pendencias], async () => {
        const regs = await db.registros.where('talhaoId').equals(id).toArray()
        await db.registros.bulkDelete(regs.map((r) => r.id))
        await db.ordens.where('talhaoId').equals(id).delete()
        await db.pendencias.where('talhaoId').equals(id).delete()
        await db.planos.delete(id)
        await db.talhoes.delete(id)
      })
    },
    salvarPlano: (p: PlanoSalvo) => db.planos.put(p),
    obterPlano: (talhaoId: string) => db.planos.get(talhaoId),

    // Registros
    listarRegistros: (talhaoId: string) => db.registros.where('talhaoId').equals(talhaoId).sortBy('criadoEm'),
    listarTodosRegistros: () => db.registros.orderBy('criadoEm').toArray(),
    async historicoDoAlvo(talhaoId: string, alvo: AlvoId) {
      return db.registros.where('[talhaoId+alvo]').equals([talhaoId, alvo]).toArray()
    },
    /** Valida e só então grava. Retorna o resultado; `gravado` indica se foi persistido. */
    async salvarRegistro(r: Registro, ctx: Omit<ContextoValidacao, 'mediaHistorica'>): Promise<ResultadoValidacao & { gravado: boolean }> {
      const hist = await db.registros.where('[talhaoId+alvo]').equals([r.talhaoId, r.alvo]).toArray()
      const v = validarRegistro(r, { ...ctx, mediaHistorica: mediaHistorica(hist.map((h) => h.quantidade)) })
      if (!v.ok) return { ...v, gravado: false }
      await db.registros.put(r)
      return { ...v, gravado: true }
    },
    apagarRegistro: (id: string) => db.registros.delete(id),

    // Ordens de checagem
    salvarOrdem: (o: OrdemChecagem) => db.ordens.put(o),
    listarOrdens: (talhaoId?: string) => (talhaoId ? db.ordens.where('talhaoId').equals(talhaoId).toArray() : db.ordens.toArray()),

    // Achados pendentes de diagnóstico
    salvarPendencia: (p: Pendencia) => db.pendencias.put(p),
    listarPendencias: (talhaoId: string) => db.pendencias.where('talhaoId').equals(talhaoId).sortBy('criadoEm'),
    apagarPendencia: (id: string) => db.pendencias.delete(id),

    // Fazenda (uma por aparelho)
    obterFazenda: () => db.fazendas.get('fazenda'),
    salvarFazenda: (f: Omit<Fazenda, 'id' | 'atualizadaEm'>, agora = new Date()) => db.fazendas.put({ ...f, id: 'fazenda', atualizadaEm: agora.toISOString() }),

    // Configuração
    async lerConfig<T>(chave: string, padrao: T): Promise<T> {
      const row = await db.config.get(chave)
      return row ? (row.valor as T) : padrao
    },
    gravarConfig: (chave: string, valor: unknown) => db.config.put({ chave, valor }),

    async apagarTudo() {
      await Promise.all(db.tables.map((t) => t.clear()))
    },
  }
}

export type Repo = ReturnType<typeof criarRepo>
export const repo = criarRepo()
