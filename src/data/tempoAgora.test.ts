import { describe, expect, it, vi } from 'vitest'
import { buscarTempoAgora, urlTempoAgora } from './tempoAgora'

const corpo = {
  current: { time: '2026-11-12T19:45', temperature_2m: 24.2, relative_humidity_2m: 94, apparent_temperature: 29.5, precipitation: 0, weather_code: 3, wind_speed_10m: 2.4, is_day: 0 },
  daily: { time: ['2026-11-12'], temperature_2m_max: [29.9], temperature_2m_min: [22.7], precipitation_sum: [12.9], precipitation_probability_max: [98], weather_code: [81] },
}
const resposta = (o: Partial<{ ok: boolean; status: number; json: unknown }> = {}) => ({ ok: o.ok ?? true, status: o.status ?? 200, json: async () => o.json ?? corpo }) as Response

describe('consulta do clima de agora', () => {
  it('monta a URL da Open-Meteo só com o que a tela usa, no fuso de Cuiabá', () => {
    const u = new URL(urlTempoAgora(-13.050912, -55.9096))
    expect(u.origin + u.pathname).toBe('https://api.open-meteo.com/v1/forecast')
    expect(u.searchParams.get('latitude')).toBe('-13.0509')
    expect(u.searchParams.get('longitude')).toBe('-55.9096')
    expect(u.searchParams.get('timezone')).toBe('America/Cuiaba')
    expect(u.searchParams.get('forecast_days')).toBe('5')
    expect(u.searchParams.get('current')).toContain('weather_code')
    expect(u.searchParams.get('daily')).toContain('precipitation_sum')
    expect(u.search).not.toMatch(/key|token|apikey/i) // sem chave: a API é livre
  })
  it('devolve os dados lidos da resposta', async () => {
    const f = vi.fn(async () => resposta())
    const t = await buscarTempoAgora(-13.05, -55.9, f as unknown as typeof fetch)
    expect(t.agora.temperaturaC).toBe(24.2)
    expect(f).toHaveBeenCalledOnce()
  })
  it('HTTP com erro, resposta quebrada e rede fora viram erro (a tela usa o cache)', async () => {
    await expect(buscarTempoAgora(0, 0, (async () => resposta({ ok: false, status: 503 })) as unknown as typeof fetch)).rejects.toThrow(/503/)
    await expect(buscarTempoAgora(0, 0, (async () => resposta({ json: { foo: 1 } })) as unknown as typeof fetch)).rejects.toThrow(/inesperado/)
    await expect(buscarTempoAgora(0, 0, (async () => { throw new TypeError('Failed to fetch') }) as unknown as typeof fetch)).rejects.toThrow(/Failed/)
  })
  it('desiste de um pedido pendurado depois do prazo, em vez de ficar carregando para sempre', async () => {
    const pendurado = ((_u: string, o?: RequestInit) => new Promise((_ok, erro) => { o?.signal?.addEventListener('abort', () => erro(new DOMException('abortado', 'AbortError'))) })) as unknown as typeof fetch
    await expect(buscarTempoAgora(0, 0, pendurado, 30)).rejects.toThrow(/abort/i)
  })
})
