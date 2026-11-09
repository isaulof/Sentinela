import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Talhao } from '@/domain/entidades'
import type { Registro } from '@/domain/registro'
import { SentinelaDB } from './db'
import { criarRepo } from './repo'

let n = 0
const talhao: Talhao = {
  id: 'T-02', nome: 'T-02 Baixada', anel: [[-55.92, -13.05], [-55.91, -13.05], [-55.91, -13.06]], cultivar: 'X',
  dataPlantio: '2026-09-20', estadio: 'R3', finalidade: 'graos', criadoEm: '2026-11-01T00:00:00Z',
}
const reg = (o: Partial<Registro> = {}): Registro => ({
  id: `r${++n}`, talhaoId: 'T-02', amostrador: 'Amostrador Teste', criadoEm: '2026-11-07T14:00:00Z', estadio: 'R3', finalidade: 'graos',
  pontoId: 'P01', posicao: [-55.915, -13.052], posicaoSimulada: true, alvo: 'percevejo', fase: 'Adulto', quantidade: 1, zero: false,
  fotoIds: [], observacao: '', ...o,
})
const ctx = { agora: new Date('2026-11-07T15:00:00Z'), pontosDoPlano: ['P01', 'P02'] }

let repo: ReturnType<typeof criarRepo>
beforeEach(() => { repo = criarRepo(new SentinelaDB(`teste-${++n}`)) })

describe('repositório', () => {
  it('salva e lista talhões e planos', async () => {
    await repo.salvarTalhao(talhao)
    expect((await repo.listarTalhoes()).map((t) => t.id)).toEqual(['T-02'])
  })
  it('só grava registros válidos', async () => {
    const ruim = await repo.salvarRegistro(reg({ quantidade: -3 }), ctx)
    expect(ruim.gravado).toBe(false)
    expect(await repo.listarRegistros('T-02')).toHaveLength(0)
    const bom = await repo.salvarRegistro(reg(), ctx)
    expect(bom.gravado).toBe(true)
    expect(await repo.listarRegistros('T-02')).toHaveLength(1)
  })
  it('usa o histórico para detectar outlier (V10)', async () => {
    for (const q of [1, 1, 1]) await repo.salvarRegistro(reg({ quantidade: q }), ctx)
    const r = await repo.salvarRegistro(reg({ quantidade: 8, fotoIds: ['f'] }), ctx)
    expect(r.problemas.some((p) => p.regra === 'V10')).toBe(true)
  })
  it('apagar talhão remove registros e ordens dele', async () => {
    await repo.salvarTalhao(talhao)
    await repo.salvarRegistro(reg(), ctx)
    await repo.apagarTalhao('T-02')
    expect(await repo.listarTodosRegistros()).toHaveLength(0)
  })
  it('config com valor padrão', async () => {
    expect(await repo.lerConfig('nome', 'anon')).toBe('anon')
    await repo.gravarConfig('nome', 'Amostrador Teste')
    expect(await repo.lerConfig('nome', 'anon')).toBe('Amostrador Teste')
  })
})

describe('coleta guiada', () => {
  const plano = { talhaoId: 'T-02', params: { method: 'zigzag' as const, bufferM: 30, targetPoints: 3 }, pontos: [{ id: 'P01', order: 1, position: [-55.915, -13.052] as const }], caminho: [], areaHa: 1, geradoEm: '2026-11-01T00:00:00Z' }

  it('"sem ocorrência" grava um zero válido para cada alvo', async () => {
    const { registrarSemOcorrencia } = await import('./coleta')
    const { LISTA_ALVOS } = await import('@/knowledge/alvos')
    const gravados = await registrarSemOcorrencia({ talhao: talhao, plano: plano as never, pontoId: 'P01', amostrador: 'Amostrador Teste', agora: new Date('2026-11-07T15:00:00Z') }, repo)
    expect(gravados).toBe(LISTA_ALVOS.length)
    const regs = await repo.listarRegistros('T-02')
    expect(regs.every((r) => r.zero && r.quantidade === 0 && r.posicaoSimulada)).toBe(true)
  })
  it('guarda e lista pendências de diagnóstico por talhão', async () => {
    await repo.salvarPendencia({ id: 'PEN-1', talhaoId: 'T-02', pontoId: 'P01', fotoIds: [], nota: 'manchas', estadio: 'R3', amostrador: 'A', criadoEm: '2026-11-07T14:00:00Z' })
    expect((await repo.listarPendencias('T-02')).map((p) => p.id)).toEqual(['PEN-1'])
    await repo.apagarPendencia('PEN-1')
    expect(await repo.listarPendencias('T-02')).toEqual([])
  })
})

describe('anexar diagnóstico ao ponto', () => {
  const base = { talhaoId: 'T-02', pontoId: 'P01', titulo: 'Ferrugem-asiática', alvoId: 'ferrugem', compatibilidadePct: 78, estadio: 'R3', amostrador: 'A', agora: new Date('2026-11-09T12:00:00Z') }
  it('resolve a pendência aberta do ponto, mantendo fotos e nota', async () => {
    const { anexarDiagnostico } = await import('./coleta')
    await repo.salvarPendencia({ id: 'PEN-9', talhaoId: 'T-02', pontoId: 'P01', fotoIds: ['f1'], nota: 'manchas', estadio: 'R3', amostrador: 'A', criadoEm: '2026-11-09T10:00:00Z' })
    const r = await anexarDiagnostico({ ...base, pendenciaId: 'PEN-9' }, repo)
    expect(r.id).toBe('PEN-9')
    expect(r.fotoIds).toEqual(['f1'])
    expect(r.resolvida).toMatchObject({ titulo: 'Ferrugem-asiática', compatibilidadePct: 78 })
    expect(await repo.listarPendencias('T-02')).toHaveLength(1)
  })
  it('sem pendência, cria um registro já resolvido no ponto escolhido', async () => {
    const { anexarDiagnostico } = await import('./coleta')
    const r = await anexarDiagnostico({ ...base, pendenciaId: null }, repo)
    expect(r.pontoId).toBe('P01')
    expect(r.resolvida?.titulo).toBe('Ferrugem-asiática')
  })
  it('recusa uma pendência que não existe mais', async () => {
    const { anexarDiagnostico } = await import('./coleta')
    await expect(anexarDiagnostico({ ...base, pendenciaId: 'PEN-fantasma' }, repo)).rejects.toThrow(/não foi encontrado/)
  })
})
