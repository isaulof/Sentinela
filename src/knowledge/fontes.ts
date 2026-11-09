/** Registro de fontes. Todo parâmetro agronômico do app aponta para uma destas entradas. */
export interface Fonte {
  id: string
  /** Nome curto para exibir na interface. */
  rotulo: string
  citacao: string
  url?: string
  /** 'confirmada' = valor lido em trecho da fonte; 'projeto' = decisão da equipe, justificada. */
  tipo: 'confirmada' | 'projeto'
}

export const FONTES = {
  caderneta: {
    id: 'caderneta',
    rotulo: 'Caderneta de Monitoramento (Embrapa Soja)',
    citacao: 'EMBRAPA SOJA. Caderneta de monitoramento de pragas da soja (2ª ed.). Londrina: Embrapa Soja.',
    url: 'https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1133611/1/caderneta-monitoramento-2-edicao.pdf',
    tipo: 'confirmada',
  },
  ct137: {
    id: 'ct137',
    rotulo: 'Embrapa Soja, CT 137',
    citacao: 'EMBRAPA SOJA. Circular Técnica 137. Londrina: Embrapa Soja.',
    url: 'https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1095039/1/CIRCULARTECNICA137.pdf',
    tipo: 'confirmada',
  },
  ct139: {
    id: 'ct139',
    rotulo: 'Embrapa Soja, CT 139 (mancha-alvo)',
    citacao: 'EMBRAPA SOJA. Circular Técnica 139: Mancha-alvo. Londrina: Embrapa Soja.',
    url: 'https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1094412/1/CT139ManchaAlvoOL.pdf',
    tipo: 'confirmada',
  },
  ct152: {
    id: 'ct152',
    rotulo: 'Embrapa Soja, CT 152 (mofo-branco)',
    citacao: 'EMBRAPA SOJA. Circular Técnica 152: Mofo-branco. Londrina: Embrapa Soja.',
    url: 'https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1110733/1/CT152OL1.pdf',
    tipo: 'confirmada',
  },
  ct188: {
    id: 'ct188',
    rotulo: 'Embrapa Soja, CT 188 (ferrugem)',
    citacao: 'EMBRAPA SOJA. Circular Técnica 188: Ferrugem-asiática. Londrina: Embrapa Soja.',
    url: 'https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1146522/1/Circ-Tec-188-final.pdf',
    tipo: 'confirmada',
  },
  ct205: {
    id: 'ct205',
    rotulo: 'Embrapa Soja, CT 205 (final de ciclo)',
    citacao: 'EMBRAPA SOJA. Circular Técnica 205: Doenças de final de ciclo. Londrina: Embrapa Soja.',
    url: 'https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1164967/1/Circ-Tec-205-revista.pdf',
    tipo: 'confirmada',
  },
  cercosporioseMilho: {
    id: 'cercosporioseMilho',
    rotulo: 'Embrapa Milho e Sorgo, Circ. 24',
    citacao: 'CASELA, C. R.; FERREIRA, A. S. Cercosporiose do milho. Sete Lagoas: Embrapa Milho e Sorgo (Circ. Téc. 24).',
    url: 'https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/487543/1/Circ24.pdf',
    tipo: 'confirmada',
  },
  fitotoxicidade: {
    id: 'fitotoxicidade',
    rotulo: 'Embrapa Soja, Gazziero & Neumaier (1985)',
    citacao: 'GAZZIERO, D. L. P.; NEUMAIER, N. Sintomas e diagnose de fitotoxicidade de herbicidas em soja. Londrina: Embrapa Soja, 1985.',
    url: 'https://www.infoteca.cnptia.embrapa.br/handle/doc/447406',
    tipo: 'confirmada',
  },
  vazioMT: {
    id: 'vazioMT',
    rotulo: 'Famato/Indea-MT, calendário 2026/27',
    citacao: 'FAMATO/INDEA-MT. Calendário de semeadura da soja em Mato Grosso, safra 2026/27 (vazio sanitário: 8/6 a 6/9/2026).',
    url: 'https://cnabrasil.org.br/noticias/calendario-da-soja-em-mt-mantem-vazio-sanitario-de-junho-a-setembro-para-2026',
    tipo: 'confirmada',
  },
  projeto: {
    id: 'projeto',
    rotulo: 'Decisão de projeto da equipe',
    citacao: 'Decisão de projeto da equipe, justificada no Projeto Técnico (não é norma da Embrapa).',
    tipo: 'projeto',
  },
} as const satisfies Record<string, Fonte>

export type FonteId = keyof typeof FONTES
