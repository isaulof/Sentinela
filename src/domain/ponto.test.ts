import { describe, expect, it } from 'vitest'
import type { Nivel } from './decision'
import type { Pendencia } from './entidades'
import { estadoDoPonto, estadosDosPontos } from './ponto'

const pend = (pontoId: string, resolvida = false): Pendencia => ({
  id: `X-${pontoId}`, talhaoId: 'T', pontoId, fotoIds: [], nota: '', estadio: 'R3', amostrador: 'A', criadoEm: '2026-11-09T10:00:00Z',
  ...(resolvida ? { resolvida: { titulo: 'Ferrugem', em: '2026-11-09T11:00:00Z' } } : {}),
})

describe('estadoDoPonto', () => {
  const niveis = new Map<string, Nivel>([['P01', 'ausente'], ['P02', 'atingido'], ['P03', 'deteccao'], ['P04', 'abaixo']])

  it('ponto sem registro está a coletar', () => expect(estadoDoPonto('P09', niveis, [])).toBe('a_coletar'))
  it('mapeia o nível agronômico para o estado visual', () => {
    expect(estadoDoPonto('P01', niveis, [])).toBe('sem_ocorrencia')
    expect(estadoDoPonto('P02', niveis, [])).toBe('acao')
    expect(estadoDoPonto('P03', niveis, [])).toBe('doenca')
    expect(estadoDoPonto('P04', niveis, [])).toBe('leve')
  })
  it('pendência aberta tem prioridade sobre os registros do ponto', () => {
    expect(estadoDoPonto('P02', niveis, [pend('P02')])).toBe('diagnostico')
    expect(estadoDoPonto('P09', niveis, [pend('P09')])).toBe('diagnostico')
  })
  it('diagnóstico anexado marca o ponto como diagnosticado', () => {
    expect(estadoDoPonto('P09', niveis, [pend('P09', true)])).toBe('diagnosticado')
    expect(estadoDoPonto('P01', niveis, [pend('P01', true)])).toBe('diagnosticado')
  })
  it('nível de ação ou doença detectada continua pesando mais que o diagnóstico', () => {
    expect(estadoDoPonto('P02', niveis, [pend('P02', true)])).toBe('acao')
    expect(estadoDoPonto('P03', niveis, [pend('P03', true)])).toBe('doenca')
  })
  it('estadosDosPontos cobre todos os pontos pedidos', () => {
    expect([...estadosDosPontos(['P01', 'P09'], niveis, []).entries()]).toEqual([['P01', 'sem_ocorrencia'], ['P09', 'a_coletar']])
  })
})
