import { describe, expect, it } from 'vitest'
import { confirmaExclusao, normalizarNome, validarDadosTalhao, type DadosDoTalhao } from './talhao'

const ok: DadosDoTalhao = { nome: 'T-05 Sede', cultivar: 'precoce', dataPlantio: '2026-09-20', estadio: 'V4', finalidade: 'graos' }
const hoje = '2026-11-12'
const v = (o: Partial<DadosDoTalhao> = {}, outros: string[] = ['T-01 Mirante']) => validarDadosTalhao({ ...ok, ...o }, outros, hoje)

describe('validação dos dados do talhão', () => {
  it('dados corretos passam', () => expect(v()).toEqual({ ok: true, erros: {} }))
  it('nome: mínimo, máximo e espaços nas pontas', () => {
    expect(v({ nome: 'A' }).erros.nome).toMatch(/pelo menos 2/)
    expect(v({ nome: '   ' }).erros.nome).toBeTruthy()
    expect(v({ nome: 'x'.repeat(61) }).erros.nome).toMatch(/no máximo 60/)
    expect(v({ nome: '  T-09  ' }).ok).toBe(true)
  })
  it('nome repetido é recusado, sem diferença de maiúscula, acento ou espaço; o próprio nome não conta (lista exclui ele)', () => {
    expect(v({ nome: 't-01   MIRANTE' }).erros.nome).toMatch(/Já existe/)
    expect(v({ nome: 'Fazenda Sao José' }, ['Fazenda São Jose']).erros.nome).toMatch(/Já existe/)
    expect(v({ nome: 'T-05 Sede' }, []).ok).toBe(true)
  })
  it('plantio: data real, no formato certo e não futura', () => {
    expect(v({ dataPlantio: '' }).erros.dataPlantio).toMatch(/válida/)
    expect(v({ dataPlantio: '2026-02-30' }).erros.dataPlantio).toMatch(/válida/) // 30 de fevereiro não existe
    expect(v({ dataPlantio: '20/09/2026' }).erros.dataPlantio).toMatch(/válida/)
    expect(v({ dataPlantio: '2026-11-13' }).erros.dataPlantio).toMatch(/futura/)
    expect(v({ dataPlantio: '2026-11-12' }).ok).toBe(true) // hoje vale
  })
  it('cultivar, estádio e finalidade', () => {
    expect(v({ cultivar: 'c'.repeat(41) }).erros.cultivar).toMatch(/no máximo 40/)
    expect(v({ cultivar: '' }).ok).toBe(true) // vazio vira "Não informada" ao salvar
    expect(v({ estadio: 'Z9' }).erros.estadio).toBeTruthy()
    expect(v({ finalidade: 'outra' as never }).erros.finalidade).toBeTruthy()
  })
  it('vários erros de uma vez', () => expect(Object.keys(v({ nome: '', dataPlantio: 'x' }).erros).sort()).toEqual(['dataPlantio', 'nome']))
})

describe('confirmação de exclusão', () => {
  it('exige o nome do talhão, sem diferença de maiúscula, acento ou espaço', () => {
    expect(confirmaExclusao('T-01 Mirante', 'T-01 Mirante')).toBe(true)
    expect(confirmaExclusao('  t-01   mirante ', 'T-01 Mirante')).toBe(true)
    expect(confirmaExclusao('T-01', 'T-01 Mirante')).toBe(false)
    expect(confirmaExclusao('', 'T-01 Mirante')).toBe(false)
    expect(confirmaExclusao('   ', '   ')).toBe(false) // vazio nunca confirma
  })
  it('normalizarNome', () => expect(normalizarNome('  São  JOSÉ ')).toBe('sao jose'))
})
