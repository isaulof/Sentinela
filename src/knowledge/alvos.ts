import type { Estadio } from '@/domain/phenology'
import type { FonteId } from './fontes'

export type AlvoId = 'percevejo' | 'lagarta' | 'ferrugem' | 'mofo' | 'manchaAlvo'

export interface Alvo {
  id: AlvoId
  nome: string
  cientifico: string
  tipo: 'praga' | 'doenca'
  /** Como coletar: método, unidade e parte da planta (Bloco 1.2). */
  coleta: { metodo: string; unidade: string; parte: string }
  /** Fases que o amostrador pode escolher no registro. */
  fases: string[]
  /** A partir de qual estádio o alvo é monitorado/relevante. */
  estadioMin: Estadio
  fontes: FonteId[]
}

export const ALVOS: Record<AlvoId, Alvo> = {
  percevejo: {
    id: 'percevejo',
    nome: 'Percevejo-marrom',
    cientifico: 'Euschistus heros',
    tipo: 'praga',
    coleta: {
      metodo: 'Pano de batida branco de 1 m, batendo as plantas de uma fileira sobre o pano',
      unidade: 'percevejos por metro (ninfas maiores que 0,5 cm e adultos)',
      parte: 'Plantas da fileira, sobre o pano; contagem logo após a batida',
    },
    fases: ['Ninfa', 'Adulto'],
    estadioMin: 'V4',
    fontes: ['caderneta', 'ct137'],
  },
  lagarta: {
    id: 'lagarta',
    nome: 'Lagarta-falsa-medideira',
    cientifico: 'Chrysodeixis includens',
    tipo: 'praga',
    coleta: {
      metodo: 'Pano de batida de 1 m, mais estimativa visual da desfolha',
      unidade: 'lagartas maiores que 1,5 cm por metro; desfolha em %',
      parte: 'Dossel inteiro: lagartas caem no pano, desfolha estimada nas folhas',
    },
    fases: ['Lagarta pequena (até 1,5 cm)', 'Lagarta grande (maior que 1,5 cm)'],
    estadioMin: 'V2',
    fontes: ['caderneta'],
  },
  ferrugem: {
    id: 'ferrugem',
    nome: 'Ferrugem-asiática',
    cientifico: 'Phakopsora pachyrhizi',
    tipo: 'doenca',
    coleta: {
      metodo: 'Inspeção visual de folhas com lupa de bolso (10x a 20x), à procura de urédias',
      unidade: 'presença/ausência de urédias e severidade estimada (%)',
      parte: 'Face inferior (abaxial) das folhas do baixeiro, depois do terço médio',
    },
    fases: ['Pontuações iniciais', 'Urédias abertas'],
    estadioMin: 'V4',
    fontes: ['ct188'],
  },
  mofo: {
    id: 'mofo',
    nome: 'Mofo-branco',
    cientifico: 'Sclerotinia sclerotiorum',
    tipo: 'doenca',
    coleta: {
      metodo: 'Inspeção visual de plantas e do solo sob o dossel',
      unidade: 'presença/ausência de sintomas, micélio ou escleródios; plantas afetadas (%)',
      parte: 'Haste, axilas e flores; solo úmido sob o dossel (apotécios)',
    },
    fases: ['Apotécios no solo', 'Sintoma na planta'],
    estadioMin: 'R1',
    fontes: ['ct152'],
  },
  manchaAlvo: {
    id: 'manchaAlvo',
    nome: 'Mancha-alvo',
    cientifico: 'Corynespora cassiicola',
    tipo: 'doenca',
    coleta: {
      metodo: 'Inspeção visual de folhas; estimativa de severidade',
      unidade: 'severidade média (% da área foliar) e presença',
      parte: 'Folhas do baixeiro e do terço médio',
    },
    fases: ['Lesões iniciais', 'Lesões com anéis'],
    estadioMin: 'V4',
    fontes: ['ct139'],
  },
}

export const LISTA_ALVOS: Alvo[] = Object.values(ALVOS)
