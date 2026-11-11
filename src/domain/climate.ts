/**
 * Risco climático (camada IoT/clima do Bloco 4).
 *
 * ATENÇÃO: os índices abaixo são INDICADORES DE PROJETO para priorizar inspeção. Não são um
 * modelo epidemiológico validado nem substituem o coletor de esporos (ferrugem). Os limiares de
 * temperatura do mofo-branco (15–25 °C) vêm da Embrapa (CT 152); os demais limiares são
 * escolhas da equipe, descritas em `LIMIARES` e na tela "Como o risco é calculado".
 */
import { diaLocal } from './tempo'

export interface HoraClima {
  /** ISO local, ex.: 2026-11-07T14:00 */
  hora: string
  temperaturaC: number
  umidadePct: number
  chuvaMm: number
}

export const LIMIARES = {
  /** Hora considerada "molhada" (proxy de molhamento foliar): UR alta ou chuva. */
  umidadeMolhadaPct: 90,
  chuvaMolhadaMm: 0.1,
  ferrugem: { tMin: 18, tMax: 26, horasMolhadasDia: 6, diasModerado: 3, diasAlto: 5 },
  mofo: { tMin: 15, tMax: 25, horasMolhadasDia: 10, diasModerado: 3, diasAlto: 5 },
  janelaDias: 7,
} as const

export type Risco = 'baixo' | 'moderado' | 'alto'

export interface DiaClima {
  dia: string
  tMediaC: number
  horasMolhadas: number
  chuvaMm: number
  umidadeMediaPct: number
}

/** Open-Meteo devolve horas locais sem fuso; o app usa America/Cuiaba (UTC-4, sem horário de verão). */
export const FUSO_CUIABA = '-04:00'
export function instante(hora: string): number {
  return Date.parse(/(Z|[+-]\d{2}:\d{2})$/.test(hora) ? hora : `${hora.length === 16 ? hora + ':00' : hora}${FUSO_CUIABA}`)
}
/** Data (yyyy-mm-dd) em Cuiabá para um instante. Mantido por compatibilidade: use `diaLocal` de `tempo.ts`. */
export const diaEmCuiaba = (d: Date): string => diaLocal(d)

export const horaMolhada = (h: HoraClima): boolean =>
  h.umidadePct >= LIMIARES.umidadeMolhadaPct || h.chuvaMm >= LIMIARES.chuvaMolhadaMm

export function resumoPorDia(horas: readonly HoraClima[]): DiaClima[] {
  const por = new Map<string, HoraClima[]>()
  for (const h of horas) {
    const d = h.hora.slice(0, 10)
    por.set(d, [...(por.get(d) ?? []), h])
  }
  return [...por.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dia, hs]) => ({
      dia,
      tMediaC: hs.reduce((a, h) => a + h.temperaturaC, 0) / hs.length,
      horasMolhadas: hs.filter(horaMolhada).length,
      chuvaMm: hs.reduce((a, h) => a + h.chuvaMm, 0),
      umidadeMediaPct: hs.reduce((a, h) => a + h.umidadePct, 0) / hs.length,
    }))
}

export interface RiscoDoenca {
  risco: Risco
  diasFavoraveis: number
  janelaDias: number
  explicacao: string
}

function classificar(dias: readonly DiaClima[], lim: { tMin: number; tMax: number; horasMolhadasDia: number; diasModerado: number; diasAlto: number }, nome: string): RiscoDoenca {
  const janela = dias.slice(-LIMIARES.janelaDias)
  const fav = janela.filter((d) => d.tMediaC >= lim.tMin && d.tMediaC <= lim.tMax && d.horasMolhadas >= lim.horasMolhadasDia).length
  const risco: Risco = fav >= lim.diasAlto ? 'alto' : fav >= lim.diasModerado ? 'moderado' : 'baixo'
  return {
    risco,
    diasFavoraveis: fav,
    janelaDias: janela.length,
    explicacao: `${fav} de ${janela.length} dias com temperatura média entre ${lim.tMin} e ${lim.tMax} °C e pelo menos ${lim.horasMolhadasDia} h de molhamento estimado (${nome}).`,
  }
}

export const riscoFerrugem = (dias: readonly DiaClima[]): RiscoDoenca => classificar(dias, LIMIARES.ferrugem, 'ferrugem-asiática')
export const riscoMofo = (dias: readonly DiaClima[]): RiscoDoenca => classificar(dias, LIMIARES.mofo, 'mofo-branco')

/** Janela de aplicação/inspeção: sem chuva e vento fraco não são modelados aqui; só chuva imediata. */
export function chuvaNasProximasHoras(horas: readonly HoraClima[], agora: Date, janelaH = 6): number {
  const t0 = agora.getTime()
  return horas
    .filter((h) => {
      const t = instante(h.hora)
      return t >= t0 && t <= t0 + janelaH * 3_600_000
    })
    .reduce((a, h) => a + h.chuvaMm, 0)
}
