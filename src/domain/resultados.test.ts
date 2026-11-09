import { describe, expect, it } from 'vitest'
import type { Registro } from './registro'
import { amostrasNaData, ateODia, celulasCalor, niveisNaData, resumirResultado, setorDoFoco, visitas } from './resultados'

const anel: [number, number][] = [[-55.92, -13.05], [-55.91, -13.05], [-55.91, -13.06], [-55.92, -13.06]]
let n = 0
const reg = (o: Partial<Registro>): Registro => ({
  id: `r${++n}`, talhaoId: 'T', amostrador: 'A', criadoEm: '2026-11-05T14:00:00Z', estadio: 'R5', finalidade: 'graos', pontoId: 'P01', posicao: [-55.915, -13.052],
  posicaoSimulada: true, alvo: 'percevejo', fase: 'Adulto', quantidade: 0, zero: true, fotoIds: [], observacao: '', ...o,
})
const regs = [
  reg({ pontoId: 'P01', criadoEm: '2026-11-03T14:00:00Z' }),
  reg({ pontoId: 'P02', criadoEm: '2026-11-03T15:00:00Z', quantidade: 1, zero: false, posicao: [-55.912, -13.055] }),
  reg({ pontoId: 'P01', criadoEm: '2026-11-08T14:00:00Z', quantidade: 5, zero: false }),
]

describe('linha do tempo', () => {
  it('lista os dias de coleta em ordem, sem repetir', () => expect(visitas(regs)).toEqual(['2026-11-03', '2026-11-08']))
  it('mostra só o que existia até o dia', () => expect(ateODia(regs, '2026-11-03')).toHaveLength(2))
  it('o mesmo ponto muda de estado entre as visitas', () => {
    expect(niveisNaData(regs, '2026-11-03', null).get('P01')).toBe('ausente')
    expect(niveisNaData(regs, '2026-11-08', null).get('P01')).toBe('atingido')
  })
  it('a amostra de cada ponto é a última leitura até a data', () => {
    expect(amostrasNaData(regs, '2026-11-03', 'percevejo').find((a) => a.id === 'P01')?.valor).toBe(0)
    expect(amostrasNaData(regs, '2026-11-08', 'percevejo').find((a) => a.id === 'P01')?.valor).toBe(5)
  })
})

describe('mapa de calor', () => {
  it('sem amostras não há células', () => expect(celulasCalor(anel, []).celulas).toEqual([]))
  it('gera células só dentro do talhão, com valores e máximo coerentes', () => {
    const { celulas, max } = celulasCalor(anel, amostrasNaData(regs, '2026-11-08', 'percevejo'))
    expect(celulas.length).toBeGreaterThan(100)
    expect(max).toBeGreaterThan(0)
    expect(celulas.every((c) => c.anel.length === 4 && c.valor >= 0 && c.valor <= max + 1e-9)).toBe(true)
    const lngs = celulas.flatMap((c) => c.anel.map((p) => p[0]))
    expect(Math.min(...lngs)).toBeGreaterThanOrEqual(-55.9201)
    expect(Math.max(...lngs)).toBeLessThanOrEqual(-55.9099)
  })
})

describe('resumo', () => {
  it('conta pontos com ocorrência e acha o alvo dominante', () => {
    const r = resumirResultado(['P01', 'P02', 'P03'], regs, '2026-11-08')
    expect(r.coletados).toBe(2)
    expect(r.comOcorrencia).toBe(2)
    expect(r.alvoDominante).toBe('percevejo')
    expect(r.pontosEmAtencao).toContain('P01')
  })
  it('sem ocorrência, não há alvo dominante', () => {
    const r = resumirResultado(['P01'], [reg({ criadoEm: '2026-11-03T14:00:00Z' })], '2026-11-03')
    expect(r.alvoDominante).toBeNull()
    expect(r.comOcorrencia).toBe(0)
  })
})

describe('setor do foco', () => {
  const quadra: [number, number][] = [[-55.92, -13.05], [-55.91, -13.05], [-55.91, -13.06], [-55.92, -13.06]]
  it('aponta o lado do talhão onde os pontos se concentram', () => {
    expect(setorDoFoco(quadra, [[-55.915, -13.0585]])).toBe('sul')
    expect(setorDoFoco(quadra, [[-55.9115, -13.0515]])).toBe('nordeste')
    expect(setorDoFoco(quadra, [[-55.9185, -13.055]])).toBe('oeste')
  })
  it('pontos perto do meio ou espalhados em volta dão "centro"', () => {
    expect(setorDoFoco(quadra, [[-55.915, -13.055]])).toBe('centro')
    expect(setorDoFoco(quadra, [[-55.919, -13.051], [-55.911, -13.059]])).toBe('centro')
  })
  it('sem pontos, não inventa setor', () => expect(setorDoFoco(quadra, [])).toBeNull())
})
