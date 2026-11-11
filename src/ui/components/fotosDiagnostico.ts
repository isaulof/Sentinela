import type { Candidato } from '@/domain/funil'
import { LISTA_ALVOS } from '@/knowledge/alvos'
import { slugDe, slugDeNome } from '../pages/slug'

/** Arquivos de foto de um problema: pelo id (ferrugem.jpg) e, se houver, pelo nome da Biblioteca. */
export const fotosDoCandidato = (c: Candidato): string[] => {
  const alvo = c.alvo ? LISTA_ALVOS.find((a) => a.id === c.alvo) : undefined
  return [`${c.id}.jpg`, `${alvo ? slugDe(alvo) : slugDeNome(c.nome)}.jpg`]
}

/** Todas as fotos de referência têm a mesma proporção (4:3) e são cortadas pelo centro, para os cartões ficarem iguais. */
export const FOTO_CLASSE = 'aspect-[4/3] w-full object-cover object-center'
