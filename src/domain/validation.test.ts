import { describe, expect, it } from 'vitest'
import type { LngLat } from './geo'
import type { Registro } from './registro'
import codigoFonte from './validation.ts?raw'
import { mediaHistorica, REGRAS_VALIDACAO, validarRegistro, type ContextoValidacao } from './validation'

const agora = new Date('2026-11-07T15:00:00Z')
const base = (o: Partial<Registro> = {}): Registro => ({
  id: 'r1', talhaoId: 'T-02', amostrador: 'Amostrador Teste', criadoEm: '2026-11-07T14:00:00Z', estadio: 'R3', finalidade: 'graos',
  pontoId: 'P07', posicao: [-55.92, -13.05], posicaoSimulada: true, alvo: 'percevejo', fase: 'Adulto',
  quantidade: 1, zero: false, fotoIds: [], observacao: '', ...o,
})
const ctx: ContextoValidacao = { agora, pontosDoPlano: ['P07', 'P08'] }
const regras = (r: Registro, c = ctx) => validarRegistro(r, c).problemas.map((p) => p.regra)

describe('validarRegistro', () => {
  it('aceita um registro correto abaixo do nível', () => {
    const v = validarRegistro(base(), ctx)
    expect(v.ok).toBe(true)
    expect(v.avaliacao.nivel).toBe('abaixo')
  })
  it('V01 bloqueia sem coordenadas', () => {
    expect(regras(base({ posicao: [NaN, NaN] as unknown as LngLat }))).toContain('V01')
    expect(regras(base({ posicao: [-55, 95] }))).toContain('V01')
  })
  it('V02 estádio inválido', () => expect(regras(base({ estadio: 'R9' }))).toContain('V02'))
  it('V03 fase inexistente para o alvo', () => {
    expect(regras(base({ fase: 'Urédia' }))).toContain('V03')
    expect(regras(base({ fase: '' }))).toContain('V03')
  })
  it('V04 limites', () => {
    expect(regras(base({ quantidade: -1 }))).toContain('V04')
    expect(regras(base({ quantidade: 101 }))).toContain('V04')
    expect(regras(base({ alvo: 'lagarta', fase: 'Lagarta grande (maior que 1,5 cm)', desfolhaPct: 120 }))).toContain('V04')
  })
  it('V05 exige zero explícito e rejeita zero com medidas', () => {
    expect(regras(base({ quantidade: 0 }))).toContain('V05')
    expect(regras(base({ quantidade: 0, zero: true }))).not.toContain('V05')
    expect(regras(base({ quantidade: 3, zero: true }))).toContain('V05')
  })
  it('V06 ponto fora do plano', () => expect(regras(base({ pontoId: 'P99' }))).toContain('V06'))
  it('V07 data futura', () => expect(regras(base({ criadoEm: '2026-11-08T00:00:00Z' }))).toContain('V07'))
  it('V08 avisa estádio fora da janela, sem bloquear', () => {
    const v = validarRegistro(base({ estadio: 'V2' }), ctx)
    expect(v.problemas.find((p) => p.regra === 'V08')?.gravidade).toBe('aviso')
    expect(v.ok).toBe(true)
  })
  it('V09 exige foto ao atingir o nível ou detectar doença', () => {
    expect(regras(base({ quantidade: 3 }))).toContain('V09')
    expect(regras(base({ quantidade: 3, fotoIds: ['f1'] }))).not.toContain('V09')
    expect(regras(base({ alvo: 'ferrugem', fase: 'Urédias abertas', quantidade: 0, presente: true }))).toContain('V09')
  })
  it('V10 outlier exige foto', () => {
    const c = { ...ctx, mediaHistorica: 0.5 }
    expect(validarRegistro(base({ quantidade: 3 }), c).problemas.find((p) => p.regra === 'V10')?.gravidade).toBe('erro')
    expect(validarRegistro(base({ quantidade: 3, fotoIds: ['f'] }), c).problemas.find((p) => p.regra === 'V10')?.gravidade).toBe('aviso')
  })
  it('V11 só avalia posição com GPS real', () => {
    const anel: LngLat[] = [[-55.92, -13.05], [-55.918, -13.05], [-55.918, -13.052], [-55.92, -13.052]]
    const longe = base({ posicao: [-55.8, -13.0], posicaoSimulada: false })
    expect(regras(longe, { ...ctx, anelTalhao: anel })).toContain('V11')
    expect(regras({ ...longe, posicaoSimulada: true }, { ...ctx, anelTalhao: anel })).not.toContain('V11')
  })
  it('V12 avisa GPS impreciso', () => {
    expect(regras(base({ posicaoSimulada: false, precisaoM: 40 }))).toContain('V12')
  })
})

describe('mediaHistorica', () => {
  it('exige ao menos 3 valores positivos', () => {
    expect(mediaHistorica([1, 2])).toBeUndefined()
    expect(mediaHistorica([0, 0, 1, 2, 3])).toBe(2)
  })
})

describe('lista de regras mostrada ao técnico', () => {
  it('traz exatamente as regras V01 a V12 que o validador aplica (nenhuma a mais, nenhuma a menos)', () => {
    const aplicadas = [...new Set([...codigoFonte.matchAll(/(?:erro|aviso)\('(V\d\d)'/g)].map((m) => m[1]!))].sort()
    expect(REGRAS_VALIDACAO.map((r) => r.codigo)).toEqual(aplicadas)
    expect(aplicadas).toHaveLength(12)
  })
})
