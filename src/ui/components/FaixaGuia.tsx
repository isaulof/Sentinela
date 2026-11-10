import { useEffect, useRef } from 'react'
import type { LngLat } from '@/domain/geo'
import { DISTANCIA_DE_CARRO_M, formatarDistancia, formatarTempoAPe, guiarAte, linksDeRota } from '@/domain/navegacao'
import type { EstadoGps } from '../hooks/useGps'
import { useToast } from '../state/toast'
import { Icon } from './Icon'

interface Props {
  gps: EstadoGps
  alvo: { id: string; ordem: number; posicao: LngLat }
  onParar: () => void
}

/** Faixa do guia sobre o mapa da Coleta: distância, direção, tempo a pé, precisão do GPS e aviso de chegada. */
export function FaixaGuia({ gps, alvo, onParar }: Props) {
  const mostrar = useToast((s) => s.mostrar)
  const guia = gps.estado === 'ok' ? guiarAte(gps.fix.posicao, gps.fix.precisaoM, alvo.posicao, gps.fix.rumo) : null
  const chegou = guia?.chegou ?? false
  const precisao = gps.estado === 'ok' ? Math.round(gps.fix.precisaoM) : 0

  // Avisa uma vez por ponto (toast + vibração). Só "rearma" se a pessoa se afastar de verdade, para o GPS oscilando não repetir o aviso.
  const avisado = useRef<string | null>(null)
  useEffect(() => {
    if (chegou && avisado.current !== alvo.id) {
      avisado.current = alvo.id
      mostrar(`Você chegou ao ponto ${alvo.ordem}`)
      try { navigator.vibrate?.([180, 80, 180]) } catch { /* sem vibração: segue */ }
    }
  }, [chegou, alvo.id, alvo.ordem, mostrar])
  const longe = guia ? guia.distanciaM > 40 : false
  useEffect(() => { if (longe && avisado.current === alvo.id) avisado.current = null }, [longe, alvo.id])

  const links = linksDeRota(alvo.posicao)
  const base = 'absolute left-2.5 right-[3.75rem] top-2.5 z-10 rounded-2xl px-3 py-2.5 shadow-lift ring-1'

  return (
    <div className={`${base} ${chegou ? 'bg-brand text-on-brand ring-brand' : 'bg-surface text-text ring-line'}`}>
      <p className="sr-only" role="status" aria-live="assertive">{chegou ? `Você chegou ao ponto ${alvo.ordem}` : ''}</p>
      <div className="flex items-start gap-3">
        {guia?.seta != null ? (
          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand"><Icon name="cima" size={24} style={{ transform: `rotate(${Math.round(guia.seta)}deg)`, transition: 'transform .4s' }} /></span>
        ) : (
          <span aria-hidden className={`grid size-10 shrink-0 place-items-center rounded-full ${chegou ? 'bg-white/20' : 'bg-brand-soft text-brand'}`}><Icon name={chegou ? 'check' : 'local'} size={22} /></span>
        )}
        <div className="min-w-0 flex-1">
          {gps.estado === 'erro' ? (
            <p className="font-semibold leading-snug">{gps.motivo}</p>
          ) : !guia ? (
            <p className="font-semibold">Procurando sinal de GPS…</p>
          ) : chegou ? (
            <>
              <p className="text-lg font-bold leading-tight">Você chegou ao ponto {alvo.ordem}</p>
              <p className="text-sm opacity-90">Registre o que encontrou. GPS ±{precisao} m</p>
            </>
          ) : (
            <>
              <p className="flex items-baseline gap-2"><span className="text-2xl font-bold leading-none tabular-nums">{formatarDistancia(guia.distanciaM)}</span><span className={`text-xs ${guia.sinalFraco ? 'font-semibold text-warn' : 'text-text-2'}`}>GPS ±{precisao} m</span></p>
              <p className="mt-0.5 text-sm text-text-2">Ponto {alvo.ordem} · {guia.cardeal} · {formatarTempoAPe(guia.distanciaM)}</p>
              {guia.seta != null && <p className="text-xs text-text-2">Siga na direção da seta.</p>}
              {guia.sinalFraco && <p className="text-xs font-semibold text-warn">Sinal fraco: vá para um lugar aberto.</p>}
            </>
          )}
        </div>
        <button type="button" onClick={onParar} aria-label="Parar o guia" className={`grid size-10 shrink-0 place-items-center rounded-full transition active:scale-95 ${chegou ? 'hover:bg-white/15' : 'text-text-2 hover:bg-surface-2'}`}><Icon name="x" size={20} /></button>
      </div>
      {guia && guia.distanciaM > DISTANCIA_DE_CARRO_M && (
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-2 text-sm">
          <span className="text-text-2">Está longe? Rota de carro:</span>
          <a href={links.google} target="_blank" rel="noreferrer" className="font-semibold text-brand underline">Google Maps</a>
          <a href={links.waze} target="_blank" rel="noreferrer" className="font-semibold text-brand underline">Waze</a>
        </p>
      )}
    </div>
  )
}
