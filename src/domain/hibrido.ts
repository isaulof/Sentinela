import type { OrdemChecagem, PlanoSalvo } from './entidades'
import { haversineM, type LngLat } from './geo'
import type { Risco } from './climate'
import type { Registro } from './registro'

/**
 * Camada híbrida 5.0 (Bloco 4): IoT/clima e drone geram ALERTAS; só a checagem humana em campo
 * confirma; a decisão de aplicar é do agrônomo. Nenhuma função aqui "decide aplicar".
 */
export const SLA_CHECAGEM_H = 24

export interface AnomaliaDrone {
  posicao: LngLat
  indice: 'NDVI' | 'NDRE'
  valor: number
  /** Valor típico da área sadia do talhão, para dar contexto. */
  referencia: number
  areaM2: number
}

export function pontoMaisProximo(plano: Pick<PlanoSalvo, 'pontos'>, posicao: LngLat): { pontoId: string; distanciaM: number } | undefined {
  let melhor: { pontoId: string; distanciaM: number } | undefined
  for (const p of plano.pontos) {
    const d = haversineM(p.position, posicao)
    if (!melhor || d < melhor.distanciaM) melhor = { pontoId: p.id, distanciaM: d }
  }
  return melhor
}

export function ordemPorDrone(talhaoId: string, plano: Pick<PlanoSalvo, 'pontos'>, a: AnomaliaDrone, id: string, agora: Date): OrdemChecagem | undefined {
  const alvo = pontoMaisProximo(plano, a.posicao)
  if (!alvo) return undefined
  const queda = Math.round((1 - a.valor / a.referencia) * 100)
  return {
    id, talhaoId, pontoId: alvo.pontoId, origem: 'drone', criadaEm: agora.toISOString(), status: 'aberta',
    motivo: `${a.indice} ${a.valor.toFixed(2)} (${queda}% abaixo do talhão), anomalia de ${Math.round(a.areaM2)} m² a ${Math.round(alvo.distanciaM)} m do ponto ${alvo.pontoId}.`,
  }
}

export function ordemPorClima(talhaoId: string, pontoId: string, doenca: 'ferrugem' | 'mofo', risco: Risco, id: string, agora: Date): OrdemChecagem | undefined {
  if (risco !== 'alto') return undefined
  const nome = doenca === 'ferrugem' ? 'ferrugem-asiática' : 'mofo-branco'
  return {
    id, talhaoId, pontoId, origem: 'clima', criadaEm: agora.toISOString(), status: 'aberta',
    motivo: `Condições favoráveis a ${nome} nos últimos dias. Inspecione o ponto ${pontoId} em busca de sinais.`,
  }
}

export type ResultadoChecagem = { confirmada: true } | { confirmada: false; causa: string }

export function resolverOrdem(o: OrdemChecagem, r: ResultadoChecagem, agora: Date, registroId?: string): OrdemChecagem {
  if (o.status !== 'aberta') throw new Error('Esta ordem já foi resolvida.')
  if (!r.confirmada && r.causa.trim().length < 3) throw new Error('Informe a causa encontrada (ex.: herbicida, compactação, estresse hídrico).')
  return {
    ...o,
    status: r.confirmada ? 'confirmada' : 'falso_positivo',
    resolvidaEm: agora.toISOString(),
    ...(r.confirmada ? {} : { causa: r.causa.trim() }),
    ...(registroId ? { registroId } : {}),
  }
}

export interface Kpis {
  ordensAbertas: number
  ordensResolvidas: number
  /** Tempo médio do alerta à confirmação, em horas. */
  tempoMedioH: number | null
  dentroDoSla: number | null
  falsosPositivos: number
  confirmadas: number
  /** Cada falso positivo resolvido em campo é uma aplicação que não foi recomendada sem checar. */
  aplicacoesEvitadas: number
  pontosComFotoPct: number | null
  zerosRegistrados: number
}

export function calcularKpis(ordens: readonly OrdemChecagem[], registros: readonly Registro[]): Kpis {
  const resolvidas = ordens.filter((o) => o.status !== 'aberta' && o.resolvidaEm)
  const horas = resolvidas.map((o) => (Date.parse(o.resolvidaEm!) - Date.parse(o.criadaEm)) / 3_600_000)
  const fp = resolvidas.filter((o) => o.status === 'falso_positivo').length
  return {
    ordensAbertas: ordens.filter((o) => o.status === 'aberta').length,
    ordensResolvidas: resolvidas.length,
    tempoMedioH: horas.length ? horas.reduce((a, b) => a + b, 0) / horas.length : null,
    dentroDoSla: horas.length ? Math.round((horas.filter((h) => h <= SLA_CHECAGEM_H).length / horas.length) * 100) : null,
    falsosPositivos: fp,
    confirmadas: resolvidas.length - fp,
    aplicacoesEvitadas: fp,
    pontosComFotoPct: registros.length ? Math.round((registros.filter((r) => r.fotoIds.length > 0).length / registros.length) * 100) : null,
    zerosRegistrados: registros.filter((r) => r.zero).length,
  }
}
