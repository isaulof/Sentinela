import { ALVOS } from '@/knowledge/alvos'
import { avaliarRegistro } from './analise'
import type { Pendencia } from './entidades'
import { metodoDoRegistro, type Registro } from './registro'
import { dataHoraBr } from './tempo'

/** Medida do registro em palavras, a mesma redação em todas as telas. */
export function medidaDoRegistro(r: Registro): string {
  if (r.zero) return 'nenhuma ocorrência'
  if (r.presente !== undefined) return `${r.presente ? 'presente' : 'não encontrado'} · ${r.severidadePct ?? 0}%`
  const base = `${r.quantidade} por metro`
  return r.desfolhaPct !== undefined ? `${base} · desfolha ${r.desfolhaPct}%` : base
}

/** "Percevejo-marrom · 4 por metro · 11/11/2026 13:24 · Nível de ação atingido": a confirmação logo após salvar. */
export const resumoDoRegistro = (r: Registro): string =>
  `${ALVOS[r.alvo].nome} · ${medidaDoRegistro(r)} · ${dataHoraBr(r.criadoEm, r.fusoHorario)} · ${avaliarRegistro(r).titulo}`

/** De onde veio a posição: GPS com precisão e distância ao ponto planejado, ou a posição simulada da demonstração. */
export function posicaoDoRegistro(r: Registro): string {
  if (r.posicaoSimulada) return 'Posição simulada (demonstração)'
  const prec = r.precisaoM !== undefined ? `GPS ±${Math.round(r.precisaoM)} m` : 'GPS'
  const dist = r.distanciaDoPontoM !== undefined ? ` · a ${Math.round(r.distanciaDoPontoM)} m do ponto` : ''
  return prec + dist
}

export type EstadoVersao = 'ativa' | 'corrigida' | 'anulada'
export const estadoDaVersao = (r: Registro): EstadoVersao => (r.anuladoEm ? 'anulada' : r.substituidoPorId ? 'corrigida' : 'ativa')

/** Texto do rastro de auditoria de uma versão ("Corrigido por Ana em 11/11/2026 13:40: recontagem"), ou nada. */
export function rastroDaVersao(r: Registro): string | null {
  if (r.anuladoEm) return `Desfeito por ${r.anuladoPor ?? 'alguém'} em ${dataHoraBr(r.anuladoEm, r.fusoHorario)}${r.motivoAnulacao ? `: ${r.motivoAnulacao}` : ''}`
  if (r.corrigidoEm) return `Corrigido por ${r.corrigidoPor ?? 'alguém'} em ${dataHoraBr(r.corrigidoEm, r.fusoHorario)}: ${r.motivoCorrecao ?? 'sem motivo'}`
  return null
}

/** Condições do dia em uma linha, ou nada quando não foram informadas. */
export function condicoesDoRegistro(r: Registro): string | null {
  const c = r.condicoes
  if (!c) return null
  const p = [c.tempo, c.vento ? `vento ${c.vento}` : null, c.folhaMolhada === undefined ? null : c.folhaMolhada ? 'folha molhada' : 'folha seca'].filter(Boolean)
  return p.length ? p.join(' · ') : null
}

/** Quanto tempo a amostragem durou, em palavras ("2 min"), quando há início e fim. */
export function duracaoDoRegistro(r: Registro): string | null {
  if (!r.inicioEm || !r.fimEm) return null
  const s = Math.round((Date.parse(r.fimEm) - Date.parse(r.inicioEm)) / 1000)
  if (!Number.isFinite(s) || s < 0) return null
  return s < 60 ? 'menos de 1 min' : `${Math.round(s / 60)} min`
}

export interface EntradaFicha { tipo: 'registro' | 'pendencia'; em: string; registro?: Registro; pendencia?: Pendencia }

/** Registros (todas as versões) e achados do ponto numa única linha do tempo, do mais recente ao mais antigo. */
export function linhaDoTempoDoPonto(versoes: readonly Registro[], pendencias: readonly Pendencia[]): EntradaFicha[] {
  return [
    ...versoes.map((registro): EntradaFicha => ({ tipo: 'registro', em: registro.criadoEm, registro })),
    ...pendencias.map((pendencia): EntradaFicha => ({ tipo: 'pendencia', em: pendencia.criadoEm, pendencia })),
  ].sort((a, b) => b.em.localeCompare(a.em) || (b.registro?.versao ?? 1) - (a.registro?.versao ?? 1))
}

export { metodoDoRegistro }
