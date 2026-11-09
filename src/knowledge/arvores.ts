import type { Arvore, NoResultado } from '@/domain/diagnosis'

const res = (r: Omit<NoResultado, 'tipo'>): NoResultado => ({ tipo: 'resultado', ...r })

const PASSOS_COMUNS = [
  'Fotografar a área e a planta (visão geral e detalhe).',
  'Marcar a posição no mapa e comparar com uma área sadia vizinha.',
  'Não recomendar aplicação antes da confirmação de um agrônomo.',
]

/** 2.1 Triagem biótico × abiótico: padrão de distribuição, presença de sinais e evolução no tempo. */
export const TRIAGEM: Arvore = {
  id: 'triagem',
  titulo: 'Triagem biótico × abiótico',
  descricao: 'Parte de “planta com sintoma” e chega a uma hipótese, usando padrão no talhão, sinais e evolução no tempo.',
  raiz: 'padrao',
  fontes: ['fitotoxicidade', 'projeto'],
  origem: 'projeto',
  nos: {
    padrao: {
      tipo: 'pergunta',
      texto: 'Como o sintoma está distribuído no talhão?',
      dica: 'Ande pela área e observe de cima do terreno, se possível. Compare com o mapa de operações.',
      opcoes: [
        { rotulo: 'Faixas retas, alinhadas a passadas de máquina, ou borda seca bem definida', destino: 'operacional' },
        { rotulo: 'Reboleiras ou focos, com gradiente (centro mais afetado)', destino: 'sinais' },
        { rotulo: 'Uniforme em toda a área', destino: 'evolucao' },
        { rotulo: 'Plantas isoladas, sem padrão', destino: 'sinais' },
      ],
    },
    operacional: {
      tipo: 'pergunta',
      texto: 'A largura da faixa coincide com a barra do pulverizador, do distribuidor ou da plantadeira?',
      dica: 'Meça a faixa e compare com a largura de trabalho do implemento no registro de operações.',
      opcoes: [
        { rotulo: 'Sim, coincide', destino: 'operacional_novas' },
        { rotulo: 'Não coincide', destino: 'sinais' },
      ],
    },
    operacional_novas: {
      tipo: 'pergunta',
      texto: 'As folhas novas, surgidas depois do evento, estão sadias e o sintoma deixou de avançar?',
      opcoes: [
        { rotulo: 'Sim', destino: 'abiotico_operacional' },
        { rotulo: 'Não, o sintoma continua avançando', destino: 'sinais' },
      ],
    },
    sinais: {
      tipo: 'pergunta',
      texto: 'Com lupa (10x a 20x) há sinais do agente: pústulas, micélio, escleródios, lagartas, excrementos?',
      dica: 'Sintoma é o que a planta mostra; sinal é a estrutura do próprio agente. Olhe a face inferior da folha.',
      opcoes: [
        { rotulo: 'Sim, há sinais', destino: 'biotico' },
        { rotulo: 'Não encontrei sinais', destino: 'evolucao' },
      ],
    },
    evolucao: {
      tipo: 'pergunta',
      texto: 'Como o sintoma evoluiu no tempo?',
      opcoes: [
        { rotulo: 'Apareceu de uma vez, depois de um evento (aplicação, chuva forte, granizo, geada)', destino: 'abiotico_evento' },
        { rotulo: 'Cresce gradualmente, com expansão em dias ou semanas', destino: 'biotico_sem_sinal' },
        { rotulo: 'Estável, sem progressão', destino: 'abiotico_solo' },
      ],
    },
    abiotico_operacional: res({
      titulo: 'Hipótese: causa abiótica operacional',
      categoria: 'abiotico',
      explicacao:
        'Padrão alinhado à operação, sem sinais do agente e com folhas novas sadias sugerem falha de aplicação, deriva ou fitotoxicidade, não doença.',
      proximosPassos: ['Consultar o registro de aplicações e a data do evento.', 'Verificar sobreposição, bicos entupidos e limpeza do tanque.', ...PASSOS_COMUNS],
    }),
    abiotico_evento: res({
      titulo: 'Hipótese: causa abiótica por evento',
      categoria: 'abiotico',
      explicacao: 'Surgimento súbito após um evento pontual e sem sinais do agente aponta para dano físico, químico ou climático.',
      proximosPassos: ['Confirmar a data e a intensidade do evento (chuva, granizo, geada, produto aplicado).', ...PASSOS_COMUNS],
    }),
    abiotico_solo: res({
      titulo: 'Hipótese: solo, nutrição ou compactação',
      categoria: 'abiotico',
      explicacao: 'Sintoma estável, sem sinais e sem evento associado costuma estar ligado a solo, drenagem ou nutrição.',
      proximosPassos: ['Coletar amostra de solo e de folha (análise foliar).', 'Checar compactação e drenagem no local.', ...PASSOS_COMUNS],
    }),
    biotico: res({
      titulo: 'Hipótese: causa biótica (praga ou doença)',
      categoria: 'biotico',
      explicacao: 'A presença de sinais do agente confirma causa biótica. Identifique o agente e quantifique no ponto.',
      proximosPassos: ['Registrar o alvo no app, com contagem ou severidade e foto.', 'Usar o diferencial entre doenças se houver dúvida.', ...PASSOS_COMUNS],
    }),
    biotico_sem_sinal: res({
      titulo: 'Possível causa biótica, sem sinal visível',
      categoria: 'inconclusivo',
      explicacao: 'Progressão gradual sugere agente biológico, mas sem sinais não há confirmação. Pode ser início de infecção ou praga de solo.',
      proximosPassos: ['Reinspecionar em 48 a 72 h, no mesmo ponto.', 'Incubar folhas em câmara úmida para induzir sinais.', ...PASSOS_COMUNS],
    }),
  },
}

