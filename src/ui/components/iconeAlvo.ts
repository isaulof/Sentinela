import type { Alvo } from '@/knowledge/alvos'
import type { IconName } from './Icon'

/** Ícone de cada alvo do monitoramento: o bicho certo para as pragas, folha para as doenças. */
export function iconeDoAlvo(a: Pick<Alvo, 'id' | 'tipo'>): IconName {
  if (a.id === 'percevejo') return 'percevejo'
  if (a.id === 'lagarta') return 'lagarta'
  return a.tipo === 'praga' ? 'bicho' : 'folha'
}
