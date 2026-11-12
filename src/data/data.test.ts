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
    expect(gravados).toHaveLength(LISTA_ALVOS.length)
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

describe('Registro v2 e migração', () => {
  it('migrarRegistro só marca a versão e não inventa campos', async () => {
    const { migrarRegistro, metodoDoRegistro, ehRegistroAntigo, METODO_NAO_INFORMADO } = await import('@/domain/registro')
    const antigo = reg()
    const m = migrarRegistro(antigo)
    expect(m.schema).toBe(1)
    expect(m.metodo).toBeUndefined()
    expect(m.fusoHorario).toBeUndefined()
    expect(ehRegistroAntigo(m)).toBe(true)
    expect(metodoDoRegistro(m)).toBe(METODO_NAO_INFORMADO)
  })
  it('a migração do banco v2 → v3 marca os registros existentes como schema 1', async () => {
    const nome = `migra-${++n}`
    const { default: Dexie } = await import('dexie')
    const velho = new Dexie(nome)
    velho.version(1).stores({ talhoes: 'id, nome', planos: 'talhaoId', registros: 'id, talhaoId, alvo, criadoEm, [talhaoId+pontoId], [talhaoId+alvo]', fotos: 'id', ordens: 'id, talhaoId, status', clima: 'chave', config: 'chave' })
    velho.version(2).stores({ pendencias: 'id, talhaoId, [talhaoId+pontoId]' })
    await velho.open()
    await velho.table('registros').put(reg({ id: 'antigo-1' }))
    velho.close()
    const novo = new SentinelaDB(nome)
    const lido = await novo.registros.get('antigo-1')
    expect(lido?.schema).toBe(1)
    expect(lido?.metodo).toBeUndefined()
    expect(lido?.quantidade).toBe(1) // dados originais intactos
  })
  it('camposV2 preenche método, protocolo, fuso, posição planejada e distância', async () => {
    const { camposV2, PROTOCOLO_VERSAO } = await import('@/domain/registro')
    const t = new Date('2026-11-11T17:00:00Z')
    const c = camposV2({ posicao: [-55.9150, -13.0520] }, { metodo: 'Pano de batida', planejada: [-55.9150, -13.0520], inicio: t, fim: new Date(t.getTime() + 90_000), responsavel: 'Resp. Técnico' })
    expect(c).toMatchObject({ schema: 2, metodo: 'Pano de batida', protocoloVersao: PROTOCOLO_VERSAO, fusoHorario: 'America/Cuiaba', distanciaDoPontoM: 0, responsavel: 'Resp. Técnico' })
    expect(Date.parse(c.fimEm) - Date.parse(c.inicioEm)).toBe(90_000)
    const longe = camposV2({ posicao: [-55.9140, -13.0520] }, { metodo: 'x', planejada: [-55.9150, -13.0520], inicio: t, fim: t })
    expect(longe.distanciaDoPontoM).toBeGreaterThan(100)
  })
  it('registro v2 completo é gravado e lido com todos os campos', async () => {
    const r = reg({ schema: 2, metodo: 'Pano de batida de 1 m', protocoloVersao: '2026-11', fusoHorario: 'America/Cuiaba', posicaoPlanejada: [-55.915, -13.052], distanciaDoPontoM: 0 })
    expect((await repo.salvarRegistro(r, ctx)).gravado).toBe(true)
    expect((await repo.listarRegistros('T-02'))[0]).toMatchObject({ schema: 2, metodo: 'Pano de batida de 1 m', fusoHorario: 'America/Cuiaba' })
  })
})

describe('fazenda', () => {
  it('começa sem fazenda, salva e atualiza (uma só por aparelho)', async () => {
    expect(await repo.obterFazenda()).toBeUndefined()
    await repo.salvarFazenda({ nome: 'Fazenda Teste', municipio: 'Lucas do Rio Verde', uf: 'MT', safra: '25/26', fuso: 'America/Cuiaba' })
    await repo.salvarFazenda({ nome: 'Fazenda Teste 2', municipio: 'Sorriso', uf: 'MT', safra: '25/26', fuso: 'America/Cuiaba' })
    expect((await repo.obterFazenda())?.nome).toBe('Fazenda Teste 2')
  })
  it('apagar tudo remove também a fazenda', async () => {
    await repo.salvarFazenda({ nome: 'X', municipio: 'Y', uf: 'MT', safra: '25/26', fuso: 'America/Cuiaba' })
    await repo.apagarTudo()
    expect(await repo.obterFazenda()).toBeUndefined()
  })
})

