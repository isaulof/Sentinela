import { describe, expect, it } from 'vitest'
import { haversineM, type LngLat } from './geo'
import { circuloGeo, formatarDistancia, formatarTempoAPe, guiarAte, linksDeRota, nomeCardeal, raioDeChegada, rumoGraus } from './navegacao'

const base: LngLat = [-55.8, -13.25]
const aoNorte = (m: number): LngLat => [base[0], base[1] + m / 110_574]
const aoLeste = (m: number): LngLat => [base[0] + m / (111_320 * Math.cos((base[1] * Math.PI) / 180)), base[1]]

describe('rumo e direção', () => {
  it('aponta para os quatro lados', () => {
    expect(rumoGraus(base, aoNorte(100))).toBeCloseTo(0, 0)
    expect(rumoGraus(base, aoLeste(100))).toBeCloseTo(90, 0)
    expect(rumoGraus(aoNorte(100), base)).toBeCloseTo(180, 0)
    expect(rumoGraus(aoLeste(100), base)).toBeCloseTo(270, 0)
  })
  it('traduz o rumo em nome de direção', () => {
    expect(nomeCardeal(0)).toBe('norte')
    expect(nomeCardeal(44)).toBe('nordeste')
    expect(nomeCardeal(181)).toBe('sul')
    expect(nomeCardeal(359)).toBe('norte')
    expect(nomeCardeal(-90)).toBe('oeste')
  })
})

describe('texto de distância e tempo', () => {
  it('arredonda sem "tremer": 5 m abaixo de 100 m, 10 m até 1 km, km depois', () => {
    expect(formatarDistancia(3)).toBe('5 m')
    expect(formatarDistancia(0)).toBe('0 m')
    expect(formatarDistancia(47)).toBe('45 m')
    expect(formatarDistancia(142)).toBe('140 m')
    expect(formatarDistancia(999)).toBe('1,0 km')
    expect(formatarDistancia(1240)).toBe('1,2 km')
  })
  it('estima o tempo a pé (≈ 5 km/h)', () => {
    expect(formatarTempoAPe(30)).toBe('menos de 1 min')
    expect(formatarTempoAPe(420)).toBe('~5 min')
    expect(formatarTempoAPe(9000)).toBe('~2 h')
  })
})

describe('chegada ao ponto', () => {
  it('o raio de chegada acompanha a precisão do GPS, entre 10 e 20 m', () => {
    expect(raioDeChegada(3)).toBe(10)
    expect(raioDeChegada(15)).toBe(15)
    expect(raioDeChegada(80)).toBe(20)
  })
  it('só chegou dentro do raio', () => {
    expect(guiarAte(aoNorte(8), 5, base).chegou).toBe(true)
    expect(guiarAte(aoNorte(14), 5, base).chegou).toBe(false)
    expect(guiarAte(aoNorte(14), 15, base).chegou).toBe(true) // GPS impreciso: aceita até a imprecisão
    expect(guiarAte(aoNorte(40), 80, base).chegou).toBe(false) // mas nunca além de 20 m
  })
  it('avisa sinal fraco quando a precisão passa de 30 m', () => {
    expect(guiarAte(aoNorte(100), 12, base).sinalFraco).toBe(false)
    expect(guiarAte(aoNorte(100), 45, base).sinalFraco).toBe(true)
  })
})

describe('guia até o ponto', () => {
  it('distância, rumo e nome da direção', () => {
    const g = guiarAte(base, 8, aoLeste(250))
    expect(g.distanciaM).toBeCloseTo(haversineM(base, aoLeste(250)), 1)
    expect(g.distanciaM).toBeCloseTo(250, -1)
    expect(g.cardeal).toBe('leste')
  })
  it('a seta é relativa para onde a pessoa anda; sem rumo do aparelho, não há seta', () => {
    expect(guiarAte(base, 8, aoLeste(100)).seta).toBeNull()
    expect(guiarAte(base, 8, aoLeste(100), 0)?.seta).toBeCloseTo(90, 0) // andando para o norte, o ponto está à direita
    expect(guiarAte(base, 8, aoLeste(100), 90)?.seta).toBeCloseTo(0, 0) // já de frente para o ponto
    expect(guiarAte(base, 8, aoLeste(100), 180)?.seta).toBeCloseTo(270, 0) // de costas: vira para a esquerda
    expect(guiarAte(base, 8, aoLeste(100), Number.NaN).seta).toBeNull()
  })
})

describe('círculo de imprecisão e rota externa', () => {
  it('o círculo tem o raio pedido em todos os lados', () => {
    const c = circuloGeo(base, 25)
    for (const p of c) expect(haversineM(base, p)).toBeCloseTo(25, 0)
  })
  it('monta os links de rota com o destino', () => {
    const l = linksDeRota([-55.8, -13.25])
    expect(l.google).toContain('destination=-13.250000,-55.800000')
    expect(l.waze).toContain('ll=-13.250000,-55.800000')
  })
})
