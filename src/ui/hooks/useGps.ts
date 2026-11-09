import { useEffect, useState } from 'react'
import type { LngLat } from '@/domain/geo'

export interface Fix { posicao: LngLat; precisaoM: number }
export type EstadoGps = { estado: 'desligado' } | { estado: 'procurando' } | { estado: 'ok'; fix: Fix } | { estado: 'erro'; motivo: string }

type Leitura = { fix: Fix } | { erro: string }

/** GPS real. Só liga quando `ativo`; no modo sala de aula fica desligado. */
export function useGps(ativo: boolean): EstadoGps {
  const [leitura, setLeitura] = useState<Leitura | null>(null)
  const temGps = typeof navigator !== 'undefined' && 'geolocation' in navigator

  useEffect(() => {
    if (!ativo || !temGps) return
    const id = navigator.geolocation.watchPosition(
      (g) => setLeitura({ fix: { posicao: [g.coords.longitude, g.coords.latitude], precisaoM: g.coords.accuracy } }),
      (e) => setLeitura({ erro: e.code === 1 ? 'Permissão de localização negada.' : 'Não foi possível obter a posição.' }),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [ativo, temGps])

  if (!ativo) return { estado: 'desligado' }
  if (!temGps) return { estado: 'erro', motivo: 'Este aparelho não tem GPS.' }
  if (!leitura) return { estado: 'procurando' }
  return 'fix' in leitura ? { estado: 'ok', fix: leitura.fix } : { estado: 'erro', motivo: leitura.erro }
}