/** 2.4 Pergunta-desafio: faixa reta de 20 m amarelada, passo a passo antes de recomendar aplicação. */
export const FAIXA_20M: Arvore = {
  id: 'faixa20',
  titulo: 'Desafio: faixa reta amarelada de 20 m',
  descricao: 'O produtor viu uma faixa reta de 20 m de largura amarelada. O que verificar, em ordem, antes de recomendar qualquer aplicação.',
  raiz: 'f1',
  fontes: ['fitotoxicidade', 'projeto'],
  origem: 'projeto',
  nos: {
    f1: {
      tipo: 'pergunta',
      texto: 'Passo 1. A largura da faixa (20 m) coincide com a barra de algum implemento (pulverizador, distribuidor)?',
      dica: 'Consulte o registro de operações do talhão.',
      opcoes: [{ rotulo: 'Sim', destino: 'f2' }, { rotulo: 'Não', destino: 'outra_causa' }],
    },
    f2: {
      tipo: 'pergunta',
      texto: 'Passo 2. A borda entre a faixa e a área verde é abrupta, como uma linha?',
      opcoes: [{ rotulo: 'Sim, linha nítida', destino: 'f3' }, { rotulo: 'Não, transição gradual', destino: 'outra_causa' }],
    },
    f3: {
      tipo: 'pergunta',
      texto: 'Passo 3. As folhas novas, surgidas depois da aplicação, estão sadias?',
      opcoes: [{ rotulo: 'Sim, sadias', destino: 'f4' }, { rotulo: 'Não, também estão afetadas', destino: 'biotico_sistemico' }],
    },
    f4: {
      tipo: 'pergunta',
      texto: 'Passo 4. Com lupa 20x no baixeiro, não há urédias, micélio nem exsudados?',
      dica: 'Inspecione dentro e fora da faixa, pelo mesmo número de plantas.',
      opcoes: [{ rotulo: 'Nada encontrado', destino: 'operacional' }, { rotulo: 'Há sinais biológicos', destino: 'biotico_sistemico' }],
    },
    operacional: res({
      titulo: 'Causa abiótica/operacional provável',
      categoria: 'abiotico',
      explicacao: 'Largura igual à do implemento, borda abrupta, folhas novas sadias e ausência de sinais: falha de aplicação ou fitotoxicidade. Fungicida não resolve.',
      proximosPassos: ['NÃO aplicar fungicida: não há doença confirmada.', 'Documentar (fotos, medidas, data) e acionar o responsável pelas operações.', 'Reavaliar a faixa em 7 dias.'],
    }),
    biotico_sistemico: res({
      titulo: 'Há indício biológico: investigar o agente',
      categoria: 'biotico',
      explicacao: 'Sinais do agente ou folhas novas afetadas indicam causa biológica ou sistêmica. A faixa pode coincidir com o manejo, mas não explica tudo.',
      proximosPassos: ['Identificar o agente (ver quadro sintoma × sinal).', 'Quantificar e registrar no app com foto.', 'Decisão de aplicação apenas com o agrônomo.'],
    }),
    outra_causa: res({
      titulo: 'Padrão não é operacional: investigar solo e drenagem',
      categoria: 'investigar',
      explicacao: 'Sem coincidência com o implemento ou sem borda nítida, a causa pode ser solo, compactação ou drenagem, ou ainda biológica.',
      proximosPassos: ['Coletar solo e folha dentro e fora da faixa.', 'Inspecionar raízes e colo das plantas.', 'Usar a triagem biótico × abiótico para continuar.'],
    }),
  },
}

