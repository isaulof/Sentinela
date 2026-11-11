import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import type { Registro } from '@/domain/registro'
import { SentinelaDB } from './db'
import { ehFaltaDeEspaco, mensagemDeGravacao, MSG_SEM_ESPACO } from './erros'
import { criarRepo } from './repo'

const quota = () => Object.assign(new Error('The quota has been exceeded.'), { name: 'QuotaExceededError' })
const reg = (o: Partial<Registro> = {}): Registro => ({
  id: 'r1', talhaoId: 'T', amostrador: 'Ana', criadoEm: '2026-11-07T14:00:00Z', estadio: 'R3', finalidade: 'graos', pontoId: 'P01', posicao: [-55.915, -13.052],
  posicaoSimulada: true, alvo: 'percevejo', fase: 'Adulto', quantidade: 1, zero: false, fotoIds: [], observacao: '', ...o,
})
const ctx = { agora: new Date('2026-11-07T15:00:00Z'), pontosDoPlano: ['P01'] }
let n = 0

describe('falta de espaço', () => {
  it('reconhece QuotaExceededError direto, embrulhado e por texto', () => {
    expect(ehFaltaDeEspaco(quota())).toBe(true)
    expect(ehFaltaDeEspaco({ name: 'DexieError', inner: { name: 'QuotaExceededError' } })).toBe(true)
    expect(ehFaltaDeEspaco(new Error('Storage quota exceeded'))).toBe(true)
    expect(ehFaltaDeEspaco(new Error('outra coisa'))).toBe(false)
    expect(ehFaltaDeEspaco(null)).toBe(false)
    expect(ehFaltaDeEspaco('texto')).toBe(false)
  })
  it('a mensagem para a pessoa diz o que fazer e que nada foi perdido; outros erros usam o texto padrão', () => {
    expect(mensagemDeGravacao(quota())).toBe(MSG_SEM_ESPACO)
    expect(MSG_SEM_ESPACO).toMatch(/Nada foi perdido/)
    expect(mensagemDeGravacao(new Error('xyz'))).toBe('Não foi possível guardar. Tente de novo.')
    expect(mensagemDeGravacao(new Error('xyz'), 'Falhou X')).toBe('Falhou X')
    expect(mensagemDeGravacao(new Error('segredo técnico'))).not.toMatch(/segredo/) // nunca vaza texto técnico cru
  })
})

describe('gravação que falha no meio', () => {
  it('se o aparelho enche ao salvar, o registro não fica gravado e o erro sobe para a tela tratar', async () => {
    const db = new SentinelaDB(`erro-${++n}`)
    const repo = criarRepo(db)
    const falha = () => { throw quota() }
    db.registros.hook('creating', falha)
    await expect(repo.salvarRegistro(reg(), ctx)).rejects.toSatisfy(ehFaltaDeEspaco)
    db.registros.hook('creating').unsubscribe(falha)
    expect(await db.registros.count()).toBe(0)
  })
  it('uma correção que falha ao marcar a versão antiga desfaz tudo: sem meia-versão gravada', async () => {
    const db = new SentinelaDB(`erro-${++n}`)
    const repo = criarRepo(db)
    await repo.salvarRegistro(reg(), ctx)
    const falha = () => { throw quota() }
    db.registros.hook('updating', falha)
    await expect(repo.corrigirRegistro('r1', { observacao: 'folha com pontos' }, { autor: 'Ana', motivo: 'Recontagem' })).rejects.toBeTruthy()
    db.registros.hook('updating').unsubscribe(falha)
    const todos = await db.registros.toArray()
    expect(todos).toHaveLength(1) // a nova versão foi revertida junto
    expect(todos[0]).toMatchObject({ id: 'r1', quantidade: 1 })
    expect(todos[0]!.substituidoPorId).toBeUndefined()
  })
  it('anular vários registros é tudo ou nada', async () => {
    const db = new SentinelaDB(`erro-${++n}`)
    const repo = criarRepo(db)
    await repo.salvarRegistro(reg({ id: 'a' }), ctx)
    await repo.salvarRegistro(reg({ id: 'b', alvo: 'lagarta', fase: 'Lagarta pequena (até 1,5 cm)' }), ctx)
    let chamadas = 0
    const falha = () => { if (++chamadas === 2) throw quota() }
    db.registros.hook('updating', falha)
    await expect(repo.anularRegistros(['a', 'b'], { autor: 'Ana' })).rejects.toBeTruthy()
    db.registros.hook('updating').unsubscribe(falha)
    expect((await db.registros.toArray()).filter((r) => r.anuladoEm)).toHaveLength(0)
  })
})
