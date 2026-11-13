import { ALVOS } from '@/knowledge/alvos'
import { avaliarRegistro } from './analise'
import type { Pendencia } from './entidades'
import { metodoDoRegistro, type Registro } from './registro'
import { dataHoraBr, horaLocal } from './tempo'
import type { EstadoPonto } from './ponto'

/** Medida do registro em palavras, a mesma redação em todas as telas. */
export function medidaDoRegistro(r: Registro): string {
  if (r.zero) return 'nenhuma ocorrência'
  if (r.presente !== undefined) return `${r.presente ? 'presente' : 'não encontrado'} · ${r.severidadePct ?? 0}%`
  const base = `${r.quantidade} ${ALVOS[r.alvo].por ?? 'por metro'}`
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

/** "-13,254388" (6 casas = ~11 cm), com vírgula decimal. */
export const coordenada = (n: number): string => n.toFixed(6).replace('.', ',')

/** `largo`: texto longo (método, onde olhar, observação…), que merece a linha inteira no relatório. */
export interface CampoDoRegistro { chave: string; rotulo: string; valor: string; largo?: boolean }

/**
 * Os campos de um registro, na mesma redação para a ficha na tela e para o relatório em PDF.
 * `completo` acrescenta o que só cabe no relatório: estádio, parte da planta, horário da amostragem, protocolo e coordenadas.
 */
export function camposDoRegistro(r: Registro, completo = false): CampoDoRegistro[] {
  const c: CampoDoRegistro[] = []
  const add = (chave: string, rotulo: string, valor: string | null | undefined, largo = false) => { if (valor) c.push({ chave, rotulo, valor, ...(largo ? { largo } : {}) }) }
  if (completo) add('estadio', 'Estádio da soja', r.estadio)
  const usado = r.metodoUsado?.trim()
  add('metodo', usado ? 'Método usado' : 'Método', usado || metodoDoRegistro(r), true)
  if (completo && usado) add('metodoProtocolo', 'Método do protocolo', metodoDoRegistro(r), true)
  if (completo) add('parte', 'Onde olhar', r.parteDaPlanta, true)
  add('plantas', 'Plantas analisadas', r.plantasAnalisadas ? String(r.plantasAnalisadas) : undefined)
  add('amostra', 'Amostra', r.areaAmostrada)
  add('fase', 'Fase', r.fase)
  add('condicoes', 'Condições', condicoesDoRegistro(r))
  add('coletor', 'Coletado por', r.amostrador)
  add('responsavel', 'Responsável técnico', r.responsavel)
  if (completo && r.revisadoPor) add('revisor', 'Revisado por', r.revisadoPor)
  add('posicao', 'Posição', posicaoDoRegistro(r))
  if (completo) {
    add('coordenadas', 'Coordenadas (lat / lon)', `${coordenada(r.posicao[1])} / ${coordenada(r.posicao[0])}`)
    // O ponto planejado só aparece quando difere de onde foi registrado (com posição simulada seria repetir a mesma linha).
    const pl = r.posicaoPlanejada
    if (pl && (coordenada(pl[1]) !== coordenada(r.posicao[1]) || coordenada(pl[0]) !== coordenada(r.posicao[0]))) add('planejada', 'Ponto planejado (lat / lon)', `${coordenada(pl[1])} / ${coordenada(pl[0])}`)
    if (r.inicioEm && r.fimEm) {
      const dur = duracaoDoRegistro(r)
      add('horario', 'Amostragem', `${horaLocal(r.inicioEm, r.fusoHorario)} às ${horaLocal(r.fimEm, r.fusoHorario)}${dur ? ` (${dur})` : ''}`)
    }
    add('protocolo', 'Protocolo', r.protocoloVersao ? `versão ${r.protocoloVersao}` : null)
  }
  if (!completo || !(r.inicioEm && r.fimEm)) add('duracao', 'Duração', duracaoDoRegistro(r)) // no relatório a duração já vai junto do horário
  add('observacao', 'Observação', r.observacao, true)
  return c
}

export interface ResumoDoPonto { pontoId: string; ordem: number; estado: EstadoPonto; planejada: readonly [number, number]; registros: number; ultimo: Registro | null }

/** Uma linha por ponto do plano: estado, coordenada planejada, quantos registros em vigor e o mais recente. */
export function resumoPorPonto(
  plano: { pontos: readonly { id: string; order: number; position: readonly [number, number] }[] },
  ativos: readonly Registro[],
  estados: ReadonlyMap<string, EstadoPonto>,
): ResumoDoPonto[] {
  return [...plano.pontos].sort((a, b) => a.order - b.order).map((p) => {
    const regs = ativos.filter((r) => r.pontoId === p.id).sort((a, b) => a.criadoEm.localeCompare(b.criadoEm))
    return { pontoId: p.id, ordem: p.order, estado: estados.get(p.id) ?? 'a_coletar', planejada: p.position, registros: regs.length, ultimo: regs[regs.length - 1] ?? null }
  })
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
