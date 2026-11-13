import { describe, expect, it } from 'vitest'
import type { OrdemChecagem } from './entidades'
import { calcularKpis, ordemPorClima, resolverOrdem } from './hibrido'
import type { Registro } from './registro'

const t0 = new Date('2026-11-07T08:00:00Z')

describe('ordens', () => {
  it('clima: só risco alto gera ordem', () => {
    expect(ordemPorClima('T', 'P01', 'ferrugem', 'moderado', 'x', t0)).toBeUndefined()
    expect(ordemPorClima('T', 'P01', 'mofo', 'alto', 'x', t0)?.motivo).toMatch(/mofo-branco/)
  })
  it('resolver: falso positivo exige a causa e não pode ser resolvido duas vezes', () => {
    const o = ordemPorClima('T', 'P01', 'ferrugem', 'alto', 'o1', t0)!
    expect(() => resolverOrdem(o, { confirmada: false, causa: ' ' }, t0)).toThrow(/causa/)
    const r = resolverOrdem(o, { confirmada: false, causa: 'Herbicida em faixa' }, new Date('2026-11-07T10:00:00Z'), 'reg1')
    expect(r).toMatchObject({ status: 'falso_positivo', causa: 'Herbicida em faixa', registroId: 'reg1' })
    expect(() => resolverOrdem(r, { confirmada: true }, t0)).toThrow(/já foi resolvida/)
    expect(o.status).toBe('aberta') // imutável
  })
})

describe('KPIs', () => {
  const ordem = (id: string, status: OrdemChecagem['status'], horas?: number): OrdemChecagem => ({
    id, talhaoId: 'T', pontoId: 'P01', origem: 'drone', motivo: '', criadaEm: t0.toISOString(), status,
    ...(horas !== undefined ? { resolvidaEm: new Date(t0.getTime() + horas * 3_600_000).toISOString() } : {}),
  })
  const reg = (fotos: string[], zero = false) => ({ fotoIds: fotos, zero }) as Registro
  it('calcula tempo médio, SLA, falsos positivos e fotos', () => {
    const k = calcularKpis(
      [ordem('1', 'confirmada', 2), ordem('2', 'falso_positivo', 30), ordem('3', 'aberta')],
      [reg(['a']), reg([]), reg([], true), reg(['b'])],
    )
    expect(k).toMatchObject({ ordensAbertas: 1, ordensResolvidas: 2, falsosPositivos: 1, confirmadas: 1, aplicacoesEvitadas: 1, dentroDoSla: 50, pontosComFotoPct: 50, zerosRegistrados: 1 })
    expect(k.tempoMedioH).toBe(16)
  })
  it('sem dados devolve null em vez de NaN', () => {
    expect(calcularKpis([], [])).toMatchObject({ tempoMedioH: null, dentroDoSla: null, pontosComFotoPct: null })
  })
})