describe('trilha de auditoria', () => {
  const agora = new Date('2026-11-11T17:30:00Z')
  const base = () => reg({ id: 'orig', quantidade: 3, zero: false, fotoIds: ['f1'] })

  it('corrigir grava nova versão, guarda a antiga e mantém a data/hora da medição', async () => {
    await repo.salvarTalhao(talhao)
    await repo.salvarPlano({ talhaoId: 'T-02', params: { method: 'zigzag', bufferM: 10, targetPoints: 2 }, pontos: [{ id: 'P01', order: 1, position: [-55.915, -13.052] }, { id: 'P02', order: 2, position: [-55.914, -13.053] }], caminho: [], areaHa: 5, geradoEm: '2026-11-01T00:00:00Z' })
    await repo.salvarRegistro(base(), ctx)
    const r = await repo.corrigirRegistro('orig', { quantidade: 1, observacao: 'contagem refeita' }, { autor: 'Prof. Ana', motivo: 'Contei de novo no pano', agora })
    expect(r.gravado).toBe(true)
    const todas = await repo.listarVersoesDoPonto('T-02', 'P01')
    expect(todas).toHaveLength(2)
    const [v1, v2] = todas
    expect(v1).toMatchObject({ id: 'orig', quantidade: 3, substituidoPorId: r.novoId })
    expect(v2).toMatchObject({ id: r.novoId, quantidade: 1, versao: 2, corrigeId: 'orig', corrigidoPor: 'Prof. Ana', motivoCorrecao: 'Contei de novo no pano', criadoEm: '2026-11-07T14:00:00Z' })
    expect(v2!.corrigidoEm).toBe(agora.toISOString())
  })

  it('só a versão ativa entra nas listas de análise', async () => {
    await repo.salvarTalhao(talhao)
    await repo.salvarRegistro(base(), ctx)
    await repo.corrigirRegistro('orig', { quantidade: 1 }, { autor: 'Prof. Ana', motivo: 'Recontagem', agora })
    const ativos = await repo.listarRegistros('T-02')
    expect(ativos).toHaveLength(1)
    expect(ativos[0]!.quantidade).toBe(1)
    expect(await repo.listarTodosRegistros()).toHaveLength(1)
    expect(await repo.historicoDoAlvo('T-02', 'percevejo')).toHaveLength(1)
  })

  it('exige autor e motivo e não corrige versão antiga', async () => {
    await repo.salvarRegistro(base(), ctx)
    expect((await repo.corrigirRegistro('orig', { quantidade: 1 }, { autor: '', motivo: 'x y z' })).gravado).toBe(false)
    expect((await repo.corrigirRegistro('orig', { quantidade: 1 }, { autor: 'Ana', motivo: '' })).gravado).toBe(false)
    expect((await repo.corrigirRegistro('orig', { quantidade: 1 }, { autor: 'Ana', motivo: 'Recontagem', agora })).gravado).toBe(true)
    const de_novo = await repo.corrigirRegistro('orig', { quantidade: 2 }, { autor: 'Ana', motivo: 'Outra vez', agora })
    expect(de_novo.gravado).toBe(false)
    expect(de_novo.problemas[0]!.mensagem).toMatch(/já foi corrigido/)
  })

  it('uma correção inválida não grava nada e deixa a original ativa', async () => {
    await repo.salvarRegistro(base(), ctx)
    const r = await repo.corrigirRegistro('orig', { quantidade: -5 }, { autor: 'Ana', motivo: 'Teste de erro', agora })
    expect(r.gravado).toBe(false)
    expect(await repo.listarVersoesDoPonto('T-02', 'P01')).toHaveLength(1)
    expect((await repo.listarRegistros('T-02'))[0]!.id).toBe('orig')
  })

  it('anular marca o registro, guarda quem e quando, e tira das análises sem apagar', async () => {
    await repo.salvarRegistro(base(), ctx)
    expect(await repo.anularRegistros(['orig'], { autor: 'Ana', agora })).toBe(1)
    expect(await repo.listarRegistros('T-02')).toHaveLength(0)
    const [r] = await repo.listarVersoesDoPonto('T-02', 'P01')
    expect(r).toMatchObject({ id: 'orig', anuladoPor: 'Ana', anuladoEm: agora.toISOString() })
    // anular de novo não faz nada
    expect(await repo.anularRegistros(['orig'], { autor: 'Ana', agora })).toBe(0)
  })

  it('cadeiaDeVersoes devolve da original à mais recente a partir de qualquer id', async () => {
    const { cadeiaDeVersoes } = await import('@/domain/registro')
    await repo.salvarRegistro(base(), ctx)
    const a = await repo.corrigirRegistro('orig', { quantidade: 2 }, { autor: 'Ana', motivo: 'Primeira', agora })
    const b = await repo.corrigirRegistro(a.novoId!, { quantidade: 1 }, { autor: 'Ana', motivo: 'Segunda', agora })
    const todas = await repo.listarVersoesDoPonto('T-02', 'P01')
    expect(cadeiaDeVersoes(todas, b.novoId!).map((r) => r.versao ?? 1)).toEqual([1, 2, 3])
    expect(cadeiaDeVersoes(todas, 'orig').map((r) => r.id)).toEqual(['orig', a.novoId, b.novoId])
  })
})

