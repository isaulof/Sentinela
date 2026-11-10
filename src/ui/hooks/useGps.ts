import { useEffect, useState } from 'react'
import type { LngLat } from '@/domain/geo'

/** `rumo`: para onde a pessoa está andando, em graus (0 = norte). Só existe em movimento; parado vem nulo. */
export interface Fix { posicao: LngLat; precisaoM: number; rumo: number | null }
export type EstadoGps = { estado: 'desligado' } | { estado: 'procurando' } | { estado: 'ok'; fix: Fix } | { estado: 'erro'; motivo: string }

type Leitura = { fix: Fix } | { erro: string }

/** GPS real. Só liga quando `ativo`; no modo sala de aula fica desligado. */
export function useGps(ativo: boolean): EstadoGps {
  const [leitura, setLeitura] = useState<Leitura | null>(null)
  const temGps = typeof navigator !== 'undefined' && 'geolocation' in navigator

  useEffect(() => {
    if (!ativo || !temGps) return
    const id = navigator.geolocation.watchPosition(
      (g) => setLeitura({ fix: { posicao: [g.coords.longitude, g.coords.latitude], precisaoM: g.coords.accuracy, rumo: typeof g.coords.heading === 'number' && Number.isFinite(g.coords.heading) ? g.coords.heading : null } }),
      (e) => setLeitura({ erro: e.code === 1 ? 'Localização bloqueada. Libere nas permissões do navegador para este site.' : 'Não foi possível obter a posição. Vá para um lugar aberto e tente de novo.' }),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [ativo, temGps])

  if (!ativo) return { estado: 'desligado' }
  if (!temGps) return { estado: 'erro', motivo: 'Este aparelho não tem GPS.' }
  if (!leitura) return { estado: 'procurando' }
  return 'fix' in leitura ? { estado: 'ok', fix: leitura.fix } : { estado: 'erro', motivo: leitura.erro }
}

/** Mantém a tela acesa enquanto `ativo` (celular que dorme para de atualizar o GPS). Sem suporte, não faz nada. */
export function useTelaAcesa(ativo: boolean): void {
  useEffect(() => {
    if (!ativo || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return
    let trava: WakeLockSentinel | null = null
    let vivo = true
    const pedir = () => { navigator.wakeLock.request('screen').then((t) => { if (vivo) trava = t; else void t.release() }).catch(() => { /* bateria baixa ou aba oculta: segue sem */ }) }
    pedir()
    // O navegador solta a trava quando a aba vai para segundo plano; pede de novo ao voltar.
    const aoVoltar = () => { if (document.visibilityState === 'visible') pedir() }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => { vivo = false; document.removeEventListener('visibilitychange', aoVoltar); void trava?.release() }
  }, [ativo])
}
