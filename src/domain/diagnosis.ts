import type { FonteId } from '@/knowledge/fontes'

/** Árvore de decisão diagnóstica como dado. O motor é genérico; o conteúdo vive em knowledge/. */
export type Categoria = 'abiotico' | 'biotico' | 'inconclusivo' | 'investigar'

export interface Opcao {
  rotulo: string
  destino: string
  /** Nome de ícone SVG do app (decorativo) para quem não é técnico reconhecer a opção. */
  icone?: string
  /** Frase curta que explica a opção em linguagem simples. */
  detalhe?: string
}
export interface NoPergunta {
  tipo: 'pergunta'
  texto: string
  /** Como observar em campo (ajuda ao técnico). */
  dica?: string
  opcoes: Opcao[]
}
export interface NoResultado {
  tipo: 'resultado'
  titulo: string
  categoria: Categoria
  explicacao: string
  /** O que fazer antes de qualquer aplicação. */
  proximosPassos: string[]
  /** Quando preenchido, a tela oferece registrar este alvo no Campo. */
  alvo?: 'percevejo' | 'lagarta' | 'ferrugem' | 'mofo' | 'manchaAlvo'
  /** 'chamar': situação em que o produtor deve acionar o agrônomo logo. */
  urgencia?: 'acompanhar' | 'chamar'
}
export type No = NoPergunta | NoResultado

export interface Arvore {
  id: string
  titulo: string
  descricao: string
  raiz: string
  nos: Record<string, No>
  fontes: FonteId[]
  /** 'projeto': raciocínio agronômico da equipe, não regra publicada. */
  origem: 'fonte' | 'projeto'
}

export interface Passo {
  noId: string
  no: No
  /** Respostas dadas até aqui (rótulos), na ordem. */
  trilha: { pergunta: string; resposta: string }[]
}

export function percorrer(arvore: Arvore, respostas: readonly number[]): Passo {
  let noId = arvore.raiz
  const trilha: Passo['trilha'] = []
  for (const idx of respostas) {
    const no = arvore.nos[noId]
    if (!no || no.tipo !== 'pergunta') break
    const op = no.opcoes[idx]
    if (!op) throw new RangeError(`Opção ${idx} inexistente em "${noId}"`)
    trilha.push({ pergunta: no.texto, resposta: op.rotulo })
    noId = op.destino
  }
  const no = arvore.nos[noId]
  if (!no) throw new Error(`Nó "${noId}" não existe na árvore ${arvore.id}`)
  return { noId, no, trilha }
}

/** Verifica: destinos existentes, raiz válida, nós alcançáveis, sem ciclos, todo caminho chega a um resultado. */
export function validarArvore(a: Arvore): string[] {
  const erros: string[] = []
  if (!a.nos[a.raiz]) return [`raiz "${a.raiz}" inexistente`]
  const visitados = new Set<string>()
  const pilha = new Set<string>()
  const visitar = (id: string): void => {
    const no = a.nos[id]
    if (!no) return void erros.push(`destino "${id}" inexistente`)
    if (pilha.has(id)) return void erros.push(`ciclo em "${id}"`)
    if (visitados.has(id)) return
    visitados.add(id)
    if (no.tipo === 'pergunta') {
      if (no.opcoes.length < 2) erros.push(`pergunta "${id}" tem menos de 2 opções`)
      pilha.add(id)
      no.opcoes.forEach((o) => visitar(o.destino))
      pilha.delete(id)
    } else if (no.proximosPassos.length === 0) erros.push(`resultado "${id}" sem próximos passos`)
  }
  visitar(a.raiz)
  for (const id of Object.keys(a.nos)) if (!visitados.has(id)) erros.push(`nó "${id}" inalcançável`)
  return erros
}