describe('editar e apagar talhão', () => {
  const plano = (talhaoId: string) => ({ talhaoId, params: { method: 'zigzag' as const, bufferM: 30, targetPoints: 2 }, pontos: [{ id: 'P01', order: 1, position: [-55.915, -13.052] as const }], caminho: [], areaHa: 5, geradoEm: '2026-11-01T00:00:00Z' })
  const outro: Talhao = { ...talhao, id: 'T-09', nome: 'T-09 Outro' }
  const foto = (id: string) => ({ id, blob: new Blob(['x']), criadoEm: '2026-11-07T14:00:00Z', largura: 1, altura: 1 })
  const dados = { nome: 'T-02 Baixada Nova', cultivar: 'média', dataPlantio: '2026-09-25', estadio: 'R4', finalidade: 'sementes' as const }
  const hoje = new Date('2026-11-12T15:00:00Z')

  it('editar muda só os dados do talhão: contorno, plano e registros ficam como estavam', async () => {
    await repo.salvarTalhao(talhao); await repo.salvarPlano(plano('T-02')); await repo.salvarRegistro(reg({ id: 'a' }), ctx)
    const r = await repo.atualizarTalhao('T-02', dados, hoje)
    expect(r.ok).toBe(true)
    const t = (await repo.obterTalhao('T-02'))!
    expect(t).toMatchObject({ id: 'T-02', nome: 'T-02 Baixada Nova', cultivar: 'média', dataPlantio: '2026-09-25', estadio: 'R4', finalidade: 'sementes', criadoEm: talhao.criadoEm })
    expect(t.anel).toEqual(talhao.anel)
    expect((await repo.obterPlano('T-02'))!.pontos).toHaveLength(1)
    expect((await repo.listarRegistros('T-02'))[0]).toMatchObject({ id: 'a', estadio: 'R3' }) // o registro guarda o estádio da época
  })
  it('nome repetido ou dado inválido não grava nada; o próprio nome pode ser mantido', async () => {
    await repo.salvarTalhao(talhao); await repo.salvarTalhao(outro)
    const repetido = await repo.atualizarTalhao('T-02', { ...dados, nome: 't-09  outro' }, hoje)
    expect(repetido).toMatchObject({ ok: false, erros: { nome: expect.stringMatching(/Já existe/) } })
    expect((await repo.obterTalhao('T-02'))!.nome).toBe('T-02 Baixada')
    expect((await repo.atualizarTalhao('T-02', { ...dados, dataPlantio: '2027-01-01' }, hoje)).ok).toBe(false)
    expect((await repo.atualizarTalhao('T-02', { ...dados, nome: 'T-02 Baixada' }, hoje)).ok).toBe(true) // manter o mesmo nome não é "repetido"
  })
  it('cultivar em branco vira "Não informada"; talhão inexistente é recusado', async () => {
    await repo.salvarTalhao(talhao)
    await repo.atualizarTalhao('T-02', { ...dados, cultivar: '   ' }, hoje)
    expect((await repo.obterTalhao('T-02'))!.cultivar).toBe('Não informada')
    expect((await repo.atualizarTalhao('T-99', dados, hoje)).ok).toBe(false)
  })
  async function montarComBanco() {
    const db = new SentinelaDB(`apagar-${++n}`)
    const r = criarRepo(db)
    await r.salvarTalhao(talhao); await r.salvarTalhao(outro)
    await r.salvarPlano(plano('T-02')); await r.salvarPlano(plano('T-09'))
    await db.fotos.bulkPut([foto('f-t02'), foto('f-t02-pend'), foto('f-t09')])
    await r.salvarRegistro(reg({ id: 'a', fotoIds: ['f-t02'] }), ctx)
    await r.salvarRegistro(reg({ id: 'a2', fotoIds: ['f-t02'], alvo: 'lagarta', fase: 'Lagarta pequena (até 1,5 cm)' }), ctx) // mesma foto em 2 registros
    await r.salvarRegistro(reg({ id: 'b', talhaoId: 'T-09', fotoIds: ['f-t09'] }), ctx)
    await r.corrigirRegistro('a', { observacao: 'x' }, { autor: 'Ana', motivo: 'Teste', agora: hoje }) // gera uma versão a mais
    await r.salvarPendencia({ id: 'PEN-1', talhaoId: 'T-02', pontoId: 'P01', fotoIds: ['f-t02-pend'], nota: '', estadio: 'R3', amostrador: 'A', criadoEm: '2026-11-07T14:00:00Z' })
    await r.salvarOrdem({ id: 'ORD-1', talhaoId: 'T-02', pontoId: 'P01', origem: 'drone', motivo: 'x', criadaEm: '2026-11-07T14:00:00Z', status: 'aberta' })
    await r.gravarConfig('rascunho:registro:T-02:P01', { x: 1 })
    await r.gravarConfig('rascunho:registro:T-09:P01', { x: 2 })
    await r.gravarConfig('outra-config', { y: 3 })
    return { db, r }
  }

  it('o resumo conta pontos, registros (todas as versões), achados e fotos sem repetir', async () => {
    const { r } = await montarComBanco()
    expect(await r.resumoDoTalhao('T-02')).toEqual({ pontos: 1, registros: 3, achados: 1, fotos: 2 }) // a, a (versão 2), a2 | foto f-t02 repetida conta 1
    expect(await r.resumoDoTalhao('T-99')).toEqual({ pontos: 0, registros: 0, achados: 0, fotos: 0 })
  })

  it('apagar remove tudo do talhão (registros e versões, achados, ordens, plano, fotos, rascunhos) e nada dos outros', async () => {
    const { db, r } = await montarComBanco()
    await r.apagarTalhao('T-02')
    expect(await r.obterTalhao('T-02')).toBeUndefined()
    expect(await r.obterPlano('T-02')).toBeUndefined()
    expect(await db.registros.where('talhaoId').equals('T-02').count()).toBe(0)
    expect(await db.pendencias.where('talhaoId').equals('T-02').count()).toBe(0)
    expect(await db.ordens.where('talhaoId').equals('T-02').count()).toBe(0)
    expect((await db.fotos.toArray()).map((f) => f.id)).toEqual(['f-t09']) // as fotos do T-02 saíram; a do outro ficou
    expect((await db.config.toArray()).map((c) => c.chave).sort()).toEqual(['outra-config', 'rascunho:registro:T-09:P01'])
    // O outro talhão está intacto.
    expect((await r.obterTalhao('T-09'))!.nome).toBe('T-09 Outro')
    expect((await r.obterPlano('T-09'))!.pontos).toHaveLength(1)
    expect(await r.listarRegistros('T-09')).toHaveLength(1)
  })

  it('apagar é tudo ou nada: se falhar no meio, nada some', async () => {
    const { db, r } = await montarComBanco()
    const falha = () => { throw Object.assign(new Error('falhou'), { name: 'QuotaExceededError' }) }
    db.talhoes.hook('deleting', falha)
    await expect(r.apagarTalhao('T-02')).rejects.toBeTruthy()
    db.talhoes.hook('deleting').unsubscribe(falha)
    expect(await r.obterTalhao('T-02')).toBeDefined()
    expect(await db.registros.where('talhaoId').equals('T-02').count()).toBe(3)
    expect(await db.fotos.count()).toBe(3)
  })

  it('apagar um talhão que não existe não dá erro nem mexe em nada', async () => {
    const { db, r } = await montarComBanco()
    await r.apagarTalhao('T-99')
    expect(await db.talhoes.count()).toBe(2)
    expect(await db.fotos.count()).toBe(3)
  })
})
