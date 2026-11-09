import { ALVOS, type AlvoId } from '@/knowledge/alvos'
import type { FonteId } from '@/knowledge/fontes'
import { atingiu, isReprodutivo, type Estadio } from './phenology'

/**
 * Motor de decisão por alvo. Só afirma limites que a fonte sustenta (ver FONTES.md).
 * Alvos sem limite numérico publicado (ferrugem, mofo-branco, mancha-alvo) geram DETECÇÃO
 * para decisão do agrônomo, nunca uma recomendação de aplicação automática.
 */
export type Finalidade = 'graos' | 'sementes'

export type Nivel =
  | 'nao_aplicavel' // fora do estádio em que o alvo importa
  | 'abaixo' // abaixo do nível de ação
  | 'proximo' // >= 70% do nível de ação
  | 'atingido' // nível de ação atingido (praga)
  | 'deteccao' // doença detectada: decisão do agrônomo
  | 'ausente' // zero registrado

export interface Observacao {
  alvo: AlvoId
  estadio: Estadio
  /** Contagem por unidade de amostragem (percevejo/m, lagarta>1,5cm/m). */
  quantidade: number
  /** Doenças: algum sinal/sintoma confirmado no ponto. */
  presente?: boolean
  severidadePct?: number
  desfolhaPct?: number
  finalidade?: Finalidade
}

export interface Avaliacao {
  nivel: Nivel
  titulo: string
  detalhe: string
  fontes: FonteId[]
}

export const NIVEL_ACAO = {
  percevejo: { graos: 2, sementes: 1 },
  lagartaPorMetro: 20,
  desfolhaVegetativa: 30,
  desfolhaReprodutiva: 15,
  proximoFracao: 0.7,
} as const

const fontesDe = (a: AlvoId): FonteId[] => ALVOS[a].fontes

export function avaliar(o: Observacao): Avaliacao {
  const alvo = ALVOS[o.alvo]
  const fontes = fontesDe(o.alvo)

  if (!atingiu(o.estadio, alvo.estadioMin)) {
    return {
      nivel: 'nao_aplicavel',
      titulo: 'Fora da janela de monitoramento',
      detalhe: `${alvo.nome} é avaliada a partir de ${alvo.estadioMin}. Registre mesmo assim; não há decisão neste estádio.`,
      fontes,
    }
  }

  switch (o.alvo) {
    case 'percevejo': {
      const finalidade = o.finalidade ?? 'graos'
      const nivel = NIVEL_ACAO.percevejo[finalidade]
      if (!isReprodutivo(o.estadio) || !atingiu(o.estadio, 'R3')) {
        return {
          nivel: o.quantidade > 0 ? 'abaixo' : 'ausente',
          titulo: o.quantidade > 0 ? 'Presença sem dano esperado' : 'Sem percevejos',
          detalhe: 'O percevejo-marrom só causa dano com vagens (R3). Continue monitorando; o nível de ação vale a partir de R3.',
          fontes,
        }
      }
      return porContagem(o.quantidade, nivel, `${nivel} percevejo(s)/m (${finalidade === 'graos' ? 'grãos' : 'sementes'})`, fontes)
    }
    case 'lagarta': {
      const desf = o.desfolhaPct ?? 0
      const limDesf = isReprodutivo(o.estadio) ? NIVEL_ACAO.desfolhaReprodutiva : NIVEL_ACAO.desfolhaVegetativa
      const porLagarta = porContagem(o.quantidade, NIVEL_ACAO.lagartaPorMetro, `${NIVEL_ACAO.lagartaPorMetro} lagartas > 1,5 cm/m`, fontes)
      if (desf >= limDesf || porLagarta.nivel === 'atingido') {
        return {
          nivel: 'atingido',
          titulo: 'Nível de ação atingido',
          detalhe:
            desf >= limDesf
              ? `Desfolha de ${desf}% atingiu o limite de ${limDesf}% (${isReprodutivo(o.estadio) ? 'reprodutivo' : 'vegetativo'}).`
              : porLagarta.detalhe,
          fontes,
        }
      }
      if (porLagarta.nivel === 'proximo' || desf >= limDesf * NIVEL_ACAO.proximoFracao) {
        return { nivel: 'proximo', titulo: 'Próximo do nível de ação', detalhe: `${o.quantidade} lagartas/m e desfolha de ${desf}%. Reamostrar em 2 a 3 dias.`, fontes }
      }
      if (desf > 0) {
        return { nivel: 'abaixo', titulo: 'Abaixo do nível de ação', detalhe: `${o.quantidade} lagartas/m e desfolha de ${desf}% (limite: ${limDesf}%).`, fontes }
      }
      return porLagarta
    }
    case 'ferrugem':
    case 'mofo':
    case 'manchaAlvo':
      return deteccao(o, fontes)
  }
}

function porContagem(q: number, nivel: number, rotulo: string, fontes: FonteId[]): Avaliacao {
  if (q === 0) return { nivel: 'ausente', titulo: 'Nenhuma ocorrência', detalhe: 'O zero é um dado: confirma que o ponto foi inspecionado.', fontes }
  if (q >= nivel) return { nivel: 'atingido', titulo: 'Nível de ação atingido', detalhe: `${q} por metro (nível: ${rotulo}). Decisão final do agrônomo.`, fontes }
  if (q >= nivel * NIVEL_ACAO.proximoFracao) return { nivel: 'proximo', titulo: 'Próximo do nível de ação', detalhe: `${q} por metro (nível: ${rotulo}). Reamostrar em 2 a 3 dias.`, fontes }
  return { nivel: 'abaixo', titulo: 'Abaixo do nível de ação', detalhe: `${q} por metro (nível: ${rotulo}).`, fontes }
}

function deteccao(o: Observacao, fontes: FonteId[]): Avaliacao {
  const nome = ALVOS[o.alvo].nome
  if (!o.presente && (o.severidadePct ?? 0) === 0) {
    return { nivel: 'ausente', titulo: 'Sem sinais', detalhe: `${nome} não encontrada neste ponto (registro de zero).`, fontes }
  }
  return {
    nivel: 'deteccao',
    titulo: `${nome} detectada`,
    detalhe:
      'Não há limite numérico oficial para esta doença nas fontes consultadas. Confirme com foto e sinal (lupa) e encaminhe ao agrônomo, que decide a aplicação.',
    fontes,
  }
}
