import type { HoraClima } from '@/domain/climate'

export function urlOpenMeteo(lat: number, lng: number, diasPassados = 7, diasFuturos = 2): string {
  const q = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    hourly: 'temperature_2m,relative_humidity_2m,precipitation',
    past_days: String(diasPassados),
    forecast_days: String(diasFuturos),
    timezone: 'America/Cuiaba',
  })
  return `https://api.open-meteo.com/v1/forecast?${q}`
}

const ehLista = (v: unknown): v is unknown[] => Array.isArray(v)
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/** Converte a resposta da Open-Meteo em horas completas (descarta horas com dado faltando). */
export function parseOpenMeteo(json: unknown): HoraClima[] {
  const h = (json as { hourly?: Record<string, unknown> } | null)?.hourly
  if (!h || !ehLista(h['time']) || !ehLista(h['temperature_2m']) || !ehLista(h['relative_humidity_2m']) || !ehLista(h['precipitation'])) {
    throw new Error('Resposta da Open-Meteo em formato inesperado.')
  }
  const out: HoraClima[] = []
  h['time'].forEach((hora, i) => {
    const t = num((h['temperature_2m'] as unknown[])[i])
    const u = num((h['relative_humidity_2m'] as unknown[])[i])
    const c = num((h['precipitation'] as unknown[])[i])
    if (typeof hora === 'string' && t !== null && u !== null && c !== null) out.push({ hora, temperaturaC: t, umidadePct: u, chuvaMm: c })
  })
  return out
}

export class ClimaIndisponivel extends Error {
  constructor(motivo: string) {
    super(`Clima indisponível: ${motivo}`)
  }
}

export async function buscarClima(lat: number, lng: number, f: typeof fetch = fetch, sinal?: AbortSignal): Promise<HoraClima[]> {
  try {
    const r = await f(urlOpenMeteo(lat, lng), sinal ? { signal: sinal } : undefined)
    if (!r.ok) throw new ClimaIndisponivel(`HTTP ${r.status}`)
    const horas = parseOpenMeteo(await r.json())
    if (horas.length === 0) throw new ClimaIndisponivel('resposta sem dados')
    return horas
  } catch (e) {
    if (e instanceof ClimaIndisponivel) throw e
    throw new ClimaIndisponivel(e instanceof Error ? e.message : 'falha de rede')
  }
}
