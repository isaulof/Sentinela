import { describe, expect, it } from 'vitest'
import { dataBr, dataHoraBr, dataPorExtenso, diaDaSemanaEData, diaLocal, fimDoDia, horaLocal, safraAtual, saudacao, somarDias } from './tempo'

describe('diaLocal (fuso da fazenda)', () => {
  it('21:30 em Cuiabá (01:30 UTC do dia seguinte) continua no mesmo dia', () => {
    expect(diaLocal('2026-11-12T01:30:00Z')).toBe('2026-11-11')
  })
  it('23:59 e 00:01 locais caem em dias diferentes', () => {
    expect(diaLocal('2026-11-12T03:59:00Z')).toBe('2026-11-11') // 23:59 local
    expect(diaLocal('2026-11-12T04:01:00Z')).toBe('2026-11-12') // 00:01 local
  })
  it('duas coletas da mesma visita (09:00 e 21:30 locais) dão o mesmo dia', () => {
    expect(diaLocal('2026-11-11T13:00:00Z')).toBe(diaLocal('2026-11-12T01:30:00Z'))
  })
  it('aceita Date e número; entrada inválida devolve vazio', () => {
    expect(diaLocal(new Date('2026-11-11T13:00:00Z'))).toBe('2026-11-11')
    expect(diaLocal(Date.parse('2026-11-11T13:00:00Z'))).toBe('2026-11-11')
    expect(diaLocal('lixo')).toBe('')
  })
  it('respeita outro fuso informado (virada de ano)', () => {
    expect(diaLocal('2026-12-31T23:30:00Z', 'Asia/Tokyo')).toBe('2027-01-01')
    expect(diaLocal('2026-12-31T23:30:00Z', 'America/Cuiaba')).toBe('2026-12-31')
  })
})

describe('horaLocal e dataHoraBr', () => {
  it('mostra a hora local, não a UTC', () => {
    expect(horaLocal('2026-11-11T17:24:00Z')).toBe('13:24')
    expect(dataHoraBr('2026-11-11T17:24:00Z')).toBe('11/11/2026 13:24')
  })
  it('meia-noite local aparece como 00:xx e nunca 24:xx', () => {
    expect(horaLocal('2026-11-12T04:05:00Z')).toBe('00:05')
  })
})

describe('fimDoDia', () => {
  it('é o último milissegundo do dia local', () => {
    const f = fimDoDia('2026-11-11')
    expect(f.toISOString()).toBe('2026-11-12T03:59:59.999Z')
    expect(diaLocal(f)).toBe('2026-11-11')
    expect(diaLocal(f.getTime() + 1)).toBe('2026-11-12')
  })
  it('um registro às 21:30 locais fica dentro do dia da visita', () => {
    expect(Date.parse('2026-11-12T01:30:00Z')).toBeLessThanOrEqual(fimDoDia('2026-11-11').getTime())
  })
})

describe('somarDias', () => {
  it('atravessa mês e ano', () => {
    expect(somarDias('2026-11-30', 1)).toBe('2026-12-01')
    expect(somarDias('2026-01-01', -1)).toBe('2025-12-31')
  })
})

describe('texto em português', () => {
  it('data completa e por extenso', () => {
    expect(dataBr('2026-11-11')).toBe('11/11/2026')
    expect(dataPorExtenso('2026-11-11')).toBe('quarta-feira, 11 de novembro de 2026')
  })
  it('data curta, sem o ano', () => {
    expect(diaDaSemanaEData('2026-11-12')).toBe('quinta-feira, 12 de novembro')
    expect(diaDaSemanaEData('2027-01-01')).toBe('sexta-feira, 1 de janeiro')
    expect(diaDaSemanaEData('')).toBe('')
  })
  it('saudação por hora local', () => {
    expect(saudacao('2026-11-11T11:00:00Z')).toBe('Bom dia') // 07:00 local
    expect(saudacao('2026-11-11T17:00:00Z')).toBe('Boa tarde') // 13:00 local
    expect(saudacao('2026-11-12T01:30:00Z')).toBe('Boa noite') // 21:30 local
    expect(saudacao('2026-11-11T07:00:00Z')).toBe('Boa madrugada') // 03:00 local
  })
})

describe('safraAtual', () => {
  it('a safra de soja vira em setembro (data local)', () => {
    expect(safraAtual('2026-11-11T17:00:00Z')).toBe('26/27')
    expect(safraAtual('2026-08-31T17:00:00Z')).toBe('25/26')
    expect(safraAtual('2026-09-01T17:00:00Z')).toBe('26/27')
    expect(safraAtual('2027-01-15T17:00:00Z')).toBe('26/27')
  })
  it('usa o dia local: 31/08 às 21:30 em Cuiabá ainda é safra anterior', () => {
    expect(safraAtual('2026-09-01T01:30:00Z')).toBe('25/26')
  })
})
