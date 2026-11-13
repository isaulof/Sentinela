import { test as base, type Route } from '@playwright/test'

/**
 * Todos os testes de tela usam este `test`: a Open-Meteo (clima) responde com dados fixos, em vez da internet de verdade.
 * Assim a tela inicial (que mostra o clima) e os Alertas ficam rápidos, repetíveis e independentes da rede.
 * Para simular falha ou outro tempo, um teste troca a rota: `await page.unroute(...)` e `await page.route(...)`.
 */

export const CLIMA_FIXO = {
  current: { time: '2026-11-12T19:45', interval: 900, temperature_2m: 24.2, relative_humidity_2m: 94, apparent_temperature: 29.5, precipitation: 0, weather_code: 3, wind_speed_10m: 2.4, is_day: 0 },
  daily: { time: ['2026-11-12', '2026-11-13'], temperature_2m_max: [29.9, 31], temperature_2m_min: [22.7, 22.5], precipitation_sum: [12.9, 0.6], precipitation_probability_max: [98, 35], weather_code: [81, 51] },
}

/** Série horária dos últimos 7 dias e dos próximos 2 (formato que os Alertas leem), sempre a partir de hoje. */
function horario() {
  const time: string[] = []
  const hoje = new Date()
  for (let d = -7; d <= 1; d++) {
    const dia = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate() + d)).toISOString().slice(0, 10)
    for (let h = 0; h < 24; h++) time.push(`${dia}T${String(h).padStart(2, '0')}:00`)
  }
  return { hourly: { time, temperature_2m: time.map(() => 24), relative_humidity_2m: time.map(() => 80), precipitation: time.map(() => 0) } }
}

export const responderClima = (corpo: unknown = CLIMA_FIXO) => (route: Route) => {
  const url = new URL(route.request().url())
  return route.fulfill({ json: url.searchParams.has('hourly') ? horario() : corpo })
}

export const URL_CLIMA = 'https://api.open-meteo.com/**'

export const test = base.extend({
  page: async ({ page }, entregar) => {
    await page.route(URL_CLIMA, responderClima())
    await entregar(page)
  },
})
