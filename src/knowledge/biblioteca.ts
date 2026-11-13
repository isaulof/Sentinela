import type { AlvoId } from './alvos'
import type { FonteId } from './fontes'

/**
 * Fichas completas da Biblioteca, uma por alvo do registro. Cada fato traz as fontes de onde saiu (ids de `fontes.ts`).
 * Regras desta página de conhecimento:
 *  - só entra o que a Embrapa publica (Sistemas de Produção 17, circulares, Caderneta); nada de memória ou internet solta;
 *  - controle químico aparece só como o que a Embrapa descreve (grupos químicos e princípios ativos citados), SEM marcas
 *    comerciais e SEM doses, e a tela repete o aviso de que a decisão é do agrônomo;
 *  - o que a Embrapa não publica fica em `lacunas`, dito com todas as letras, em vez de ser preenchido por suposição.
 */
export interface Fato {
  texto: string
  fontes: FonteId[]
}

export type GrupoManejo = 'cultural' | 'biologico' | 'genetico' | 'quimico' | 'resistencia'

export const ROTULO_MANEJO: Record<GrupoManejo, string> = {
  cultural: 'Manejo cultural e preventivo',
  biologico: 'Controle biológico',
  genetico: 'Resistência genética (cultivar)',
  quimico: 'Controle químico (o que a Embrapa publica)',
  resistencia: 'Resistência aos produtos',
}

export interface Ficha {
  alvo: AlvoId
  /** Onde o alvo se encaixa: praga principal, regionalmente importante ou secundária; doença e agente. */
  classificacao: Fato
  /** Dano e perdas. */
  dano: Fato[]
  /** Como reconhecer no campo. */
  reconhecer: Fato[]
  /** O que favorece o problema. */
  favorecem: Fato[]
  /** Como e quando monitorar. */
  monitorar: Fato[]
  /** Níveis de ação, limites e tolerância que a Embrapa publica. */
  niveis: Fato[]
  manejo: Partial<Record<GrupoManejo, Fato[]>>
  /** Cuidados que a Embrapa chama a atenção. */
  cuidados: Fato[]
  /** O que a Embrapa não publica (ou que este app não adotou): dito de forma honesta. */
  lacunas: string[]
}

const f = (texto: string, ...fontes: FonteId[]): Fato => ({ texto, fontes })
const SP = 'sp17pragas' as const
const SD = 'sp17doencas' as const

const SEM_QUIMICO_NUMERICO = 'A Embrapa não indica um nível de ação numérico para esta situação; a decisão fica com o agrônomo.'

