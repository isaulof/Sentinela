import type { Fazenda, OrdemChecagem, Pendencia, PlanoSalvo, Talhao } from '@/domain/entidades'
import { ativos, estaAtivo, novaVersao, type Correcao, type Registro } from '@/domain/registro'
import { avaliar } from '@/domain/decision'
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
    // Só os registros ativos (não substituídos por correção nem anulados) entram nas listas de análise.
    async listarRegistros(talhaoId: string) { return ativos(await db.registros.where('talhaoId').equals(talhaoId).sortBy('criadoEm')) },
    async listarTodosRegistros() { return ativos(await db.registros.orderBy('criadoEm').toArray()) },
    /** Todas as versões de um ponto, inclusive as substituídas e as anuladas (ficha e auditoria). */
    async listarVersoesDoPonto(talhaoId: string, pontoId: string) {
      return (await db.registros.where('[talhaoId+pontoId]').equals([talhaoId, pontoId]).toArray()).sort((a, b) => a.criadoEm.localeCompare(b.criadoEm) || (a.versao ?? 1) - (b.versao ?? 1))
    },
    async historicoDoAlvo(talhaoId: string, alvo: AlvoId) {
      return ativos(await db.registros.where('[talhaoId+alvo]').equals([talhaoId, alvo]).toArray())
    },
    /** Valida e só então grava. Retorna o resultado; `gravado` indica se foi persistido. */
    async salvarRegistro(r: Registro, ctx: Omit<ContextoValidacao, 'mediaHistorica'>): Promise<ResultadoValidacao & { gravado: boolean }> {
      const hist = ativos(await db.registros.where('[talhaoId+alvo]').equals([r.talhaoId, r.alvo]).toArray())
      const v = validarRegistro(r, { ...ctx, mediaHistorica: mediaHistorica(hist.map((h) => h.quantidade)) })
      if (!v.ok) return { ...v, gravado: false }
      await db.registros.put(r)
      return { ...v, gravado: true }
    },
    /**
     * Corrige um registro: valida, grava uma NOVA versão e marca a antiga como substituída. Nada é apagado.
     * Exige autor e motivo (a trilha de auditoria precisa dos dois).
     */
    async corrigirRegistro(id: string, mudancas: Correcao, c: { autor: string; motivo: string; agora?: Date }): Promise<(ResultadoValidacao & { gravado: boolean; novoId?: string })> {
      const agora = c.agora ?? new Date()
      const falha = (mensagem: string): ResultadoValidacao & { gravado: boolean } => ({ ok: false, gravado: false, problemas: [{ regra: 'AUD', campo: 'motivoCorrecao', gravidade: 'erro', mensagem }], avaliacao: avaliar({ alvo: 'percevejo', estadio: 'R3', quantidade: 0 }) })
      if (c.autor.trim().length < 2) return falha('Informe quem está corrigindo.')
      if (c.motivo.trim().length < 3) return falha('Explique o motivo da correção.')
      const orig = await db.registros.get(id)
      if (!orig) return falha('Registro não encontrado.')
      if (!estaAtivo(orig)) return falha('Este registro já foi corrigido ou anulado. Corrija a versão mais recente.')
      const novo = novaVersao(orig, mudancas, { id: novoId('REG'), autor: c.autor.trim(), motivo: c.motivo.trim(), agora })
      const [talhao, plano, hist] = await Promise.all([db.talhoes.get(orig.talhaoId), db.planos.get(orig.talhaoId), db.registros.where('[talhaoId+alvo]').equals([orig.talhaoId, orig.alvo]).toArray()])
      const v = validarRegistro(novo, { agora, ...(talhao ? { anelTalhao: talhao.anel } : {}), ...(plano ? { pontosDoPlano: plano.pontos.map((p) => p.id) } : {}), mediaHistorica: mediaHistorica(ativos(hist).filter((h) => h.id !== id).map((h) => h.quantidade)) })
      if (!v.ok) return { ...v, gravado: false }
      await db.transaction('rw', db.registros, async () => {
        await db.registros.put(novo)
        await db.registros.update(id, { substituidoPorId: novo.id })
      })
      return { ...v, gravado: true, novoId: novo.id }
    },
    /** Desfaz registros (ex.: "Desfazer" logo após salvar): marca como anulados, sem apagar. */
    async anularRegistros(ids: readonly string[], c: { autor: string; motivo?: string; agora?: Date }): Promise<number> {
      const em = (c.agora ?? new Date()).toISOString()
      let n = 0
      await db.transaction('rw', db.registros, async () => {
        for (const id of ids) {
          const r = await db.registros.get(id)
          if (!r || !estaAtivo(r)) continue
          await db.registros.update(id, { anuladoEm: em, anuladoPor: c.autor.trim() || 'Sem nome', motivoAnulacao: c.motivo?.trim() || 'Desfeito logo após salvar' })
          n++
        }
      })
      return n
    },

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
