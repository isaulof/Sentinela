import type { Candidato } from '@/domain/funil'
import type { IconName } from './Icon'

export type Categoria = 'doenca' | 'praga' | 'nutricao' | 'produto' | 'clima'

/** Grupo do problema na Biblioteca: doença, praga ou uma das causas não vivas (nutrição, produto/adubo, clima/solo). */
export function categoriaDe(c: Candidato): Categoria {
  if (c.tipo === 'doenca') return 'doenca'
  if (c.tipo === 'praga') return 'praga'
  if (c.id.startsWith('def_')) return 'nutricao'
  if (c.id.startsWith('herb_') || c.id === 'calda' || c.id === 'adubo_queima') return 'produto'
  return 'clima'
}

export const ROTULO_CATEGORIA: Record<Categoria, string> = {
  doenca: 'Doença', praga: 'Praga', nutricao: 'Falta de nutriente', produto: 'Produto ou adubo', clima: 'Clima ou solo',
}

/** Ícone do problema: o bicho certo para as pragas, folha para doença, gota para produto etc. */
export function iconeDoCandidato(c: Candidato): IconName {
  if (c.id.startsWith('percevejo')) return 'percevejo'
  if (['lagarta', 'lagarta_vagem', 'anticarsia', 'elasmo', 'spodoptera', 'broca'].includes(c.id)) return 'lagarta'
  if (c.id === 'coro') return 'larva'
  if (['vaquinha', 'tamandua'].includes(c.id)) return 'besouro'
  if (['mosca_branca', 'pulgao'].includes(c.id)) return 'mosquinha'
  if (c.id === 'acaro') return 'acaro'
  if (c.id === 'nematoide') return 'raiz'
  switch (categoriaDe(c)) {
    case 'doenca': return 'folha'
    case 'nutricao': return 'broto'
    case 'produto': return 'gota'
    case 'clima': return 'nuvem'
    default: return 'bicho'
  }
}
