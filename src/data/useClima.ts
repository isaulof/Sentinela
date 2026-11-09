import { useEffect, useState } from 'react'
import type { HoraClima } from '@/domain/climate'
import { db } from './db'
import { buscarClima } from './clima'

export type EstadoClima =
  | { estado: 'carregando' }
  | { estado: 'ok'; horas: HoraClima[]; buscadoEm: string; doCache: boolean }
  | { estado: 'erro'; motivo: string }

/** Busca o clima do talhão; se estiver offline, usa a última leitura guardada no aparelho. */
export function useClima(lat: number | null, lng: number | null, tentativa = 0): EstadoClima {
  const [s, setS] = useState<{ chave: string; v: EstadoClima } | null>(null)
  const chave = lat === null || lng === null ? null : `${lat.toFixed(2)},${lng.toFixed(2)},${tentativa}`

  useEffect(() => {
    if (!chave || lat === null || lng === null) return
    const ctl = new AbortController()
    const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`
    void (async () => {
      try {
        const horas = await buscarClima(lat, lng, fetch, ctl.signal)
        const buscadoEm = new Date().toISOString()
        await db.clima.put({ chave: cacheKey, horas, buscadoEm })
        setS({ chave, v: { estado: 'ok', horas, buscadoEm, doCache: false } })
      } catch (e) {
        if (ctl.signal.aborted) return
        const c = await db.clima.get(cacheKey)
        setS({ chave, v: c ? { estado: 'ok', horas: c.horas, buscadoEm: c.buscadoEm, doCache: true } : { estado: 'erro', motivo: e instanceof Error ? e.message : 'Clima indisponível' } })
      }
    })()
    return () => ctl.abort()
  }, [chave, lat, lng])

  return s && s.chave === chave ? s.v : { estado: 'carregando' }
}