export const FICHAS: Record<AlvoId, Ficha> = {
  // ───────────────────────────── PRAGAS ─────────────────────────────
  percevejo: {
    alvo: 'percevejo',
    classificacao: f('Praga principal da soja. Ataca grãos e vagens (várias espécies; o percevejo-marrom é Euschistus heros).', SP),
    dano: [f('Os percevejos sugam vagens e grãos e reduzem a produtividade. A ocorrência antes do surgimento das vagens não causa perdas.', SP)],
    reconhecer: [f('Percevejos adultos e ninfas nas plantas, melhor vistos com o pano de batida. Ninfas pequenas passam despercebidas na simples observação.', SP, 'caderneta')],
    favorecem: [f('Lavouras em sucessão soja-milho compartilham as mesmas espécies (percevejo-marrom e barriga-verde) e os mesmos inseticidas.', SP)],
    monitorar: [
      f('Pano de batida branco de 1 m sobre uma fileira, repetido em vários pontos do talhão; vale a média. Só olhar a lavoura não mostra a população real.', SP, 'caderneta'),
      f('Amostrar nas horas mais frescas do dia, quando os percevejos se movimentam menos, e com mais atenção nas bordas, onde costumam começar.', SP),
      f('Pelo menos uma vez por semana, e com mais frequência quando a densidade se aproxima do nível de ação.', SP),
      f('Contam-se as ninfas maiores que 0,3 cm somadas aos adultos, juntando as espécies de percevejo-praga.', SP, 'caderneta', 'ct137'),
    ],
    niveis: [
      f('Lavouras para grãos: 2 percevejos por metro. Lavouras para sementes: 1 percevejo por metro.', SP),
      f('O controle só vale a partir de R3 (início da formação das vagens), mas o monitoramento pode começar antes.', SP),
    ],
    manejo: {
      cultural: [
        f('Evitar aplicações preventivas antes do surgimento das vagens ou abaixo do nível de ação.', SP),
        f('Em certas situações o controle pode ser localizado, só nas bordas da lavoura, sem tratar a área toda.', SP),
        f('Reservar para os percevejos os produtos destinados a eles, sem usá-los contra outras pragas no período vegetativo.', SP),
        f('Boa tecnologia de aplicação, que deposite o produto nas folhas da parte de baixo da planta, melhora o controle.', SP),
      ],
      biologico: [f('O parasitoide de ovos Telenomus podisi pode ser liberado; para isso é importante saber o início da infestação por adultos, em qualquer estádio.', SP)],
      quimico: [
        f('Só com produtos registrados no Mapa para soja, na dose do registro. Há menos opções registradas para percevejos do que para outras pragas.', SP),
        f('A eficiência dos inseticidas varia entre produtos; a Embrapa a compara em ensaios cooperativos (Circular Técnica 137).', 'ct137'),
      ],
      resistencia: [f('Há populações de percevejos resistentes a inseticidas em várias regiões produtoras. O uso racional (menos exposição aos produtos) é a principal estratégia para evitar que a resistência avance.', SP)],
    },
    cuidados: [
      f('A soja Bt não controla percevejos; quem a usa precisa continuar monitorando.', SP),
      f('Aplicar sem respeitar o nível de ação reduz os inimigos naturais e favorece o aumento das pragas.', SP),
    ],
    lacunas: ['Doses e escolha do produto não entram no app: dependem do registro vigente e do receituário agronômico.'],
  },

  lagarta: {
    alvo: 'lagarta',
    classificacao: f('Praga principal da soja. Lagarta-falsa-medideira (Chrysodeixis includens) ataca folhas.', SP),
    dano: [f('Desfolha. A soja tolera certo nível de desfolha sem perder produtividade; a tolerância muda com o estádio e as condições do ambiente.', SP)],
    reconhecer: [
      f('Lagartas que se movem "medindo palmo" nas folhas, com folhas furadas ou raspadas.', 'projeto'),
      f('Ocorrem em maior densidade nas folhas da parte de baixo da planta.', SP),
    ],
    favorecem: [f('Os ataques mais severos têm ocorrido na fase reprodutiva, com o dossel fechado.', SP)],
    monitorar: [
      f('Pano de batida de 1 m, mais avaliação visual da desfolha em cada ponto. Contam-se as lagartas maiores que 1,5 cm.', SP, 'caderneta'),
      f('Pelo menos uma amostragem por semana desde antes da semeadura até o fim do ciclo.', SP),
    ],
    niveis: [
      f('20 lagartas maiores que 1,5 cm por metro, ou desfolha de 30% na fase vegetativa e de 15% a partir da floração.', SP, 'caderneta'),
      f('Os níveis de ação de lagartas e percevejos foram revalidados para cultivares de ciclo curto, de crescimento indeterminado e com menor índice de área foliar.', SP),
    ],
    manejo: {
      cultural: [f('Mesmo detectada, se a praga está abaixo do nível de ação, a aplicação preventiva de inseticida não é indicada; clima e inimigos naturais podem derrubar a população.', SP)],
      genetico: [f('A soja Bt (Cry1Ac) controla a lagarta-falsa-medideira, com refúgio de pelo menos 20% de soja não Bt.', SP)],
      quimico: [
        f('A lagarta-falsa-medideira é mais tolerante aos inseticidas do que a lagarta-da-soja e exige atenção do profissional à espécie, ao produto e à dose.', SP),
        f('A dificuldade vem em parte de ficar nas folhas de baixo; o "efeito guarda-chuva" do dossel reduz o molhamento. Bicos, volume e pressão que molhem o baixeiro ajudam.', SP),
      ],
    },
    cuidados: [f('O melhor produto para a lagarta-da-soja nem sempre é o melhor para a falsa-medideira; com mais de uma espécie, escolhe-se pela espécie predominante.', SP)],
    lacunas: ['Produtos e doses não entram no app.'],
  },

  anticarsia: {
    alvo: 'anticarsia',
    classificacao: f('Praga principal da soja. Lagarta-da-soja (Anticarsia gemmatalis) ataca folhas.', SP),
    dano: [f('Desfolha; a lagarta deixa só as nervuras (folha rendilhada).', SP)],
    reconhecer: [
      f('Lagarta listrada que come as folhas.', 'projeto'),
      f('Lagartas pequenas (menores que 1,5 cm) são chamadas, em algumas regiões, de "lagartas no fio".', SP),
    ],
    favorecem: [f('Estiagem com plantas pequenas (menos de 50 cm) exige cuidado maior, porque a desfolha avança mais rápido.', SP)],
    monitorar: [f('Pano de batida de 1 m e avaliação visual da desfolha, como para a falsa-medideira.', SP, 'caderneta')],
    niveis: [
      f('20 lagartas maiores que 1,5 cm por metro, ou desfolha de 30% na fase vegetativa e de 15% a partir da floração.', SP),
      f('Para o baculovírus: 20 lagartas pequenas por metro, ou 15 pequenas mais 5 grandes por metro (a metade disso em estiagem com plantas de menos de 50 cm).', SP),
    ],
    manejo: {
      biologico: [
        f('Sempre que possível, dar preferência a produtos biológicos: baculovírus (AgMNPV) ou Bacillus thuringiensis. O baculovírus é seletivo aos demais agentes de controle biológico.', SP),
        f('As lagartas começam a morrer só a partir do 4º dia após a pulverização, com pico entre 7 e 10 dias; por isso, em ataque severo até V4 e em seca, o controle precisa de produtos de ação rápida junto.', SP),
        f('Evitar o baculovírus sozinho com desfolha de 20% no vegetativo ou de 10% no reprodutivo.', SP),
      ],
      genetico: [f('A soja Bt (Cry1Ac) controla a lagarta-da-soja.', SP)],
      quimico: [f('Quando não se usa produto biológico, a Embrapa indica de preferência os reguladores de crescimento de insetos e os grupos químicos das diamidas e das espinosinas, por serem mais seletivos.', SP)],
    },
    cuidados: [f('O baculovírus age por ingestão: a aplicação precisa cobrir bem as plantas.', SP)],
    lacunas: ['Produtos e doses não entram no app.'],
  },

  helicoverpa: {
    alvo: 'helicoverpa',
    classificacao: f('Praga secundária no Sistemas de Produção 17 (Helicoverpa spp.); a lagarta-das-maçãs-do-algodoeiro (Chloridea virescens) aparece como regionalmente importante. A Embrapa agrupa as duas como Heliothinae.', SP),
    dano: [
      f('Ataca brotos, folhas, flores, vagens e grãos. Em soja costuma ter baixa densidade, provavelmente pela mortalidade natural e pela ação de inimigos naturais, mas o potencial destrutivo pede atenção constante.', SP),
    ],
    reconhecer: [
      f('Ataca brotos, folhas jovens, flores, folhas, grãos e vagens.', SP),
      f('Lagarta em flores e vagens, deixando grãos furados.', 'projeto'),
    ],
    favorecem: [],
    monitorar: [
      f('Pano de batida, como para as demais lagartas, e também vistoria de ponteiros, flores e vagens, somando as lagartas encontradas às que caíram no pano.', SP),
      f('Armadilhas de feromônio mostram quando a praga chegou à região, mas não se obteve nível de ação por armadilha; a Embrapa desaconselha decidir só pela captura de adultos.', SP),
    ],
    niveis: [f('4 lagartas por metro ou 30% de desfolha na fase vegetativa; 2 lagartas por metro ou 15% de desfolha na floração, formação de vagens e enchimento de grãos.', SP)],
    manejo: {
      biologico: [
        f('Há baculovírus (HzSNPV e HearSNPV) e Bacillus thuringiensis registrados. Os biológicos e os reguladores de crescimento, de ação mais lenta, só devem ser usados com lagartas predominantemente pequenas e desfolha ainda abaixo de 30% (antes da floração) ou 15% (depois).', SP),
      ],
      genetico: [f('A soja Bt (Cry1Ac) controla a lagarta-helicoverpa com menor eficiência.', SP)],
      quimico: [
        f('A Embrapa prefere os biológicos ou os grupos das diamidas, das espinosinas e o regulador metoxifenozida, por serem seletivos.', SP),
        f('Para Helicoverpa armigera, os produtos que mostraram desempenho satisfatório nas doses autorizadas incluem flubendiamida, clorantraniliprole, espinosade, clorfenapir, indoxacarbe, metoxifenozida, baculovírus (HzSNPV) e Bt var. kurstaki.', SP),
      ],
      resistencia: [f('Fazer rotação de inseticidas de diferentes mecanismos de ação para evitar a seleção de populações resistentes.', SP)],
    },
    cuidados: [f('Helicoverpa armigera foi detectada no Brasil em 2013, atacando várias culturas.', SP)],
    lacunas: ['O app não grava armadilha de feromônio. Produtos e doses não entram no app.'],
  },

  spodoptera: {
    alvo: 'spodoptera',
    classificacao: f('Praga secundária (Spodoptera eridania, S. cosmioides e S. albula, chamadas "lagartas-das-vagens"); a Embrapa avisa que podem ganhar importância com o aumento da soja Bt.', SP),
    dano: [f('Atacam folhas e vagens.', SP)],
    reconhecer: [],
    favorecem: [f('A soja Bt não as controla, e mesmo a de segunda geração não terá controle pleno.', SP)],
    monitorar: [f('Pano de batida de 1 m, como as demais lagartas, e monitoramento constante da lavoura.', SP)],
    niveis: [f('10 lagartas por metro, ou desfolha de 30% no vegetativo e de 15% na floração e no enchimento de grãos. Para inseticidas de ação rápida contam-se as lagartas grandes (acima de 1,5 cm); para inseticidas biológicos, também as menores.', SP)],
    manejo: {
      biologico: [f('O uso racional de inseticidas preserva os agentes de controle biológico, que podem reduzir o ataque.', SP)],
      quimico: [f('Uso racional de inseticidas e outros agrotóxicos, para preservar os inimigos naturais.', SP)],
    },
    cuidados: [f('Quem usa soja Bt deve monitorar as lagartas do gênero Spodoptera, que não são controladas por ela.', SP)],
    lacunas: ['A Embrapa não detalha aqui sintomas para diferenciar as espécies. Produtos e doses não entram no app.'],
  },

  broca: {
    alvo: 'broca',
    classificacao: f('Praga secundária (Crocidosema aporema). A Caderneta a chama de "broca-dos-ponteiros".', SP, 'caderneta'),
    dano: [f('Ataca brotos, flores, hastes e pecíolos.', SP)],
    reconhecer: [f('Ponteiros e brotos atacados, com a lagarta nas axilas das folhas.', 'projeto')],
    favorecem: [],
    monitorar: [f('Em pontos de 1 m linear, contar as plantas com e sem ataque na área da lavoura.', SP)],
    niveis: [f('A partir de 25% a 30% de plantas com ponteiros atacados. O app usa o menor valor (25%) para avisar mais cedo.', SP)],
    manejo: {
      genetico: [f('A soja Bt (Cry1Ac) controla a broca-das-axilas.', SP)],
    },
    cuidados: [],
    lacunas: ['A Embrapa não detalha, neste capítulo, controle químico ou biológico específico para a broca-das-axilas.'],
  },

  moscaBranca: {
    alvo: 'moscaBranca',
    classificacao: f('Praga regionalmente importante (Bemisia tabaci).', SP),
    dano: [
      f('A perda vem da fumagina: os excrementos açucarados da mosca-branca, sob sol e calor, favorecem o fungo Capnodium; o excesso aumenta o etileno na folha e provoca queda precoce das folhas.', SP),
      f('Dano indireto, pouco comum: transmite o vírus da necrose da haste.', SP, 'sp17doencas'),
    ],
    reconhecer: [
      f('Mosquinhas brancas que voam quando se balança a planta; ninfas na face de baixo das folhas.', 'projeto'),
      f('Camada escura de fumagina sobre os excrementos, nas folhas inferiores.', SP),
    ],
    favorecem: [f('É polífaga: plantas voluntárias de soja e plantas daninhas hospedeiras mantêm a população.', SP)],
    monitorar: [
      f('Concentrar nas bordaduras da lavoura, em grade de 40 m a 60 m entre pontos (mais espaçada no interior do talhão).', SP),
      f('Colher 3 a 4 folíolos do terço médio em cada ponto e, com lupa, contar as ninfas em pelo menos 1 cm² por folíolo.', SP),
    ],
    niveis: [f('Infestações abaixo de 2 ninfas por cm² não promovem fumagina, que é o principal fator de redução da área fotossintética.', SP)],
    manejo: {
      cultural: [
        f('O vazio sanitário é uma das principais medidas, junto com a eliminação de plantas voluntárias de soja e de daninhas hospedeiras.', SP),
        f('Em áreas com daninhas muito infestadas, dessecar cerca de duas semanas antes da semeadura.', SP),
      ],
      quimico: [f('Quando necessário, o controle é feito com inseticidas químicos registrados na soja para essa finalidade.', SP)],
    },
    cuidados: [f('A soja Bt não controla a mosca-branca.', SP)],
    lacunas: ['O 2 ninfas por cm² é um limite para fumagina, não um nível de ação para aplicar. Produtos e doses não entram no app.'],
  },

  vaquinha: {
    alvo: 'vaquinha',
    classificacao: f('Praga secundária (vários besouros: Diabrotica speciosa, Cerotoma arcuata e outros). Os adultos atacam as folhas; as larvas, raízes e nódulos.', SP),
    dano: [f('Desfolha por adultos, em folhas; larvas atacam raízes e nódulos.', SP)],
    reconhecer: [f('Besouros pequenos e furos redondos espalhados nas folhas.', 'projeto')],
    favorecem: [],
    monitorar: [f('Pano de batida de 1 m e estimativa visual da desfolha, como para as lagartas.', SP)],
    niveis: [],
    manejo: {},
    cuidados: [f('A soja Bt não controla os coleópteros desfolhadores.', SP)],
    lacunas: ['O capítulo não traz nível de ação, tolerância nem medidas de controle específicas para vaquinhas. ' + SEM_QUIMICO_NUMERICO],
  },

  acaro: {
    alvo: 'acaro',
    classificacao: f('Praga secundária. Seis espécies podem causar danos; o ácaro-verde (Mononychellus planki) e o ácaro-rajado (Tetranychus urticae) são os mais comuns.', SP),
    dano: [f('Atacam principalmente as folhas, com mais intensidade a partir do florescimento. O ácaro-branco ataca brotos e folhas novas e deforma folhas, pecíolos e vagens.', SP)],
    reconhecer: [
      f('Ácaro-rajado: colônias densas na face de baixo, muita teia; na face de cima, manchas amarelas que depois ficam bronzeadas. Costuma aparecer em reboleiras.', SP),
      f('Ácaro-verde: pouca teia; pontuações claras que deixam a folha acinzentada quando muito atacada.', SP),
      f('Ácaro-branco: menor, branco-leitoso, sem teia; deformação de folhas e vagens marrons.', SP),
      f('Confirmar a presença com lupa de aumento de 10x ou mais.', SP),
    ],
    favorecem: [
      f('A estiagem é o principal fator para surtos (exceto o ácaro-branco, que se desenvolve melhor em períodos chuvosos).', SP),
      f('O uso excessivo de inseticidas e fungicidas pode aumentar o ataque, e quanto mais cedo começam as aplicações, maior o prejuízo aos inimigos naturais.', SP),
    ],
    monitorar: [
      f('Examinar plantas em vários pontos da lavoura e anotar os locais atacados, para ver se se repetem ao longo dos anos.', SP),
      f('Como o ataque pode ser pontual, vistoriar todos os talhões.', SP),
    ],
    niveis: [],
    manejo: {
      biologico: [f('Ácaros predadores e o fungo Neozygites floridana ajudam a reduzir os ácaros-praga. Prevalece a preservação dos inimigos naturais pelo uso racional de agrotóxicos.', SP)],
      quimico: [
        f('Estão registrados em soja espiromesifeno, diafentiurom, abamectina e profenofós+lufenurom.', SP),
        f('Como o ataque pode ser pontual, tratar apenas as áreas atacadas, na dose registrada.', SP),
      ],
    },
    cuidados: [f('A soja Bt não controla ácaros.', SP), f('Os surtos ocorrem na fase reprodutiva, quando é difícil depositar calda nas folhas do interior do dossel.', SP)],
    lacunas: ['O capítulo não traz nível de ação numérico para ácaros. ' + SEM_QUIMICO_NUMERICO],
  },

  tamandua: {
    alvo: 'tamandua',
    classificacao: f('Praga regionalmente importante (Sternechus subsignatus).', SP),
    dano: [
      f('Os adultos raspam a haste e desfiam os tecidos; a larva, dentro da haste, forma uma galha. Pode reduzir a produtividade e matar a planta.', SP),
      f('Quanto mais cedo o ataque, maior a perda. A partir de V6 a haste fica mais rígida e já não há perdas representativas.', SP),
    ],
    reconhecer: [
      f('Os adultos raspam a haste; a larva forma galha dentro da haste.', SP),
      f('Besouro escuro com bico na base da planta; haste com galhas ou quebrada.', 'projeto'),
    ],
    favorecem: [f('Áreas onde a praga já ocorreu em anos anteriores e seu entorno.', SP)],
    monitorar: [
      f('Antes da semeadura: 4 amostras de solo por 10 ha, centradas nas fileiras da safra anterior, com 1 m de comprimento e largura e profundidade de uma pá de corte, contando as larvas hibernantes.', SP),
      f('Para cada 3 a 6 larvas por amostra, uma ou duas podem chegar à fase adulta, com quebra de 7 a 14 sacas de soja por hectare na safra seguinte.', SP),
    ],
    niveis: [f('Até V3: 1 adulto por metro. De V4 a V6: 2 adultos por metro. Depois de V6, o ataque não causa perdas.', SP)],
    manejo: {
      cultural: [
        f('Rotação com plantas não hospedeiras (milho, milheto, sorgo ou girassol) é o método mais eficiente, porque interrompe o ciclo.', SP),
        f('Adultos vindos da área rotacionada podem atacar uma faixa de cerca de 25 m na divisa com a soja; ali é preciso monitorar.', SP),
      ],
      quimico: [
        f('Pulverizações entre 22h e 2h tendem a ser mais eficientes, quando os adultos ficam na parte de cima das plantas.', SP),
        f('O tratamento de sementes protege a fase inicial quando não é possível rotacionar.', SP),
      ],
    },
    cuidados: [],
    lacunas: ['Produtos e doses não entram no app.'],
  },

  elasmo: {
    alvo: 'elasmo',
    classificacao: f('Praga secundária (Elasmopalpus lignosellus, a "broca-do-colo" ou lagarta-elasmo). Ataca a haste.', SP),
    dano: [f('Ataca a base da haste de plantas novas.', SP)],
    reconhecer: [f('Planta nova cortada no colo, com tubinho de seda e terra.', 'projeto')],
    favorecem: [],
    monitorar: [],
    niveis: [],
    manejo: {
      genetico: [f('A soja Bt (Cry1Ac) controla a lagarta-elasmo.', SP)],
    },
    cuidados: [],
    lacunas: ['O capítulo apenas lista a lagarta-elasmo como praga secundária. Não traz nível de ação, monitoramento nem medidas de controle específicas. ' + SEM_QUIMICO_NUMERICO],
  },

  coro: {
    alvo: 'coro',
    classificacao: f('Praga regionalmente importante (vários corós; em Mato Grosso ocorrem, por exemplo, o coró-da-soja Phyllophaga cuyabana e o coró-liogenys).', SP),
    dano: [
      f('As larvas comem raízes, principalmente a partir do 2º ínstar: amarelecimento, menor crescimento e morte de plantas em reboleiras.', SP),
      f('No início do desenvolvimento, uma larva de 1,5 a 2 cm para cada quatro plantas reduz o volume de raízes em cerca de 35%; uma de 3 cm, 60% ou mais, podendo matar a plântula.', SP),
    ],
    reconhecer: [f('Larva branca grossa, curvada em C, no solo, com raízes comidas.', 'projeto')],
    favorecem: [f('Maiores perdas quando a soja é semeada na época em que as larvas estão no 3º ínstar, a fase de maior consumo; a época varia por espécie.', SP)],
    monitorar: [
      f('Amostrar antes da semeadura, escavando o solo em 50 cm x 25 cm, com pelo menos 30 cm de profundidade, de forma representativa na lavoura.', SP),
    ],
    niveis: [],
    manejo: {
      cultural: [
        f('Ajustar a época de semeadura para que a fase inicial da planta não coincida com larvas grandes de 3º ínstar.', SP),
        f('Evitar outras plantas hospedeiras durante o desenvolvimento das larvas no solo.', SP),
        f('Favorecer a raiz: manejo da compactação, correção da fertilidade e da acidez do solo, para aumentar a tolerância da planta.', SP),
        f('Em ataque severo, a aração profunda nas horas quentes pode reduzir a população, mas revolver o solo só por isso não é indicado em semeadura direta.', SP),
        f('Armadilhas luminosas nas revoadas podem reduzir adultos em áreas menores.', SP),
      ],
      quimico: [
        f('Sem como escapar da época crítica, usa-se tratamento de sementes com inseticida registrado para essa finalidade, cujo efeito residual em geral não é longo.', SP),
        f('Os adultos podem ser controlados de forma localizada nas reboleiras em que causam desfolha.', SP),
      ],
    },
    cuidados: [f('A soja Bt não controla pragas de raízes.', SP)],
    lacunas: ['O capítulo não traz nível de ação numérico para corós, e este app conta larvas por trincheira só como registro. ' + SEM_QUIMICO_NUMERICO],
  },

  // ───────────────────────────── DOENÇAS ─────────────────────────────
  ferrugem: {
    alvo: 'ferrugem',
    classificacao: f('Doença causada pelo fungo Phakopsora pachyrhizi.', SD, 'ct188'),
    dano: [f('As folhas infectadas amarelam e caem cedo, comprometendo a formação e o enchimento das vagens, o peso e a qualidade dos grãos (grãos verdes).', SD)],
    reconhecer: [
      f('Pontos minúsculos mais escuros que o tecido sadio, verdes a cinza-esverdeados, com saliências (urédias) na página inferior da folha; começam pelas folhas do terço inferior.', SD),
      f('As urédias se abrem num poro minúsculo e liberam os esporos; lesões de 2 a 5 mm, de formato angular.', SD),
      f('Lesão TAN (castanha, com muita esporulação) indica planta sensível; lesão RB (marrom-avermelhada, com necrose e pouca esporulação) indica reação de resistência.', SD),
      f('No início pode ser confundida com pústula bacteriana, mancha-parda (Septoria) e crestamento bacteriano; a diferença está nas urédias abertas.', SD),
    ],
    favorecem: [f('Mínimo de 6 horas de molhamento da folha para infectar. O vento espalha os esporos, e a chuva os deposita e mantém a folha molhada.', SD)],
    monitorar: [
      f('Monitorar desde o início do desenvolvimento da cultura, intensificando no fechamento das entrelinhas.', SD),
      f('A detecção de esporos na lavoura antes da doença se instalar torna o controle mais assertivo, mas exige profissional treinado para identificar os esporos.', 'ct188'),
    ],
    niveis: [f('A Embrapa não publica nível de ação numérico: a decisão considera a ocorrência regional, o clima favorável, a condição de aplicar em pouco tempo, outras doenças e a proximidade do fechamento das entrelinhas.', SD)],
    manejo: {
      cultural: [
        f('Vazio sanitário e eliminação de plantas voluntárias de soja. O Sistemas de Produção 17 (2020) cita período de, no mínimo, 60 dias; a Circular Técnica 188 (2022) cita pelo menos 90 dias sem plantas vivas de soja. Em Mato Grosso vale o calendário estadual do ano.', SD, 'ct188', 'vazioMT'),
        f('Semear no início da época recomendada e usar cultivares de ciclo precoce, para escapar da doença.', SD, 'ct188'),
      ],
      genetico: [f('Uso de cultivares com gene(s) de resistência.', SD, 'ct188')],
      quimico: [
        f('Usa-se misturas de inibidores de desmetilação (triazóis), inibidores da quinona externa (estrobilurinas) e/ou inibidores da succinato desidrogenase (carboxamidas), junto com multissítios (à base de cobre, clorotalonil e mancozebe).', SD),
        f('Atrasar a aplicação depois dos primeiros sintomas pode reduzir a produtividade se o clima favorecer a doença. O número de reaplicações depende do estádio em que a doença aparece, do residual dos produtos e do clima.', SD),
        f('Para escolher produtos, consultar os resultados atuais de pesquisa do Consórcio Antiferrugem.', SD),
      ],
      resistencia: [f('O fungo apresenta resistência aos fungicidas sítio-específicos, por isso a associação com multissítios é benéfica.', SD)],
    },
    cuidados: [f('A Circular Técnica 188 traz o monitoramento de esporos do programa MID-Soja (Manejo Integrado de Doenças da Soja) para apoiar a decisão de controle.', 'ct188')],
    lacunas: ['Esta ficha não traz o calendário de vazio sanitário vigente: consulte o do Indea-MT. Produtos e doses não entram no app.'],
  },

  mofo: {
    alvo: 'mofo',
    classificacao: f('Doença causada pelo fungo Sclerotinia sclerotiorum.', SD, 'ct152'),
    dano: [f('Para cada ponto percentual de aumento da incidência, a produtividade cai em média 17,2 kg por hectare e a produção de escleródios sobe 100 g por hectare.', 'ct152')],
    reconhecer: [
      f('Manchas aquosas que ficam castanho-claras, com muito micélio branco e denso. As infecções começam com frequência pelas flores, nas axilas das folhas e nos ramos laterais.', SD),
      f('Em poucos dias aparecem os escleródios, estruturas negras e rígidas que podem ficar viáveis no solo por até três anos.', SD),
    ],
    favorecem: [
      f('Altitudes acima de 600 m, safras chuvosas e temperatura amena.', SD),
      f('A fase mais vulnerável vai da floração plena ao início da formação das vagens (R2 a R3).', SD),
      f('Escleródios no solo, com alta umidade e temperatura entre 10 °C e 21 °C, formam apotécios, que liberam os esporos do ar.', SD),
    ],
    monitorar: [f('Olhar flores, axilas e o solo sob o dossel, com atenção redobrada de R1 a R3.', SD)],
    niveis: [f('A Embrapa não publica nível de ação numérico no capítulo; as pulverizações se concentram do início da floração ao início da formação das vagens.', SD, 'ct152')],
    manejo: {
      cultural: [
        f('Sementes de boa qualidade e tratadas; palhada para cobertura uniforme do solo, de preferência de gramíneas; rotação ou sucessão com culturas não hospedeiras.', SD),
        f('Cultivares pouco ramificadas, de folhas pequenas e florescimento curto; população e espaçamento adequados à cultivar.', SD),
        f('Limpar máquinas e equipamentos depois de usá-los em área infestada, porque os escleródios viajam neles; uma vez introduzido, o fungo é de difícil erradicação.', SD),
      ],
      biologico: [f('Infestação do solo com agentes antagonistas.', SD)],
      quimico: [f('Pulverizações foliares de fungicidas, principalmente do início da floração ao início da formação das vagens; a eficiência é avaliada todo ano em ensaios cooperativos (Circular Técnica 152).', SD, 'ct152')],
    },
    cuidados: [],
    lacunas: ['Produtos e doses não entram no app.'],
  },

  manchaAlvo: {
    alvo: 'manchaAlvo',
    classificacao: f('Doença causada pelo fungo Corynespora cassiicola, também causa de podridão radicular.', SD, 'ct139'),
    dano: [f('Cultivares suscetíveis podem sofrer desfolha, com perdas de até 50% da produtividade.', 'ct139')],
    reconhecer: [
      f('Pontuações pardas com halo amarelado, que viram manchas circulares castanho-claras a escuras, de até 20 mm, geralmente com um ponto escuro no centro, como um alvo.', SD, 'ct139'),
      f('Pode atacar nervuras, hastes e vagens; nas vagens, manchas circulares de cerca de 1 mm, deprimidas, com centro escuro.', SD),
    ],
    favorecem: [
      f('Temperatura de 18 °C a 32 °C e alta umidade relativa.', SD),
      f('O fungo vive em mais de 400 espécies de plantas, restos de cultura e sementes infectadas.', SD),
    ],
    monitorar: [f('Inspecionar folhas do baixeiro e do terço médio; o app registra a severidade estimada (%).', SD)],
    niveis: [f('A Embrapa não publica nível de ação numérico.', SD, 'ct139')],
    manejo: {
      cultural: [f('Rotação ou sucessão com milho e outras gramíneas; tratamento de sementes.', SD)],
      genetico: [f('Uso de cultivares resistentes ou tolerantes.', SD)],
      quimico: [f('Nos ensaios cooperativos de 2011/12 a 2017/18, fungicidas com protioconazol e fluxapiroxade tiveram maior eficiência; os do grupo MBC (carbendazim e tiofanato-metílico) tiveram baixa eficiência.', SD)],
      resistencia: [f('Há isolados com menor sensibilidade a MBC, a inibidores da quinona externa e a inibidores da succinato desidrogenase.', SD, 'ct139')],
    },
    cuidados: [f('Pode ser confundida com antracnose, crestamento de Cercospora e seca da haste e da vagem.', SD)],
    lacunas: ['Produtos e doses não entram no app.'],
  },

  oidio: {
    alvo: 'oidio',
    classificacao: f('Doença causada pelo fungo Erysiphe diffusa (em fichas antigas, Microsphaera diffusa).', SD),
    dano: [f('As perdas de produtividade podem chegar de 10% a 35%. Em infecção severa, as folhas secam e caem cedo.', SD)],
    reconhecer: [
      f('Fina cobertura branca, em pontos ou cobrindo toda a parte aérea; nas folhas, com os dias, vira castanho-acinzentada, com aparência de sujeira.', SD),
      f('Pode ocorrer em qualquer estádio, mas é mais visível no início da floração.', SD),
    ],
    favorecem: [f('Períodos de baixa umidade e temperaturas amenas (18 °C a 24 °C). Mais severo na região Sul e nas regiões altas dos Cerrados.', SD)],
    monitorar: [f('Olhar o pó branco nas folhas, do terço médio para cima.', SD)],
    niveis: [f('A Embrapa não publica nível de ação numérico.', SD)],
    manejo: {
      genetico: [f('O método mais eficiente de controle é o uso de cultivares resistentes.', SD)],
      quimico: [f('Pode ser controlado com fungicidas.', SD)],
    },
    cuidados: [],
    lacunas: ['O capítulo não detalha produtos nem época. Produtos e doses não entram no app.'],
  },

  finalCiclo: {
    alvo: 'finalCiclo',
    classificacao: f('Complexo de doenças de final de ciclo (DFC): crestamento de Cercospora (Cercospora kikuchii) e mancha-parda (Septoria glycines), de sintomas difíceis de separar.', SD, 'ct205'),
    dano: [f('Crestamento e desfolha precoce, principalmente a partir do terço superior; infecção severa na fase de enchimento pode causar desfolha e maturação precoce.', SD)],
    reconhecer: [
      f('Cercospora: pontuações escuras, castanho-avermelhadas, que se juntam em grandes manchas e crestam a folha; pode causar mancha-púrpura nas sementes.', SD),
      f('Septoria: pontuações pardas menores que 1 mm que formam manchas angulares com halo amarelado, de até 4 mm.', SD),
    ],
    favorecem: [f('Chuva ou alta umidade e temperaturas altas (23 °C a 27 °C para Cercospora; 15 °C a 30 °C para Septoria). Os fungos sobrevivem em restos de cultura.', SD)],
    monitorar: [f('Olhar folhas do baixeiro e do terço médio; a Septoria pode aparecer cerca de duas semanas depois da emergência.', SD)],
    niveis: [f('A Embrapa não publica nível de ação numérico.', SD, 'ct205')],
    manejo: {
      cultural: [f('Rotação de culturas, que reduz o inóculo; semente livre dos patógenos e tratada.', SD)],
      quimico: [f('Aplicações na parte aérea com os mesmos fungicidas usados contra a ferrugem-asiática; a eficiência é comparada em ensaios cooperativos (Circular Técnica 205).', SD, 'ct205')],
      resistencia: [f('Há isolados de Cercospora kikuchii resistentes a inibidores da quinona externa (estrobilurinas) e a MBC (benzimidazóis).', SD)],
    },
    cuidados: [],
    lacunas: ['Produtos e doses não entram no app.'],
  },

  antracnose: {
    alvo: 'antracnose',
    classificacao: f('Doença causada por Colletotrichum (C. truncatum, C. sojae e C. plurivorum).', SD),
    dano: [f('Causa queda e apodrecimento de vagens, aborto de grãos e tombamento de plântulas de semente infectada.', SD)],
    reconhecer: [
      f('Manchas negras, ligeiramente deprimidas e brilhantes em hastes, pecíolos e racemos; lesões negras sobre as nervuras; nas vagens, pontos encharcados que viram manchas negras circulares com pontinhos escuros.', SD),
    ],
    favorecem: [
      f('Mais comum onde há calor e umidade altos, como nos Cerrados; o fungo precisa de pelo menos 12 horas de molhamento da folha.', SD),
      f('Plantas com deficiência de potássio ficam mais suscetíveis; a nutrição com potássio reduz a incidência em mais de 50%.', SD),
    ],
    monitorar: [f('Inspecionar hastes, pecíolos e vagens.', SD)],
    niveis: [f('A Embrapa não publica nível de ação numérico.', SD)],
    manejo: {
      cultural: [
        f('Sementes sadias ou tratadas; rotação e diversificação de culturas; adubação adequada, principalmente com potássio; população de plantas adequada; manejo eficiente de pragas (principalmente percevejos) e de plantas invasoras.', SD),
      ],
    },
    cuidados: [f('Pode ser confundida com mancha-alvo, crestamento de Cercospora e seca da haste e da vagem; o fungo cresce em tecidos mortos de outros estresses.', SD)],
    lacunas: ['O capítulo não traz fungicidas específicos para antracnose.'],
  },

  bacteriose: {
    alvo: 'bacteriose',
    classificacao: f('Doenças bacterianas: crestamento-bacteriano (Pseudomonas savastanoi pv. glycinea) e mancha-bacteriana-marrom (Curtobacterium flaccumfaciens). A pústula bacteriana é citada só como confusão com a ferrugem.', SD),
    dano: [f('O crestamento-bacteriano é comum em quase todas as regiões; a mancha-bacteriana-marrom ocorre de forma esporádica e de baixa intensidade.', SD)],
    reconhecer: [
      f('Crestamento: manchas pequenas, translúcidas, com halo verde-amarelado, angulares, que se juntam e necrosam entre as nervuras; na face de baixo, quase negras, com película brilhante nas manhãs úmidas.', SD),
      f('Mancha-bacteriana-marrom: lesões cloróticas que secam no centro e ficam marrons.', SD),
    ],
    favorecem: [f('Crestamento: períodos úmidos e temperaturas amenas (20 °C a 26 °C); precisa de filme de água na folha. A infecção vem de sementes e restos de cultura.', SD)],
    monitorar: [f('Inspeção visual de folhas.', SD)],
    niveis: [],
    manejo: {},
    cuidados: [],
    lacunas: ['A Embrapa informa que não há cultivares resistentes e que não há medidas de controle indicadas para o crestamento-bacteriano nem para a mancha-bacteriana-marrom.'],
  },

  olhoDeRa: {
    alvo: 'olhoDeRa',
    classificacao: f('Doença causada pelo fungo Cercospora sojina.', SD),
    dano: [f('Pode atingir folha, haste, vagem e semente (rachaduras e manchas na semente).', SD)],
    reconhecer: [f('Pontos encharcados que viram manchas com centro castanho-claro na face de cima e cinza embaixo, com bordas castanho-avermelhadas, sem anéis.', SD)],
    favorecem: [f('Temperatura e umidade altas. Mais comum a partir do florescimento. O fungo é levado pela semente e pelo vento e sobrevive em restos de cultura.', SD)],
    monitorar: [f('Inspecionar folhas do terço médio e superior.', SD)],
    niveis: [f('A Embrapa não publica nível de ação numérico.', SD)],
    manejo: {
      genetico: [f('A doença é controlada pelo uso de cultivares resistentes.', SD)],
      cultural: [f('Tratar a semente evita reintroduzir o fungo ou trazer novas raças.', SD)],
    },
    cuidados: [],
    lacunas: ['O capítulo não detalha fungicidas de parte aérea para olho-de-rã.'],
  },

  mela: {
    alvo: 'mela',
    classificacao: f('Doença causada por Rhizoctonia solani (grupo AG1), a mela ou requeima.', SD),
    dano: [f('Ocorre com maior intensidade em Mato Grosso, Maranhão, Tocantins e Roraima, com perdas médias de 30%, chegando a 60% em situação de clima extremamente favorável.', SD)],
    reconhecer: [
      f('Lesões encharcadas, pardo-avermelhadas a roxas, que viram marrom-escuras a pretas, nas folhas do terço médio; podem tomar a folha toda.', SD),
      f('Folhas infectadas ficam coladas a outras folhas ou às hastes pelo micélio do fungo. Em baixa umidade, ficam só manchas marrons.', SD),
      f('Manchas castanho-avermelhadas em hastes, pecíolos e vagens; vagens novas e flores podem apodrecer por inteiro.', SD),
    ],
    favorecem: [
      f('Temperatura entre 25 °C e 30 °C e umidade relativa acima de 80%; a frequência e a distribuição das chuvas durante o ciclo são determinantes.', SD),
      f('Os respingos de chuva carregam fragmentos do fungo (que sobrevive no solo e em restos de cultura) para folhas e pecíolos de plantas jovens, antes do fechamento das entrelinhas.', SD),
    ],
    monitorar: [f('Inspeção visual, com atenção às folhas coladas e às lesões encharcadas, desde plantas jovens. Pode ocorrer em qualquer estádio.', SD)],
    niveis: [f('A Embrapa não publica nível de ação numérico.', SD)],
    manejo: {
      cultural: [
        f('O controle é mais eficiente com medidas integradas: semeadura direta, nutrição equilibrada (principalmente K, S, Zn, Cu e Mn), rotação com plantas não hospedeiras, redução da população de plantas e eliminação de plantas daninhas.', SD),
        f('A cobertura morta do plantio direto é uma das medidas mais eficientes, porque evita os respingos de chuva que levam o fungo para as folhas.', SD),
      ],
      genetico: [f('Não há cultivares resistentes.', SD)],
      quimico: [f('Controle químico faz parte das medidas integradas.', SD)],
    },
    cuidados: [],
    lacunas: ['O capítulo não detalha fungicidas para mela. Produtos e doses não entram no app.'],
  },

  raizHaste: {
    alvo: 'raizHaste',
    classificacao: f('Grupo de doenças de raiz e haste: podridão de carvão (Macrophomina), podridão parda da haste (Cadophora gregata), Phytophthora, podridão vermelha da raiz (Fusarium), Rhizoctonia (AG4) e Sclerotium.', SD),
    dano: [
      f('Phytophthora: o "dano oculto" pode reduzir o rendimento em até 40%.', SD),
      f('Podridão parda da haste: reduções médias de rendimento de 22% a 35% foram relatadas, nos estados do Sul.', SD),
    ],
    reconhecer: [
      f('Carvão: raízes cinzentas, com pontos negros (microescleródios) sob a epiderme; folhas secam e ficam presas aos pecíolos, voltadas para baixo.', SD),
      f('Phytophthora: raiz principal marrom e mole; marrom-escuro no exterior da haste, desde o solo; plantas isoladas ou em grupos, em solo compactado e com acúmulo de umidade.', SD),
      f('Podridão vermelha: mancha avermelhada na raiz principal, 1 a 2 cm abaixo do solo; folhas carijó (manchas entre as nervuras); aparece em reboleiras.', SD),
      f('Sclerotium: murcha e tombamento, com formação cotonosa branca e escleródios na base da haste.', SD),
    ],
    favorecem: [
      f('Carvão: anos secos e quentes. Phytophthora: temperatura de 25 °C ou mais e água livre no solo. Podridão vermelha: solos compactados e mal drenados.', SD),
    ],
    monitorar: [f('Arrancar plantas com sintomas e cortar a haste e a raiz para olhar por dentro; comparar com planta sadia vizinha.', SD)],
    niveis: [f('A Embrapa não publica nível de ação numérico.', SD)],
    manejo: {
      cultural: [
        f('Evitar semeadura em solos compactados e mal drenados; descompactar e drenar.', SD),
        f('Rotação e sucessão (por exemplo, com sorgo, trigo ou gramíneas) conforme a doença; para o carvão, que tem muitos hospedeiros, a rotação não tem efeito direto, e ajudam o fósforo e o potássio adequados e a cobertura do solo.', SD),
      ],
      genetico: [f('Para Phytophthora, a resistência genética é o principal método. Não há cultivares resistentes à podridão vermelha da raiz nem ao Sclerotium.', SD)],
      quimico: [f('Tratamento de sementes com fungicida ajuda contra Phytophthora (metalaxil) e contra o tombamento por Rhizoctonia.', SD)],
    },
    cuidados: [f('Podem ser confundidas com mofo-branco e com nematoides.', 'projeto')],
    lacunas: ['Cada doença deste grupo tem medidas próprias; confirme qual é com o agrônomo (amostra de solo e planta). Nematoides de galhas e de cisto ainda não têm ficha neste app.'],
  },
}

