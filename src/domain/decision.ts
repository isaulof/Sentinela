import { ALVOS, type AlvoId } from '@/knowledge/alvos'
import type { FonteId } from '@/knowledge/fontes'
import { atingiu, isReprodutivo, type Estadio } from './phenology'

/**
 * Motor de decisão por alvo. Só afirma limites que a fonte sustenta (ver FONTES.md).
 * Alvos sem limite numérico publicado (ferrugem, mofo-branco, mancha-alvo e todas as pragas e doenças que se registram
 * só quando aparecem) geram DETECÇÃO para decisão do agrônomo, nunca uma recomendação de aplicação automática.
 * Exceções, com nível publicado pela Embrapa: lagarta-da-soja (mesmo nível da falsa-medideira, Caderneta), lagartas-das-vagens
 * (Spodoptera), lagarta-helicoverpa, broca-das-axilas e tamanduá-da-soja (Sistemas de Produção 17).
 */
export type Finalidade = 'graos' | 'sementes'

export type Nivel =
  | 'nao_aplicavel' // fora do estádio em que o alvo importa
  | 'abaixo' // abaixo do nível de ação
  | 'proximo' // >= 70% do nível de ação
  | 'atingido' // nível de ação atingido (praga)
  | 'deteccao' // detectado, sem limite numérico: decisão do agrônomo
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
  /** Lagartas-das-vagens (Spodoptera): 10 por metro. */
  spodopteraPorMetro: 10,
  /** Lagarta-helicoverpa (Helicoverpa e Chloridea): 4 por metro na fase vegetativa, 2 na reprodutiva. */
  helicoverpaPorMetro: { vegetativo: 4, reprodutivo: 2 },
  /** Broca-das-axilas: % de plantas com ponteiros atacados (a Embrapa cita 25 a 30%; o app usa o menor). */
  brocaPlantasPct: 25,
  /** Tamanduá-da-soja, adultos por metro: até V3, 1; de V4 a V6, 2; depois de V6 não há perda. */
  tamanduaAteV3: 1,
  tamanduaV4aV6: 2,
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
    case 'broca': {
      const lim = NIVEL_ACAO.brocaPlantasPct
      if (o.quantidade === 0) return { nivel: 'ausente', titulo: 'Nenhuma ocorrência', detalhe: 'O zero é um dado: confirma que o ponto foi inspecionado.', fontes }
      if (o.quantidade >= lim) return { nivel: 'atingido', titulo: 'Nível de ação atingido', detalhe: `${o.quantidade}% das plantas com ponteiros atacados (nível: ${lim}%). Decisão final do agrônomo.`, fontes }
      if (o.quantidade >= lim * NIVEL_ACAO.proximoFracao) return { nivel: 'proximo', titulo: 'Próximo do nível de ação', detalhe: `${o.quantidade}% das plantas com ponteiros atacados (nível: ${lim}%). Reamostrar em 2 a 3 dias.`, fontes }
      return { nivel: 'abaixo', titulo: 'Abaixo do nível de ação', detalhe: `${o.quantidade}% das plantas com ponteiros atacados (nível: ${lim}%).`, fontes }
    }
    case 'tamandua': {
      const lim = tamanduaLimite(o.estadio)
      if (lim === null) return { nivel: 'nao_aplicavel', titulo: 'Sem perdas esperadas neste estádio', detalhe: 'Depois de V6 o tamanduá-da-soja não causa perdas, segundo a Embrapa. Registre mesmo assim.', fontes }
      return porContagem(o.quantidade, lim, `${lim} adulto(s)/m neste estádio`, fontes)
    }
    case 'lagarta':
    case 'anticarsia':
    case 'spodoptera':
    case 'helicoverpa': {
      const desf = o.desfolhaPct ?? 0
      const limDesf = isReprodutivo(o.estadio) ? NIVEL_ACAO.desfolhaReprodutiva : NIVEL_ACAO.desfolhaVegetativa
      const limLagarta = o.alvo === 'spodoptera' ? NIVEL_ACAO.spodopteraPorMetro
        : o.alvo === 'helicoverpa' ? NIVEL_ACAO.helicoverpaPorMetro[isReprodutivo(o.estadio) ? 'reprodutivo' : 'vegetativo']
        : NIVEL_ACAO.lagartaPorMetro
      const porLagarta = porContagem(o.quantidade, limLagarta, o.alvo === 'lagarta' || o.alvo === 'anticarsia' ? `${limLagarta} lagartas > 1,5 cm/m` : `${limLagarta} lagartas/m`, fontes)
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
    default:
      // Sem nível de ação numérico nas fontes: registra a detecção e deixa a decisão com o agrônomo.
      return alvo.tipo === 'praga' ? deteccaoPraga(o, fontes) : deteccao(o, fontes)
  }
}

/** Limite de adultos por metro do tamanduá-da-soja no estádio, ou null quando já não há perdas (depois de V6). */
function tamanduaLimite(e: Estadio): number | null {
  if (!atingiu(e, 'V4')) return NIVEL_ACAO.tamanduaAteV3
  if (!atingiu(e, 'V7')) return NIVEL_ACAO.tamanduaV4aV6
  return null
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
    titulo: `Detecção: ${nome}`,
    detalhe:
      'Não há limite numérico oficial para esta doença nas fontes consultadas. Confirme com foto e sinal (lupa) e encaminhe ao agrônomo, que decide a aplicação.',
    fontes,
  }
}

/** Praga sem nível de ação numérico: qualquer contagem acima de zero é uma detecção, para o agrônomo decidir. */
function deteccaoPraga(o: Observacao, fontes: FonteId[]): Avaliacao {
  const alvo = ALVOS[o.alvo]
  if (o.quantidade === 0) return { nivel: 'ausente', titulo: 'Nenhuma ocorrência', detalhe: 'O zero é um dado: confirma que o ponto foi inspecionado.', fontes }
  return {
    nivel: 'deteccao',
    titulo: `Detecção: ${alvo.nome}`,
    detalhe: `${o.quantidade} ${alvo.unidade} registrado(s). Não há nível de ação numérico para este alvo nas fontes consultadas. Confirme com foto e encaminhe ao agrônomo, que decide o manejo.`,
    fontes,
  }
}
