import type { Alvo, AlvoId } from '@/knowledge/alvos'
import type { IconName } from './Icon'

const ICONE_DA_PRAGA: Partial<Record<AlvoId, IconName>> = {
  percevejo: 'percevejo', lagarta: 'lagarta', anticarsia: 'lagarta', helicoverpa: 'lagarta', spodoptera: 'lagarta', broca: 'lagarta', elasmo: 'lagarta',
  moscaBranca: 'mosquinha', vaquinha: 'besouro', tamandua: 'besouro', acaro: 'acaro', coro: 'larva',
}

/** Ícone de cada alvo do monitoramento: o bicho certo para as pragas, folha para as doenças. */
export function iconeDoAlvo(a: Pick<Alvo, 'id' | 'tipo'>): IconName {
  return ICONE_DA_PRAGA[a.id] ?? (a.tipo === 'praga' ? 'bicho' : 'folha')
}
