import { describe, expect, it } from 'vitest'
import { ClimaIndisponivel, buscarClima, parseOpenMeteo, urlOpenMeteo } from '@/data/clima'
import { chuvaNasProximasHoras, diaEmCuiaba, instante, horaMolhada, resumoPorDia, riscoFerrugem, riscoMofo, type HoraClima } from './climate'

/** Gera 24 h de um dia com temperatura e nº de horas molhadas controlados. */
function dia(data: string, t: number, molhadas: number): HoraClima[] {
  return Array.from({ length: 24 }, (_, h) => ({
    hora: `${data}T${String(h).padStart(2, '0')}:00`,
    temperaturaC: t,
    umidadePct: h < molhadas ? 95 : 60,
    chuvaMm: 0,
  }))
}
const semana = (t: number, molhadas: number, n = 7) =>
  resumoPorDia(Array.from({ length: n }, (_, i) => dia(`2026-11-0${i + 1}`, t, molhadas)).flat())

describe('molhamento e resumo diário', () => {
  it('hora molhada: UR >= 90% ou chuva', () => {
    expect(horaMolhada({ hora: 'x', temperaturaC: 20, umidadePct: 90, chuvaMm: 0 })).toBe(true)
    expect(horaMolhada({ hora: 'x', temperaturaC: 20, umidadePct: 70, chuvaMm: 0.2 })).toBe(true)
    expect(horaMolhada({ hora: 'x', temperaturaC: 20, umidadePct: 70, chuvaMm: 0 })).toBe(false)
  })
  it('agrega por dia', () => {
    const r = resumoPorDia(dia('2026-11-01', 22, 8))
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ dia: '2026-11-01', horasMolhadas: 8 })
    expect(r[0]!.tMediaC).toBeCloseTo(22)
  })
})

describe('risco de ferrugem e mofo-branco', () => {
  it('alto com 5+ dias favoráveis', () => {
    expect(riscoFerrugem(semana(22, 8)).risco).toBe('alto')
    expect(riscoMofo(semana(20, 12)).risco).toBe('alto')
  })
  it('baixo quando está quente demais para a ferrugem', () => {
    expect(riscoFerrugem(semana(32, 10)).risco).toBe('baixo')
  })
  it('baixo sem molhamento', () => {
    expect(riscoFerrugem(semana(22, 2)).risco).toBe('baixo')
  })
  it('moderado com 3 a 4 dias', () => {
    expect(riscoFerrugem(semana(22, 8, 3)).risco).toBe('moderado')
  })
  it('mofo exige mais molhamento que a ferrugem', () => {
    expect(riscoMofo(semana(20, 8)).risco).toBe('baixo')
    expect(riscoFerrugem(semana(20, 8)).risco).toBe('alto')
  })
})

describe('chuva próxima', () => {
  it('soma a chuva das próximas 6 h', () => {
    const horas: HoraClima[] = [0, 1, 2, 8].map((h) => ({ hora: `2026-11-07T${String(12 + h).padStart(2, '0')}:00:00Z`, temperaturaC: 25, umidadePct: 80, chuvaMm: 1 }))
    expect(chuvaNasProximasHoras(horas, new Date('2026-11-07T12:00:00Z'))).toBe(3)
  })
})

describe('fuso de Cuiabá', () => {
  it('hora local sem fuso é interpretada como UTC-4, independente do fuso do navegador', () => {
    expect(instante('2026-11-07T10:00')).toBe(Date.parse('2026-11-07T14:00:00Z'))
    expect(instante('2026-11-07T14:00:00Z')).toBe(Date.parse('2026-11-07T14:00:00Z'))
  })
  it('dia em Cuiabá vira só depois das 04h UTC', () => {
    expect(diaEmCuiaba(new Date('2026-11-08T03:30:00Z'))).toBe('2026-11-07')
    expect(diaEmCuiaba(new Date('2026-11-08T04:00:00Z'))).toBe('2026-11-08')
  })
})

describe('Open-Meteo', () => {
  const ok = { hourly: { time: ['2026-11-07T10:00', '2026-11-07T11:00'], temperature_2m: [24, null], relative_humidity_2m: [80, 82], precipitation: [0, 0] } }
  it('monta a URL com timezone de Cuiabá', () => {
    const u = urlOpenMeteo(-13.05, -55.92)
    expect(u).toContain('latitude=-13.0500')
    expect(u).toContain('timezone=America%2FCuiaba')
  })
  it('descarta horas com dado faltando', () => expect(parseOpenMeteo(ok)).toHaveLength(1))
  it('rejeita formato inesperado', () => expect(() => parseOpenMeteo({})).toThrow())
  it('buscarClima: sucesso, HTTP erro e falha de rede viram ClimaIndisponivel', async () => {
    const f = (r: Partial<Response> | Error) => (async () => { if (r instanceof Error) throw r; return r as Response }) as unknown as typeof fetch
    expect(await buscarClima(-13, -55, f({ ok: true, json: async () => ok }))).toHaveLength(1)
    await expect(buscarClima(-13, -55, f({ ok: false, status: 500 }))).rejects.toBeInstanceOf(ClimaIndisponivel)
    await expect(buscarClima(-13, -55, f(new Error('offline')))).rejects.toBeInstanceOf(ClimaIndisponivel)
  })
})
