import { describe, expect, it } from 'vitest'
import { avaliarCanto, deveRecentrar, nivelGps, PRECISAO_MAXIMA_CANTO_M } from './posicao'

describe('centralizar o mapa na posição da pessoa', () => {
  it('ignora a primeira leitura grosseira (rede, quilômetros de erro) e espera uma melhor', () => {
    expect(deveRecentrar(null, 3000)).toBe(false)
    expect(deveRecentrar(null, 100)).toBe(true)
  })
  it('recentraliza quando o GPS melhora bastante e para quando já está bom', () => {
    expect(deveRecentrar(80, 30)).toBe(true) // melhorou mais de 40%
    expect(deveRecentrar(80, 70)).toBe(false) // melhora pequena: não fica pulando
    expect(deveRecentrar(18, 5)).toBe(false) // já estava boa
  })
  it('leitura inválida nunca recentraliza', () => {
    expect(deveRecentrar(null, Number.NaN)).toBe(false)
  })
})

describe('marcar um canto na posição do GPS', () => {
  it('aceita com boa precisão', () => {
    expect(avaliarCanto(6)).toEqual({ ok: true })
    expect(avaliarCanto(PRECISAO_MAXIMA_CANTO_M)).toEqual({ ok: true })
  })
  it('recusa com precisão ruim e explica o que fazer', () => {
    const r = avaliarCanto(80)
    expect(r.ok).toBe(false)
    if (!r.ok) { expect(r.aviso).toMatch(/±80 m/); expect(r.aviso).toMatch(/lugar aberto/) }
  })
  it('recusa precisão desconhecida', () => {
    expect(avaliarCanto(Number.NaN).ok).toBe(false)
  })
  it('classifica o sinal em boa, média e ruim', () => {
    expect([nivelGps(8), nivelGps(25), nivelGps(120)]).toEqual(['boa', 'media', 'ruim'])
  })
})
