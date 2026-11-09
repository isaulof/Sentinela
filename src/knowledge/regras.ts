import type { FonteId } from './fontes'

/** 2.3 Diagnose diferencial: regras de decisão no formato SE … E … ENTÃO. */
export interface Regra {
  id: string
  titulo: string
  se: string[]
  entao: string
  senao?: string
  origem: 'fonte' | 'projeto'
  fontes: FonteId[]
}

export const REGRAS: Regra[] = [
  {
    id: 'alvo-x-cercospora',
    titulo: 'Mancha-alvo × complexo de final de ciclo (soja)',
    se: ['a lesão é circular e castanha, com anéis concêntricos e halo amarelado', 'há ponto escuro no centro da lesão (lupa)'],
    entao: 'Compatível com MANCHA-ALVO (Corynespora cassiicola); registrar severidade com foto.',
    senao: 'SE os sintomas surgem no fim do ciclo (R5 em diante) com desfolha precoce ENTÃO compatível com doenças de final de ciclo; confirmar em laboratório.',
    origem: 'fonte',
    fontes: ['ct139', 'ct205'],
  },
  {
    id: 'cercosporiose-milho',
    titulo: 'Referência no milho: cercosporiose × outras manchas',
    se: ['a cultura é MILHO', 'as lesões são retangulares, cinzentas e limitadas pelas nervuras'],
    entao: 'Compatível com CERCOSPORIOSE (Cercospora zeae-maydis). Se as lesões forem ovais e não limitadas pelas nervuras, considerar Bipolaris.',
    origem: 'fonte',
    fontes: ['cercosporioseMilho'],
  },
  {
    id: 'fito-x-fungo',
    titulo: 'Fitotoxicidade por herbicida × infecção fúngica',
    se: ['100% das plantas da faixa de passada estão afetadas', 'o sintoma parou de progredir', 'a folhagem nova nasce sadia'],
    entao: 'Fitotoxicidade provável: NÃO aplicar fungicida; documentar e conferir o histórico de aplicações.',
    senao: 'SE há focos com gradiente, progressão contínua E sinal do fungo na lupa ENTÃO infecção fúngica provável.',
    origem: 'projeto',
    fontes: ['fitotoxicidade'],
  },
]
