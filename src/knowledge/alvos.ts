import type { Estadio } from '@/domain/phenology'
import type { FonteId } from './fontes'

/** Os 5 de rotina (monitorados em todo ponto) e os que se registram quando aparecem. */
export type AlvoId =
  | 'percevejo' | 'lagarta' | 'ferrugem' | 'mofo' | 'manchaAlvo'
  | 'anticarsia' | 'helicoverpa' | 'moscaBranca' | 'vaquinha' | 'acaro' | 'pulgao' | 'tamandua' | 'elasmo' | 'coro'
  | 'oidio' | 'finalCiclo' | 'antracnose' | 'bacteriose' | 'olhoDeRa' | 'raizHaste'

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
  /**
   * De rotina: monitorado em todo ponto, e o "Sem ocorrência" registra zero para ele. Os demais (rotina: false) são
   * registrados só quando aparecem, para o toque único não gravar dezenas de zeros.
   */
  rotina: boolean
  /** Unidade curta para mapas e relatórios ("perc./m", "% sev."). */
  unidade: string
  /** Como se lê a contagem de uma praga: "por metro" (padrão), "por folha", "por planta"… */
  por?: string
  /** Mede também a desfolha (%): lagartas e besouros desfolhadores. */
  desfolha?: boolean
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
    rotina: true,
    unidade: 'perc./m',
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
    rotina: true,
    unidade: 'lag./m',
    desfolha: true,
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
    rotina: true,
    unidade: '% sev.',
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
    rotina: true,
    unidade: '% sev.',
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
    rotina: true,
    unidade: '% sev.',
  },
  // ───────── Pragas registradas quando aparecem ─────────
  // Nomes e nomes científicos são os do catálogo do diagnóstico. Sem limite numérico publicado nas fontes do app, a decisão é
  // sempre do agrônomo (o registro vira "detectado"); a exceção é a lagarta-da-soja, que a Caderneta trata junto da falsa-medideira.
  anticarsia: {
    id: 'anticarsia', nome: 'Lagarta-da-soja', cientifico: 'Anticarsia gemmatalis', tipo: 'praga',
    coleta: { metodo: 'Pano de batida de 1 m, mais estimativa visual da desfolha', unidade: 'lagartas maiores que 1,5 cm por metro; desfolha em %', parte: 'Dossel inteiro: lagartas caem no pano, desfolha estimada nas folhas' },
    fases: ['Lagarta pequena (até 1,5 cm)', 'Lagarta grande (maior que 1,5 cm)'], estadioMin: 'V2', fontes: ['caderneta'], rotina: false, unidade: 'lag./m', desfolha: true,
  },
  helicoverpa: {
    id: 'helicoverpa', nome: 'Lagartas das vagens', cientifico: 'Helicoverpa spp.', tipo: 'praga',
    coleta: { metodo: 'Pano de batida de 1 m e inspeção de ponteiros, flores e vagens', unidade: 'lagartas por metro', parte: 'Ponteiros, flores e vagens' },
    fases: ['Lagarta pequena', 'Lagarta grande'], estadioMin: 'VE', fontes: ['projeto'], rotina: false, unidade: 'lag./m',
  },
  moscaBranca: {
    id: 'moscaBranca', nome: 'Mosca-branca', cientifico: 'Bemisia tabaci', tipo: 'praga',
    coleta: { metodo: 'Contagem de adultos na face inferior das folhas (ou armadilha adesiva amarela)', unidade: 'adultos por folha', parte: 'Face inferior das folhas do terço superior' },
    fases: ['Ninfa', 'Adulto'], estadioMin: 'VE', fontes: ['projeto'], rotina: false, unidade: 'ad./folha', por: 'por folha',
  },
  vaquinha: {
    id: 'vaquinha', nome: 'Vaquinhas e besouros pequenos', cientifico: 'Diabrotica speciosa e Cerotoma spp.', tipo: 'praga',
    coleta: { metodo: 'Pano de batida de 1 m, mais estimativa visual da desfolha', unidade: 'besouros por metro; desfolha em %', parte: 'Dossel inteiro: besouros caem no pano, desfolha estimada nas folhas' },
    fases: ['Adulto'], estadioMin: 'VE', fontes: ['projeto'], rotina: false, unidade: 'bes./m', desfolha: true,
  },
  acaro: {
    id: 'acaro', nome: 'Ácaros', cientifico: 'Tetranychus spp. e outros ácaros', tipo: 'praga',
    coleta: { metodo: 'Inspeção visual de folhas com lupa de bolso (10x a 20x)', unidade: 'folhas com ácaros em 10 folhas inspecionadas', parte: 'Face inferior das folhas, de manchas bronzeadas ou com teia' },
    fases: ['Ninfa e adulto', 'Ovos'], estadioMin: 'VE', fontes: ['projeto'], rotina: false, unidade: 'folhas/10', por: 'em 10 folhas',
  },
  pulgao: {
    id: 'pulgao', nome: 'Pulgões', cientifico: 'Aphis spp.', tipo: 'praga',
    coleta: { metodo: 'Inspeção visual de ponteiros e folhas novas', unidade: 'colônias por planta', parte: 'Ponteiros, brotos e folhas novas' },
    fases: ['Colônia sem asas', 'Colônia com alados'], estadioMin: 'VE', fontes: ['projeto'], rotina: false, unidade: 'col./planta', por: 'por planta',
  },
  tamandua: {
    id: 'tamandua', nome: 'Tamanduá-da-soja', cientifico: 'Sternechus subsignatus', tipo: 'praga',
    coleta: { metodo: 'Inspeção das plantas na fileira (adultos na base) e pano de batida', unidade: 'adultos por metro', parte: 'Base das plantas e solo ao redor; haste com galhas' },
    fases: ['Adulto', 'Larva dentro da haste'], estadioMin: 'VE', fontes: ['projeto'], rotina: false, unidade: 'ad./m',
  },
  elasmo: {
    id: 'elasmo', nome: 'Lagarta-elasmo', cientifico: 'Elasmopalpus lignosellus', tipo: 'praga',
    coleta: { metodo: 'Inspeção de plantas murchas ou tombadas na fileira, procurando a lagarta na base', unidade: 'plantas atacadas por metro', parte: 'Colo da planta, na base, junto ao solo' },
    fases: ['Lagarta'], estadioMin: 'VE', fontes: ['projeto'], rotina: false, unidade: 'pl./m',
  },
  coro: {
    id: 'coro', nome: 'Corós (larvas no solo)', cientifico: 'Phyllophaga spp. e outros', tipo: 'praga',
    coleta: { metodo: 'Escavação do solo (trincheira) ao redor das plantas', unidade: 'larvas por trincheira', parte: 'Solo e raízes, até a profundidade da raiz' },
    fases: ['Larva'], estadioMin: 'VE', fontes: ['projeto'], rotina: false, unidade: 'larvas/trinch.', por: 'por trincheira',
  },

  // ───────── Doenças registradas quando aparecem ─────────
  oidio: {
    id: 'oidio', nome: 'Oídio', cientifico: 'Microsphaera diffusa', tipo: 'doenca',
    coleta: { metodo: 'Inspeção visual de folhas, à procura de pó branco', unidade: 'presença/ausência de pó branco e severidade estimada (%)', parte: 'Face superior das folhas, do terço médio para cima' },
    fases: ['Manchas brancas iniciais', 'Cobertura de pó branco'], estadioMin: 'V4', fontes: ['projeto'], rotina: false, unidade: '% sev.',
  },
  finalCiclo: {
    id: 'finalCiclo', nome: 'Doenças de final de ciclo', cientifico: 'Septoria glycines e Cercospora spp.', tipo: 'doenca',
    coleta: { metodo: 'Inspeção visual de folhas, hastes e vagens; estimativa de severidade', unidade: 'presença/ausência de manchas e severidade estimada (%)', parte: 'Folhas do baixeiro e do terço médio, hastes e vagens' },
    fases: ['Manchas iniciais', 'Manchas avançadas e desfolha'], estadioMin: 'R1', fontes: ['ct205'], rotina: false, unidade: '% sev.',
  },
  antracnose: {
    id: 'antracnose', nome: 'Antracnose', cientifico: 'Colletotrichum truncatum', tipo: 'doenca',
    coleta: { metodo: 'Inspeção visual de hastes, pecíolos e vagens', unidade: 'presença/ausência de lesões e severidade estimada (%)', parte: 'Haste, pecíolos e vagens' },
    fases: ['Lesões em haste e pecíolo', 'Lesões em vagens'], estadioMin: 'VE', fontes: ['projeto'], rotina: false, unidade: '% sev.',
  },
  bacteriose: {
    id: 'bacteriose', nome: 'Pústula e crestamento bacteriano', cientifico: 'Xanthomonas e Pseudomonas', tipo: 'doenca',
    coleta: { metodo: 'Inspeção visual de folhas; estimativa de severidade', unidade: 'presença/ausência de lesões e severidade estimada (%)', parte: 'Folhas do terço médio e superior' },
    fases: ['Pústulas iniciais', 'Lesões com halo amarelo'], estadioMin: 'V2', fontes: ['projeto'], rotina: false, unidade: '% sev.',
  },
  olhoDeRa: {
    id: 'olhoDeRa', nome: 'Mancha olho-de-rã', cientifico: 'Cercospora sojina', tipo: 'doenca',
    coleta: { metodo: 'Inspeção visual de folhas; estimativa de severidade', unidade: 'presença/ausência de lesões e severidade estimada (%)', parte: 'Folhas do terço médio e superior' },
    fases: ['Lesões iniciais', 'Lesões com centro claro'], estadioMin: 'V4', fontes: ['projeto'], rotina: false, unidade: '% sev.',
  },
  raizHaste: {
    id: 'raizHaste', nome: 'Podridões de raiz e haste', cientifico: 'Fusarium, Phytophthora, Rhizoctonia e outros', tipo: 'doenca',
    coleta: { metodo: 'Arranque de plantas com sintomas e corte da haste, olhando a raiz e o interior', unidade: 'plantas com sintomas (%)', parte: 'Raiz, colo e interior da haste' },
    fases: ['Sintoma na parte aérea', 'Sintoma na raiz ou haste'], estadioMin: 'VE', fontes: ['projeto'], rotina: false, unidade: '% pl.',
  },
}

export const LISTA_ALVOS: Alvo[] = Object.values(ALVOS)
/** Os 5 monitorados em todo ponto: o "Sem ocorrência" grava zero só para eles. */
export const ALVOS_DE_ROTINA: Alvo[] = LISTA_ALVOS.filter((a) => a.rotina)
export const OUTRAS_PRAGAS: Alvo[] = LISTA_ALVOS.filter((a) => !a.rotina && a.tipo === 'praga')
export const OUTRAS_DOENCAS: Alvo[] = LISTA_ALVOS.filter((a) => !a.rotina && a.tipo === 'doenca')
