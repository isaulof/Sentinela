import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from './db'
import { repo } from './repo'
import { carregarDemonstracao, FOTOS_REAIS_DA_DEMO, type BuscarFoto } from './seed'

// O banco simulado não guarda o Blob de verdade (perde o tipo). Guardamos o original aqui e mantemos as linhas no banco.
const { gravadas } = vi.hoisted(() => ({ gravadas: new Map<string, { blob: Blob; largura: number; altura: number }>() }))
vi.mock('./fotos', async (importar) => {
  const original = await importar<typeof import('./fotos')>()
  return {
    ...original,
    salvarFotoBruta: async (blob: Blob, largura: number, altura: number) => {
      const id = `foto-${gravadas.size + 1}`
      gravadas.set(id, { blob, largura, altura })
      await db.fotos.put({ id, blob, largura, altura, criadoEm: new Date().toISOString() })
      return id
    },
  }
})
const foto = (id: string) => gravadas.get(id)!

const AGORA = new Date('2026-11-12T15:00:00Z')
const ARQUIVO_DO_ALVO: Record<string, string> = { percevejo: 'percevejo.jpg', lagarta: 'lagarta.jpg', ferrugem: 'ferrugem.jpg', manchaAlvo: 'manchaalvo.jpg' }
const lerTexto = (b: Blob): Promise<string> => new Promise((ok, erro) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => erro(r.error); r.readAsText(b) })

/** Carregador falso: devolve "JPEG" com o nome do arquivo dentro, depois de uma pausa (como a rede de verdade). */
const falso = (falhar: string[] = [], pedidos: string[] = []): BuscarFoto => async (arquivo) => {
  pedidos.push(arquivo)
  await new Promise((r) => setTimeout(r, 15))
  if (falhar.includes(arquivo)) throw new Error('sem rede')
  return { blob: new Blob([`jpg:${arquivo}`], { type: 'image/jpeg' }), largura: 1280, altura: 960 }
}

beforeEach(async () => { await repo.apagarTudo() })

describe('demonstração com fotos reais', () => {
  it('cada ponto usa a foto real do problema que registra', async () => {
    const pedidos: string[] = []
    await carregarDemonstracao(AGORA, falso([], pedidos))
    expect([...new Set(pedidos)].sort()).toEqual(Object.values(FOTOS_REAIS_DA_DEMO).sort())
    const regs = (await db.registros.toArray()).filter((r) => r.fotoIds.length > 0)
    expect(regs.length).toBeGreaterThan(5)
    for (const r of regs) {
      const f = foto(r.fotoIds[0]!)
      expect(f.blob.type, r.id).toBe('image/jpeg')
      expect(await lerTexto(f.blob), r.id).toBe(`jpg:${ARQUIVO_DO_ALVO[r.alvo]}`) // a foto é a do alvo certo
      expect(f).toMatchObject({ largura: 1280, altura: 960 })
    }
  })

  it('não sobra foto sem registro e não falta foto de registro', async () => {
    await carregarDemonstracao(AGORA, falso())
    const regs = await db.registros.toArray()
    const usadas = regs.flatMap((r) => r.fotoIds)
    const guardadas = (await db.fotos.toArray()).map((f) => f.id)
    expect(new Set(guardadas)).toEqual(new Set(usadas))
  })

  it('as fotos são preparadas antes da transação: uma busca lenta não derruba o banco', async () => {
    const lento: BuscarFoto = async (a) => { await new Promise((r) => setTimeout(r, 120)); return falso()(a) }
    await expect(carregarDemonstracao(AGORA, lento)).resolves.toBeUndefined()
    expect(await db.talhoes.count()).toBe(4)
  })

  it('sem conseguir ler nenhuma foto real, usa a ilustração e a demonstração carrega do mesmo jeito', async () => {
    await carregarDemonstracao(AGORA, falso(Object.values(FOTOS_REAIS_DA_DEMO)))
    expect(await db.talhoes.count()).toBe(4)
    const regs = (await db.registros.toArray()).filter((r) => r.fotoIds.length > 0)
    expect(regs.length).toBeGreaterThan(5)
    expect(regs.every((r) => foto(r.fotoIds[0]!).blob.type === 'image/svg+xml')).toBe(true)
  })

  it('uma foto que falha não impede as outras: só aquele problema volta à ilustração', async () => {
    await carregarDemonstracao(AGORA, falso(['lagarta.jpg']))
    const regs = (await db.registros.toArray()).filter((r) => r.fotoIds.length > 0)
    for (const r of regs) {
      const tipo = foto(r.fotoIds[0]!).blob.type
      expect(tipo, r.alvo).toBe(r.alvo === 'lagarta' ? 'image/svg+xml' : 'image/jpeg')
    }
  })

  it('carregar a demonstração de novo não acumula fotos órfãs', async () => {
    await carregarDemonstracao(AGORA, falso())
    const primeira = await db.fotos.count()
    await carregarDemonstracao(AGORA, falso())
    await carregarDemonstracao(AGORA, falso())
    expect(await db.fotos.count()).toBe(primeira)
    const usadas = new Set((await db.registros.toArray()).flatMap((r) => r.fotoIds))
    expect(new Set((await db.fotos.toArray()).map((f) => f.id))).toEqual(usadas)
  })
})
