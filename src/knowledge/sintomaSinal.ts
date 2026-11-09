import type { FonteId } from './fontes'

/** 2.2 Quadro sintoma × sinal. Só consta o que as fontes consultadas descrevem. */
export interface LinhaSintomaSinal {
  doenca: string
  cultura: 'soja' | 'milho (referência)'
  /** O que o produtor vê da porteira. */
  sintoma: string
  /** Estrutura do agente que confirma a doença. */
  sinal: string
  onde: string
  fontes: FonteId[]
  /** Pontos ainda a confirmar nas circulares. */
  aConfirmar?: string
}

export const SINTOMA_SINAL: LinhaSintomaSinal[] = [
  {
    doenca: 'Ferrugem-asiática',
    cultura: 'soja',
    sintoma: 'Pontuações pequenas e amareladas nas folhas do baixeiro, que evoluem para lesões castanhas e amarelecimento, seguido de desfolha.',
    sinal: 'Urédias (pústulas) com esporos, visíveis com lupa.',
    onde: 'Face inferior (abaxial) das folhas, começando pelo baixeiro.',
    fontes: ['ct188'],
    aConfirmar: 'Texto resumido; conferir cores e fases na CT 188.',
  },
  {
    doenca: 'Mofo-branco',
    sintoma: 'Murcha e podridão mole de haste, ramos, flores e vagens, com aspecto encharcado.',
    sinal: 'Micélio branco denso, como algodão, e escleródios pretos e duros.',
    cultura: 'soja',
    onde: 'Haste e axilas, especialmente sob dossel fechado e solo úmido.',
    fontes: ['ct152'],
    aConfirmar: 'Descrição dos sintomas generalizada; conferir na CT 152.',
  },
  {
    doenca: 'Mancha-alvo',
    cultura: 'soja',
    sintoma: 'Manchas circulares castanhas, com halo amarelado, que crescem formando anéis.',
    sinal: 'Pontuações escuras no centro da lesão, sob alta umidade.',
    onde: 'Folhas, do baixeiro ao terço médio.',
    fontes: ['ct139'],
    aConfirmar: 'Sinal (frutificação) a conferir na CT 139.',
  },
  {
    doenca: 'Cercosporiose do milho',
    cultura: 'milho (referência)',
    sintoma: 'Lesões retangulares, cinzentas, delimitadas pelas nervuras e paralelas a elas.',
    sinal: 'Frutificação do fungo em condição de alta umidade e orvalho.',
    onde: 'Folhas do milho, em geral das inferiores para as superiores.',
    fontes: ['cercosporioseMilho'],
    aConfirmar: 'Posição das lesões na planta a conferir; a Embrapa registra confusão com Bipolaris maydis.',
  },
]
