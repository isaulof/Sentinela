import { useEffect, useState } from 'react'
import { parseTempoAgora, type TempoAgora } from '@/domain/tempoAgora'
import { db } from './db'

/** Open-Meteo: gratuita, sem chave e sem cadastro. Pede só o que a tela inicial usa (resposta de ~1 KB). */
export function urlTempoAgora(lat: number, lng: number): string {
  const q = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lng.toFixed(4),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,is_day',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code',
    timezone: 'America/Cuiaba',
    forecast_days: '5',
  })
  return `https://api.open-meteo.com/v1/forecast?${q}`
}

export const PRAZO_BUSCA_MS = 8000
export const RENOVAR_A_CADA_MS = 15 * 60_000

export async function buscarTempoAgora(lat: number, lng: number, f: typeof fetch = fetch, prazoMs = PRAZO_BUSCA_MS): Promise<TempoAgora> {
  const ctl = new AbortController()
  const relogio = setTimeout(() => ctl.abort(), prazoMs) // sem internet o pedido pode ficar pendurado: desiste e usa o último que está guardado
  try {
    const r = await f(urlTempoAgora(lat, lng), { signal: ctl.signal })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return parseTempoAgora(await r.json())
  } finally {
    clearTimeout(relogio)
  }
}

export type EstadoTempo =
  | { estado: 'carregando' }
  | { estado: 'ok'; dados: TempoAgora; buscadoEm: string; doCache: boolean }
  | { estado: 'erro'; motivo: string }

interface Guardado { dados: TempoAgora; buscadoEm: string }
const chaveDoCache = (lat: number, lng: number) => `tempo-agora:${lat.toFixed(2)},${lng.toFixed(2)}`

/** Clima de agora no local; sem internet mostra o último guardado no aparelho (marcado como "do cache"). Renova a cada 15 minutos. */
export function useTempoAgora(lat: number, lng: number): EstadoTempo {
  const [s, setS] = useState<{ chave: string; v: EstadoTempo } | null>(null)
  const [volta, setVolta] = useState(0)
  const chave = `${lat.toFixed(2)},${lng.toFixed(2)},${volta}`

  useEffect(() => {
    const id = setInterval(() => setVolta((v) => v + 1), RENOVAR_A_CADA_MS)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    let vivo = true
    void (async () => {
      try {
        const dados = await buscarTempoAgora(lat, lng)
        const buscadoEm = new Date().toISOString()
        await db.config.put({ chave: chaveDoCache(lat, lng), valor: { dados, buscadoEm } satisfies Guardado }).catch(() => undefined)
        if (vivo) setS({ chave, v: { estado: 'ok', dados, buscadoEm, doCache: false } })
      } catch (e) {
        const guardado = (await db.config.get(chaveDoCache(lat, lng)).catch(() => undefined))?.valor as Guardado | undefined
        if (!vivo) return
        setS({ chave, v: guardado ? { estado: 'ok', dados: guardado.dados, buscadoEm: guardado.buscadoEm, doCache: true } : { estado: 'erro', motivo: e instanceof Error ? e.message : 'Clima indisponível' } })
      }
    })()
    return () => { vivo = false }
  }, [chave, lat, lng])

  return s && s.chave === chave ? s.v : { estado: 'carregando' }
}
