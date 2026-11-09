import type { Alvo } from '@/knowledge/alvos'

export const semAcento = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

/** "Ferrugem-asiática" → "ferrugem-asiatica": o mesmo nome usado nos arquivos de foto. */
export const slugDeNome = (nome: string) => semAcento(nome).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
export const slugDe = (a: Alvo) => slugDeNome(a.nome)
