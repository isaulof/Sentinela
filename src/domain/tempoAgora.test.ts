import { describe, expect, it } from 'vitest'
import { chuvaDoDia, descreverTempo, grau, milimetros, parseTempoAgora } from './tempoAgora'

const resposta = {
  current: { time: '2026-11-12T19:45', interval: 900, temperature_2m: 24.2, relative_humidity_2m: 94, apparent_temperature: 29.5, precipitation: 0, weather_code: 3, wind_speed_10m: 2.4, is_day: 0 },
  daily: { time: ['2026-11-12', '2026-11-13'], temperature_2m_max: [29.9, 31], temperature_2m_min: [22.7, 22.5], precipitation_sum: [12.9, 0.6], precipitation_probability_max: [98, 35], weather_code: [81, 51] },
}

describe('códigos do tempo em português', () => {
  it('dia e noite trocam o ícone do céu limpo e do parcialmente nublado', () => {
    expect(descreverTempo(0, true)).toEqual({ texto: 'Céu limpo', icone: 'sol' })
    expect(descreverTempo(0, false)).toEqual({ texto: 'Noite limpa', icone: 'lua' })
    expect(descreverTempo(2, true)).toEqual({ texto: 'Parcialmente nublado', icone: 'nuvemsol' })
    expect(descreverTempo(2, false).icone).toBe('nuvemlua')
  })
  it('nublado, neblina, garoa, chuva, pancadas e trovoada', () => {
    expect(descreverTempo(3, true)).toEqual({ texto: 'Nublado', icone: 'nuvem' })
    expect(descreverTempo(45, true).icone).toBe('neblina')
    expect(descreverTempo(53, true)).toEqual({ texto: 'Garoa', icone: 'garoa' })
    expect(descreverTempo(61, true).texto).toBe('Chuva fraca')
    expect(descreverTempo(81, true)).toEqual({ texto: 'Pancadas de chuva', icone: 'chuva' })
    expect(descreverTempo(82, true).texto).toBe('Pancadas fortes de chuva')
    expect(descreverTempo(95, true)).toEqual({ texto: 'Trovoada', icone: 'raio' })
    expect(descreverTempo(99, true).texto).toBe('Trovoada com granizo')
  })
  it('código desconhecido não quebra', () => expect(descreverTempo(1234, true)).toEqual({ texto: 'Tempo indefinido', icone: 'nuvem' }))
})

describe('leitura da resposta da Open-Meteo', () => {
  it('lê a condição atual e os dois dias', () => {
    const t = parseTempoAgora(resposta)
    expect(t.agora).toMatchObject({ temperaturaC: 24.2, sensacaoC: 29.5, umidadePct: 94, chuvaMm: 0, ventoKmh: 2.4, codigo: 3, ehDia: false, em: '2026-11-12T19:45' })
    expect(t.dias).toHaveLength(2)
    expect(t.dias[0]).toEqual({ dia: '2026-11-12', minC: 22.7, maxC: 29.9, chuvaMm: 12.9, probChuvaPct: 98, codigo: 81 })
  })
  it('is_day 1 é dia; campos opcionais ausentes viram nulo (sensação, vento, probabilidade)', () => {
    const t = parseTempoAgora({ current: { time: 'x', temperature_2m: 30, relative_humidity_2m: 50, weather_code: 0, is_day: 1 }, daily: { time: ['2026-11-12'], temperature_2m_max: [33], temperature_2m_min: [21], precipitation_sum: [0], weather_code: [0] } })
    expect(t.agora).toMatchObject({ ehDia: true, sensacaoC: null, ventoKmh: null, chuvaMm: 0 })
    expect(t.dias[0]!.probChuvaPct).toBeNull()
  })
  it('descarta dia incompleto e recusa resposta quebrada', () => {
    const quebrado = { ...resposta, daily: { ...resposta.daily, temperature_2m_max: [29.9, null] } }
    expect(parseTempoAgora(quebrado).dias).toHaveLength(1)
    expect(() => parseTempoAgora(null)).toThrow(/inesperado/)
    expect(() => parseTempoAgora({})).toThrow(/inesperado/)
    expect(() => parseTempoAgora({ ...resposta, current: { ...resposta.current, temperature_2m: 'x' } })).toThrow(/principais/)
    expect(() => parseTempoAgora({ ...resposta, daily: { time: [] } })).toThrow(/previsão/)
    expect(() => parseTempoAgora({ ...resposta, daily: { ...resposta.daily, time: ['2026-11-12'], temperature_2m_max: [null], temperature_2m_min: [null], precipitation_sum: [null], weather_code: [null] } })).toThrow(/previsão/)
  })
})

describe('texto curto para a tela', () => {
  it('temperatura arredondada com grau', () => { expect([24.2, 24.5, 29.9, -0.4].map(grau)).toEqual(['24°', '25°', '30°', '0°']) })
  it('milímetros: inteiro a partir de 1, senão uma casa', () => { expect([12.9, 1, 0.6, 0].map(milimetros)).toEqual(['13 mm', '1 mm', '0,6 mm', '0,0 mm']) })
  it('chuva só é destacada com 1 mm ou mais, ou 50% de chance', () => {
    expect(chuvaDoDia({ dia: 'd', minC: 20, maxC: 30, chuvaMm: 12.9, probChuvaPct: 98, codigo: 81 })).toEqual({ texto: 'Chuva 13 mm · 98%', relevante: true })
    expect(chuvaDoDia({ dia: 'd', minC: 20, maxC: 30, chuvaMm: 0.6, probChuvaPct: 35, codigo: 51 })).toEqual({ texto: 'Sem chuva prevista', relevante: false })
    expect(chuvaDoDia({ dia: 'd', minC: 20, maxC: 30, chuvaMm: 0, probChuvaPct: 60, codigo: 3 }).relevante).toBe(true) // 60% de chance mesmo com 0 mm
    expect(chuvaDoDia({ dia: 'd', minC: 20, maxC: 30, chuvaMm: 2, probChuvaPct: null, codigo: 61 })).toEqual({ texto: 'Chuva 2 mm', relevante: true })
  })
})
