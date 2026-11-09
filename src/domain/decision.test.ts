import { describe, expect, it } from 'vitest'
import { avaliar } from './decision'
import { atingiu, isEstadio, ordem } from './phenology'

describe('fenologia', () => {
  it('ordena os estádios corretamente', () => {
    expect(ordem('VE')).toBeLessThan(ordem('V1'))
    expect(ordem('V12')).toBeLessThan(ordem('R1'))
    expect(ordem('R3')).toBeLessThan(ordem('R8'))
    expect(atingiu('R5', 'R3')).toBe(true)
    expect(atingiu('V4', 'R3')).toBe(false)
  })
  it('valida estádios', () => {
    for (const ok of ['VE', 'VC', 'V1', 'V12', 'R1', 'R8']) expect(isEstadio(ok)).toBe(true)
    for (const bad of ['R9', 'V0', 'X1', '', 'R', 'v1']) expect(isEstadio(bad)).toBe(false)
    expect(() => ordem('R9')).toThrow()
  })
})

describe('percevejo-marrom', () => {
  const base = { alvo: 'percevejo' as const, estadio: 'R5' }
  it('nível de 2/m para grãos', () => {
    expect(avaliar({ ...base, quantidade: 2 }).nivel).toBe('atingido')
    expect(avaliar({ ...base, quantidade: 1 }).nivel).toBe('abaixo')
    expect(avaliar({ ...base, quantidade: 1.5 }).nivel).toBe('proximo')
  })
  it('nível de 1/m para sementes', () => {
    expect(avaliar({ ...base, quantidade: 1, finalidade: 'sementes' }).nivel).toBe('atingido')
  })
  it('não decide antes de R3 (sem vagens)', () => {
    expect(avaliar({ ...base, estadio: 'R1', quantidade: 5 }).nivel).toBe('abaixo')
  })
  it('fora da janela antes de V4', () => {
    expect(avaliar({ ...base, estadio: 'V2', quantidade: 5 }).nivel).toBe('nao_aplicavel')
  })
  it('zero é registrado como ausente', () => {
    expect(avaliar({ ...base, quantidade: 0 }).nivel).toBe('ausente')
  })
})

describe('lagarta-falsa-medideira', () => {
  it('20 lagartas > 1,5 cm/m atinge o nível', () => {
    expect(avaliar({ alvo: 'lagarta', estadio: 'V6', quantidade: 20 }).nivel).toBe('atingido')
    expect(avaliar({ alvo: 'lagarta', estadio: 'V6', quantidade: 5 }).nivel).toBe('abaixo')
  })
  it('desfolha: 30% no vegetativo, 15% no reprodutivo', () => {
    expect(avaliar({ alvo: 'lagarta', estadio: 'V6', quantidade: 0, desfolhaPct: 30 }).nivel).toBe('atingido')
    expect(avaliar({ alvo: 'lagarta', estadio: 'V6', quantidade: 0, desfolhaPct: 25 }).nivel).toBe('proximo')
    expect(avaliar({ alvo: 'lagarta', estadio: 'V6', quantidade: 0, desfolhaPct: 10 }).nivel).toBe('abaixo')
    expect(avaliar({ alvo: 'lagarta', estadio: 'R2', quantidade: 0, desfolhaPct: 15 }).nivel).toBe('atingido')
    expect(avaliar({ alvo: 'lagarta', estadio: 'R2', quantidade: 0, desfolhaPct: 5 }).nivel).toBe('abaixo')
    expect(avaliar({ alvo: 'lagarta', estadio: 'R2', quantidade: 0, desfolhaPct: 0 }).nivel).toBe('ausente')
  })
})

describe('doenças sem limite oficial', () => {
  it('ferrugem detectada gera detecção, nunca "nível de ação"', () => {
    const r = avaliar({ alvo: 'ferrugem', estadio: 'R2', quantidade: 0, presente: true })
    expect(r.nivel).toBe('deteccao')
    expect(r.detalhe).toMatch(/agrônomo/)
  })
  it('sem sinais vira ausente', () => {
    expect(avaliar({ alvo: 'mofo', estadio: 'R2', quantidade: 0, presente: false }).nivel).toBe('ausente')
  })
  it('mofo-branco fora da janela antes de R1', () => {
    expect(avaliar({ alvo: 'mofo', estadio: 'V6', quantidade: 0, presente: true }).nivel).toBe('nao_aplicavel')
  })
})