/** 2.3 Diferencial 1: mancha-alvo × complexo de doenças de final de ciclo (Cercospora/Septoria) na soja. */
export const DIFERENCIAL_FOLIAR: Arvore = {
  id: 'diferencial-foliar',
  titulo: 'Mancha-alvo × doenças de final de ciclo (soja)',
  descricao: 'Distingue mancha-alvo de Cercospora/Septoria (complexo de final de ciclo) com o que a Embrapa descreve de cada uma.',
  raiz: 'aneis',
  fontes: ['ct139', 'ct205'],
  origem: 'fonte',
  nos: {
    aneis: {
      tipo: 'pergunta',
      texto: 'As lesões são circulares, castanhas, com anéis concêntricos (aspecto de alvo) e halo amarelado?',
      dica: 'Veja a folha contra a luz. Mancha-alvo costuma ter um ponto escuro no centro.',
      opcoes: [{ rotulo: 'Sim', destino: 'alvo' }, { rotulo: 'Não', destino: 'ciclo' }],
    },
    ciclo: {
      tipo: 'pergunta',
      texto: 'Os sintomas aparecem no fim do ciclo (R5 em diante), com amarelecimento, desfolha precoce e, às vezes, manchas em pecíolo, haste ou vagens?',
      opcoes: [{ rotulo: 'Sim', destino: 'dfc' }, { rotulo: 'Não', destino: 'inconclusivo' }],
    },
    alvo: res({
      titulo: 'Compatível com mancha-alvo (Corynespora cassiicola)',
      categoria: 'biotico',
      explicacao: 'Anéis concêntricos e halo amarelado são o quadro descrito pela Embrapa para a mancha-alvo.',
      proximosPassos: ['Confirmar com lupa (pontuações escuras no centro da lesão).', 'Registrar severidade no app, com foto.', ...PASSOS_COMUNS],
    }),
    dfc: res({
      titulo: 'Compatível com complexo de doenças de final de ciclo',
      categoria: 'biotico',
      explicacao: 'Sintomas no fim do ciclo com desfolha precoce são característicos do complexo (Septoria e Cercospora). A distinção entre espécies exige confirmação.',
      proximosPassos: ['Coletar folhas para identificação laboratorial.', 'Registrar severidade e estádio.', ...PASSOS_COMUNS],
    }),
    inconclusivo: res({
      titulo: 'Sem diagnóstico pelas regras',
      categoria: 'inconclusivo',
      explicacao: 'O quadro não bate com mancha-alvo nem com o complexo de final de ciclo. Pode ser outra doença, praga ou causa abiótica.',
      proximosPassos: ['Rodar a triagem biótico × abiótico.', 'Coletar amostra e consultar o agrônomo.', ...PASSOS_COMUNS],
    }),
  },
}

/** 2.3 Diferencial 2: fitotoxicidade × infecção fúngica. */
export const DIFERENCIAL_FITO: Arvore = {
  id: 'diferencial-fito',
  titulo: 'Fitotoxicidade por herbicida × infecção fúngica',
  descricao: 'Regra de decisão de campo, combinando padrão, progressão e sinais. Raciocínio de projeto, sem regra publicada pela Embrapa.',
  raiz: 'uniforme',
  fontes: ['fitotoxicidade', 'projeto'],
  origem: 'projeto',
  nos: {
    uniforme: {
      tipo: 'pergunta',
      texto: 'Todas as plantas de uma faixa de passada estão afetadas da mesma forma?',
      opcoes: [{ rotulo: 'Sim, 100% da faixa', destino: 'progressao' }, { rotulo: 'Não, focos ou plantas isoladas', destino: 'gradiente' }],
    },
    progressao: {
      tipo: 'pergunta',
      texto: 'O sintoma parou de progredir e a folhagem nova nasce sadia?',
      opcoes: [{ rotulo: 'Sim', destino: 'fito' }, { rotulo: 'Não, continua avançando', destino: 'gradiente' }],
    },
    gradiente: {
      tipo: 'pergunta',
      texto: 'Há focos com centro mais afetado, progressão contínua e algum sinal do fungo na lupa?',
      opcoes: [{ rotulo: 'Sim', destino: 'fungo' }, { rotulo: 'Não', destino: 'inconclusivo' }],
    },
    fito: res({
      titulo: 'Fitotoxicidade provável',
      categoria: 'abiotico',
      explicacao: 'Faixa uniforme, sem progressão e com folhagem nova sadia: padrão de dano químico ou mecânico já ocorrido.',
      proximosPassos: ['Não aplicar fungicida.', 'Conferir o histórico de herbicidas e deriva.', ...PASSOS_COMUNS],
    }),
    fungo: res({
      titulo: 'Infecção fúngica provável',
      categoria: 'biotico',
      explicacao: 'Focos com gradiente, progressão contínua e sinal do fungo indicam infecção em curso.',
      proximosPassos: ['Identificar a doença (quadro sintoma × sinal).', 'Quantificar e registrar com foto.', ...PASSOS_COMUNS],
    }),
    inconclusivo: res({
      titulo: 'Sem diagnóstico pelas regras',
      categoria: 'inconclusivo',
      explicacao: 'Os critérios não fecham em nenhuma das duas hipóteses.',
      proximosPassos: ['Reavaliar em 48 a 72 h no mesmo ponto.', ...PASSOS_COMUNS],
    }),
  },
}

export const ARVORES: Arvore[] = [TRIAGEM, DIFERENCIAL_FOLIAR, DIFERENCIAL_FITO, FAIXA_20M]
