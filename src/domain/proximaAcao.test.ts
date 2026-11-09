import { describe, expect, it } from 'vitest'
import { proximaAcao, type ResumoTalhaoInicio } from './proximaAcao'

const t = (o: Partial<ResumoTalhaoInicio> & { talhaoId: string }): ResumoTalhaoInicio => ({ nome: o.talhaoId, feitos: 0, total: 10, criticos: 0, ...o })

describe('proximaAcao', () => {
  it('ordem de checagem aberta vem antes de tudo', () => {
    expect(proximaAcao(2, 3, [t({ talhaoId: 'A', feitos: 4 })])).toEqual({ tipo: 'ordens', quantas: 2 })
  })
  it('achado esperando diagnóstico vem antes de continuar a coleta', () => {
    expect(proximaAcao(0, 1, [t({ talhaoId: 'A', feitos: 4 })])).toEqual({ tipo: 'diagnostico', quantas: 1 })
  })
  it('coleta pela metade: continuar', () => {
    expect(proximaAcao(0, 0, [t({ talhaoId: 'A', feitos: 10 }), t({ talhaoId: 'B', feitos: 4 })])).toMatchObject({ tipo: 'continuar', talhaoId: 'B', feitos: 4, total: 10 })
  })
  it('tudo coletado com pontos críticos: ver o mapa do talhão mais crítico', () => {
    expect(proximaAcao(0, 0, [t({ talhaoId: 'A', feitos: 10, criticos: 1 }), t({ talhaoId: 'B', feitos: 10, criticos: 3 })])).toMatchObject({ tipo: 'resultados', talhaoId: 'B', criticos: 3 })
  })
  it('nada iniciado: começar a coleta', () => {
    expect(proximaAcao(0, 0, [t({ talhaoId: 'A' })])).toMatchObject({ tipo: 'comecar', talhaoId: 'A' })
  })
  it('tudo coletado e sem críticos: em dia', () => {
    expect(proximaAcao(0, 0, [t({ talhaoId: 'A', feitos: 10 })])).toEqual({ tipo: 'em_dia' })
  })
  it('talhão sem plano não conta', () => {
    expect(proximaAcao(0, 0, [t({ talhaoId: 'A', total: 0 })])).toEqual({ tipo: 'em_dia' })
  })
})