/** Aviso fixo que acompanha o controle químico em toda ficha. */
export const AVISO_QUIMICO =
  'Aqui estão só os grupos químicos e princípios ativos que a Embrapa cita. Marcas e doses ficam de fora de propósito: qualquer produto precisa estar registrado no Mapa para soja (consulte o Agrofit), ter receituário agronômico e ser decidido pelo agrônomo.'

/**
 * Candidatos do diagnóstico que correspondem a um alvo do registro, mas não trazem `alvo` (o campo `alvo` do diagnóstico
 * também liga ao registro e às fotos, então não foi mexido). Assim a Biblioteca acha a ficha completa de cada um.
 */
export const ALVO_DO_CANDIDATO: Record<string, AlvoId> = {
  percevejo: 'percevejo', lagarta: 'lagarta', ferrugem: 'ferrugem', mofo: 'mofo', manchaalvo: 'manchaAlvo',
  anticarsia: 'anticarsia', lagarta_vagem: 'helicoverpa', mosca_branca: 'moscaBranca', vaquinha: 'vaquinha', acaro: 'acaro',
  tamandua: 'tamandua', elasmo: 'elasmo', coro: 'coro', oidio: 'oidio', dfc: 'finalCiclo', antracnose: 'antracnose',
  bacteriose: 'bacteriose', olho_de_ra: 'olhoDeRa', raiz_haste: 'raizHaste',
}

/** Alvos do registro que ainda não têm árvore de sintomas no diagnóstico: aparecem na Biblioteca só com a ficha. */
export const ALVOS_SO_NA_BIBLIOTECA: AlvoId[] = ['spodoptera', 'broca', 'mela']
