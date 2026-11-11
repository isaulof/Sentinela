import { describe, expect, it } from 'vitest'
import { daRodada, idwGrade, nivelPorPonto, resumirTalhao, serieTemporal } from './analise'
import type { LngLat } from './geo'
import type { Registro } from './registro'

const agora = new Date('2026-11-07T12:00:00Z')
const reg = (o: Partial<Registro>): Registro => ({
  id: Math.random().toString(), talhaoId: 'T', amostrador: 'a', criadoEm: '2026-11-06T12:00:00Z', estadio: 'R3', finalidade: 'graos',
  pontoId: 'P01', posicao: [-55.92, -13.05], posicaoSimulada: true, alvo: 'percevejo', fase: 'Adulto', quantidade: 0, zero: true, fotoIds: [], observacao: '', ...o,
})
const quad: LngLat[] = [[-55.92, -13.05], [-55.91, -13.05], [-55.91, -13.06], [-55.92, -13.06]]

describe('rodada e resumo', () => {
  it('considera só os últimos 7 dias', () => {
    const r = [reg({ criadoEm: '2026-11-06T00:00:00Z' }), reg({ criadoEm: '2026-10-20T00:00:00Z' })]
    expect(daRodada(r, agora)).toHaveLength(1)
  })
  it('pior nível por ponto', () => {
    const m = nivelPorPonto([reg({ quantidade: 0 }), reg({ quantidade: 3, zero: false })])
    expect(m.get('P01')).toBe('atingido')
  })
  it('resumo: progresso e pontos críticos', () => {
    const s = resumirTalhao(['P01', 'P02', 'P03', 'P04'], [reg({ quantidade: 3, zero: false }), reg({ pontoId: 'P02', quantidade: 0 })], agora)
    expect(s).toMatchObject({ pontosAmostrados: 2, progressoPct: 50, atingidos: ['P01'], pior: 'atingido' })
  })
  it('sem pontos não divide por zero', () => {
    expect(resumirTalhao([], [], agora).progressoPct).toBe(0)
  })
})

describe('IDW', () => {
  it('valor no ponto de amostra é o da amostra; fora do polígono é null', () => {
    const g = idwGrade(quad, [{ posicao: [-55.915, -13.055], valor: 10 }, { posicao: [-55.9125, -13.0575], valor: 0 }], 20, 20)
    const flat = g.valores.flat().filter((v): v is number => v !== null)
    expect(flat.length).toBeGreaterThan(300)
    expect(g.max).toBeLessThanOrEqual(10)
    expect(g.min).toBeGreaterThanOrEqual(0)
  })
  it('sem amostras devolve só nulos', () => {
    expect(idwGrade(quad, [], 5, 5).valores.flat().every((v) => v === null)).toBe(true)
  })
  it('com uma amostra, a grade é constante', () => {
    const g = idwGrade(quad, [{ posicao: [-55.915, -13.055], valor: 4 }], 6, 6)
    expect(new Set(g.valores.flat().filter((v) => v !== null))).toEqual(new Set([4]))
  })
})

describe('série temporal', () => {
  it('média por dia, em ordem', () => {
    const s = serieTemporal([reg({ criadoEm: '2026-11-02T10:00:00Z', quantidade: 2 }), reg({ criadoEm: '2026-11-02T11:00:00Z', quantidade: 4 }), reg({ criadoEm: '2026-10-30T10:00:00Z', quantidade: 1 })])
    expect(s).toEqual([{ dia: '2026-10-30', media: 1, n: 1 }, { dia: '2026-11-02', media: 3, n: 2 }])
  })
})

describe('série temporal e fuso', () => {
  it('registros das 09:00 e das 21:30 locais entram no mesmo dia', () => {
    const s = serieTemporal([reg({ criadoEm: '2026-11-11T13:00:00Z', quantidade: 2 }), reg({ criadoEm: '2026-11-12T01:30:00Z', quantidade: 4 })])
    expect(s).toEqual([{ dia: '2026-11-11', media: 3, n: 2 }])
  })
})
