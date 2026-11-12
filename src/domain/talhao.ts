import type { Finalidade } from './decision'
import { ESTADIOS } from './phenology'

export const NOME_MIN = 2
export const NOME_MAX = 60
export const CULTIVAR_MAX = 40

export interface DadosDoTalhao { nome: string; cultivar: string; dataPlantio: string; estadio: string; finalidade: Finalidade }
export type ErrosDoTalhao = Partial<Record<'nome' | 'cultivar' | 'dataPlantio' | 'estadio' | 'finalidade', string>>

/** Compara nomes sem diferença de maiúscula, acento ou espaço sobrando: "T-01  Mirante" e "t-01 mirante" são o mesmo. */
export const normalizarNome = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

const dataValida = (d: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false
  const t = new Date(`${d}T00:00:00Z`)
  return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === d
}

/**
 * Valida os dados de um talhão ao editar. `outrosNomes` são os nomes dos demais talhões (nome repetido confunde exportações e relatórios);
 * `hoje` é o dia local (yyyy-mm-dd): o plantio não pode ser no futuro.
 */
export function validarDadosTalhao(d: DadosDoTalhao, outrosNomes: readonly string[], hoje: string): { ok: boolean; erros: ErrosDoTalhao } {
  const erros: ErrosDoTalhao = {}
  const nome = d.nome.trim()
  if (nome.length < NOME_MIN) erros.nome = `O nome precisa ter pelo menos ${NOME_MIN} letras.`
  else if (nome.length > NOME_MAX) erros.nome = `O nome pode ter no máximo ${NOME_MAX} letras.`
  else if (outrosNomes.some((o) => normalizarNome(o) === normalizarNome(nome))) erros.nome = 'Já existe outro talhão com esse nome.'
  if (d.cultivar.trim().length > CULTIVAR_MAX) erros.cultivar = `A cultivar pode ter no máximo ${CULTIVAR_MAX} letras.`
  if (!dataValida(d.dataPlantio)) erros.dataPlantio = 'Informe uma data de plantio válida.'
  else if (d.dataPlantio > hoje) erros.dataPlantio = 'O plantio não pode ser em uma data futura.'
  if (!(ESTADIOS as readonly string[]).includes(d.estadio)) erros.estadio = 'Escolha um estádio da lista.'
  if (d.finalidade !== 'graos' && d.finalidade !== 'sementes') erros.finalidade = 'Escolha grãos ou sementes.'
  return { ok: Object.keys(erros).length === 0, erros }
}

/** Confirma a exclusão: o nome digitado tem de ser o do talhão (sem diferença de maiúscula ou espaço). */
export const confirmaExclusao = (digitado: string, nomeDoTalhao: string): boolean => digitado.trim().length > 0 && normalizarNome(digitado) === normalizarNome(nomeDoTalhao)
