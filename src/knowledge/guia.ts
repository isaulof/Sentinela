import type { Arvore, NoResultado } from '@/domain/diagnosis'

const res = (r: Omit<NoResultado, 'tipo'>): NoResultado => ({ tipo: 'resultado', ...r })

const FOTO = 'Tire uma foto da planta e outra da área toda, e marque o local no mapa.'
const COMPARE = 'Compare com uma planta sadia da mesma área.'

/**
 * Guia em funil para quem não é técnico: uma pergunta por vez, linguagem de campo.
 * O resultado é sempre uma PISTA para levar ao agrônomo, nunca uma ordem de aplicação.
 * Nomes de pragas e doenças e níveis de ação vêm de FONTES (Embrapa); o raciocínio de
 * distinguir causa viva (biótica) de causa não viva (abiótica) é decisão de projeto.
 */
export const GUIA: Arvore = {
  id: 'guia',
  titulo: 'O que está acontecendo na lavoura?',
  descricao: 'Responda o que você está vendo. O guia aponta a causa mais provável e o próximo passo.',
  raiz: 'inicio',
  fontes: ['caderneta', 'fitotoxicidade', 'projeto'],
  origem: 'projeto',
  nos: {
    inicio: {
      tipo: 'pergunta',
      texto: 'O que você está vendo na lavoura?',
      dica: 'Escolha o que mais chama atenção. Se for mais de uma coisa, comece pela que está pior.',
      opcoes: [
        { rotulo: 'Manchas ou pontos nas folhas', icone: 'folha', detalhe: 'Folhas com manchas, pintas ou pó', destino: 'manchas' },
        { rotulo: 'Folhas amarelas ou pálidas', icone: 'sol', detalhe: 'Sem manchas, só a cor mudou', destino: 'amarelo' },
        { rotulo: 'Bichos ou folhas comidas', icone: 'bicho', detalhe: 'Lagarta, percevejo ou buracos', destino: 'bicho' },
        { rotulo: 'Plantas murchas ou secando', icone: 'murcha', detalhe: 'Caem, secam ou morrem', destino: 'murcha' },
        { rotulo: 'Não sei explicar', icone: 'duvida', detalhe: 'Vou olhar o desenho no terreno', destino: 'padrao' },
      ],
    },

    manchas: {
      tipo: 'pergunta',
      texto: 'Olhe de perto (use a câmera do celular com zoom). Como são as manchas?',
      dica: 'Vire a folha e olhe também por baixo. A causa viva (doença) costuma deixar marcas visíveis; a causa não viva, não.',
      opcoes: [
        { rotulo: 'Pontinhos ou pó por baixo da folha', icone: 'lupa', detalhe: 'Pequenas bolinhas marrons ou alaranjadas, como pústulas', destino: 'r_ferrugem' },
        { rotulo: 'Círculos marrons com anéis', icone: 'alvo', detalhe: 'Parecem um alvo, com ponto no centro e borda amarelada', destino: 'r_manchaalvo' },
        { rotulo: 'Mofo branco, como algodão', icone: 'nuvem', detalhe: 'Na haste, nas vagens ou nas folhas, às vezes com pontos pretos', destino: 'r_mofo' },
        { rotulo: 'Nada disso; parece queimado', icone: 'fogo', detalhe: 'Sem pontinhos nem mofo', destino: 'padrao' },
      ],
    },

    amarelo: {
      tipo: 'pergunta',
      texto: 'Quais folhas estão amarelas?',
      dica: 'Folhas de baixo são as mais velhas; as do topo são as novas.',
      opcoes: [
        { rotulo: 'As de baixo, mais velhas', icone: 'baixo', detalhe: 'A planta tira o nutriente de baixo e leva para cima', destino: 'r_nutriente_velhas' },
        { rotulo: 'As de cima, mais novas', icone: 'cima', detalhe: 'Ponteiro amarelo ou esbranquiçado', destino: 'r_nutriente_novas' },
        { rotulo: 'Não é só uma parte', icone: 'pontos', detalhe: 'Depende do local no terreno', destino: 'padrao' },
      ],
    },

    bicho: {
      tipo: 'pergunta',
      texto: 'Que bicho ou dano você encontrou?',
      opcoes: [
        { rotulo: 'Lagartas comendo as folhas', icone: 'bicho', detalhe: 'Folhas esburacadas ou só com as nervuras', destino: 'r_lagarta' },
        { rotulo: 'Percevejos nas plantas ou nas vagens', icone: 'bicho', detalhe: 'Vagens chochas, grãos manchados ou murchos', destino: 'r_percevejo' },
        { rotulo: 'Outro bicho ou não sei', icone: 'duvida', detalhe: 'Vou tirar foto', destino: 'r_bicho_outro' },
      ],
    },

    murcha: {
      tipo: 'pergunta',
      texto: 'Olhe a haste perto do chão e as raízes. O que você vê?',
      dica: 'Arranque uma planta murcha com cuidado e compare com uma sadia.',
      opcoes: [
        { rotulo: 'Mofo branco ou pontos pretos duros', icone: 'nuvem', detalhe: 'Os pontos pretos duros são os escleródios', destino: 'r_mofo' },
        { rotulo: 'Haste ou raiz escura, mole ou podre', icone: 'raiz', detalhe: 'Sem mofo branco', destino: 'r_raiz' },
        { rotulo: 'Raiz e haste parecem normais', icone: 'ok', detalhe: 'Pode ser falta de água, calor ou solo duro', destino: 'r_estresse' },
      ],
    },

    padrao: {
      tipo: 'pergunta',
      texto: 'Como o problema aparece no terreno?',
      dica: 'Se der, suba num ponto alto ou use as fotos de drone. O desenho no terreno diz muito.',
      opcoes: [
        { rotulo: 'Em faixas retas', icone: 'faixas', detalhe: 'Segue o caminho da máquina ou do pulverizador', destino: 'faixa' },
        { rotulo: 'Em manchas redondas que crescem', icone: 'circulo', detalhe: 'O centro está pior que a beirada', destino: 'r_reboleira' },
        { rotulo: 'Igual na área toda', icone: 'grade', detalhe: 'Sem desenho definido', destino: 'r_uniforme' },
        { rotulo: 'Plantas soltas, sem desenho', icone: 'pontos', detalhe: 'Aqui e ali', destino: 'r_isoladas' },
      ],
    },
    faixa: {
      tipo: 'pergunta',
      texto: 'As plantas novas, que nasceram depois do problema, estão sadias?',
      dica: 'Se as folhas novas estão normais, o problema parou de avançar.',
      opcoes: [
        { rotulo: 'Sim, estão sadias', icone: 'folha', detalhe: 'O problema parou', destino: 'r_operacional' },
        { rotulo: 'Não, continua piorando', icone: 'cima', detalhe: 'O problema segue avançando', destino: 'r_reboleira' },
      ],
    },

    r_ferrugem: res({
      titulo: 'Pode ser ferrugem-asiática',
      categoria: 'biotico',
      alvo: 'ferrugem',
      urgencia: 'chamar',
      explicacao: 'Pontinhos ou pó por baixo da folha são o sinal típico da ferrugem-asiática. Não existe um número de plantas doentes que defina a hora de agir: a decisão depende da detecção, da época e do clima, e é do agrônomo.',
      proximosPassos: [
        'Olhe as folhas de baixo da planta, onde a doença costuma aparecer primeiro.',
        FOTO,
        'Registre no Campo como "Ferrugem-asiática" para ficar no histórico.',
        'Avise o agrônomo hoje: ele decide o que fazer.',
      ],
    }),
    r_manchaalvo: res({
      titulo: 'Pode ser mancha-alvo',
      categoria: 'biotico',
      alvo: 'manchaAlvo',
      urgencia: 'chamar',
      explicacao: 'Manchas redondas e marrons, com anéis como um alvo, ponto no centro e borda amarelada, combinam com a mancha-alvo. É mais comum no Cerrado, principalmente depois de algodão.',
      proximosPassos: [FOTO, 'Registre no Campo como "Mancha-alvo".', 'Leve as fotos ao agrônomo para confirmar a doença antes de qualquer decisão.'],
    }),
    r_mofo: res({
      titulo: 'Pode ser mofo-branco',
      categoria: 'biotico',
      alvo: 'mofo',
      urgencia: 'chamar',
      explicacao: 'Mofo branco como algodão, às vezes com pontos pretos duros (escleródios), indica mofo-branco. Ele se desenvolve com solo úmido, temperatura amena (15 a 25 °C) e pouca luz.',
      proximosPassos: [
        FOTO,
        'Registre no Campo como "Mofo-branco".',
        'Limpe as máquinas ao sair da área, para não levar os escleródios para outro talhão.',
        'Chame o agrônomo para confirmar e definir o manejo.',
      ],
    }),

    r_nutriente_velhas: res({
      titulo: 'Provável falta de nutriente',
      categoria: 'abiotico',
      urgencia: 'acompanhar',
      explicacao: 'Amarelo nas folhas de baixo, sem manchas nem mofo, costuma ser falta de um nutriente que a planta consegue mover (como nitrogênio ou potássio). Não é doença, então fungicida não resolve.',
      proximosPassos: [COMPARE, FOTO, 'Peça ao agrônomo análise de solo e de folha para saber qual nutriente falta.', 'Confira se as raízes têm nódulos (bolinhas), que fornecem nitrogênio à soja.'],
    }),
    r_nutriente_novas: res({
      titulo: 'Provável falta de nutriente ou efeito de produto',
      categoria: 'abiotico',
      urgencia: 'acompanhar',
      explicacao: 'Amarelo ou esbranquiçado nas folhas novas, sem manchas, aponta para falta de um nutriente que a planta não consegue mover (como enxofre, ferro ou manganês) ou para efeito de herbicida. Doença é pouco provável.',
      proximosPassos: [COMPARE, 'Pergunte o que foi aplicado nos últimos dias na área.', FOTO, 'Peça ao agrônomo análise de solo e de folha.'],
    }),

    r_lagarta: res({
      titulo: 'Lagartas: conte antes de decidir',
      categoria: 'biotico',
      alvo: 'lagarta',
      urgencia: 'acompanhar',
      explicacao: 'Ter lagarta não quer dizer que precisa aplicar. A Embrapa indica agir a partir de 20 lagartas maiores que 1,5 cm por metro de fileira, ou 30% de folhas comidas antes da floração e 15% depois.',
      proximosPassos: ['Conte as lagartas em 1 metro de fileira, em vários pontos do talhão.', 'Registre cada ponto no Campo: o app compara com o nível de ação.', 'Se o nível for atingido, a decisão é do agrônomo.'],
    }),
    r_percevejo: res({
      titulo: 'Percevejos: conte com o pano de batida',
      categoria: 'biotico',
      alvo: 'percevejo',
      urgencia: 'acompanhar',
      explicacao: 'Percevejo faz dano a partir da formação das vagens (R3). O nível de ação é 2 percevejos por metro para grãos e 1 para sementes, medidos com o pano de batida.',
      proximosPassos: ['Estenda o pano branco de 1 metro entre duas fileiras e bata as plantas sobre ele.', 'Conte os percevejos adultos e ninfas maiores.', 'Registre no Campo. O app compara com o nível de ação; a decisão é do agrônomo.'],
    }),
    r_bicho_outro: res({
      titulo: 'Bicho não identificado',
      categoria: 'inconclusivo',
      urgencia: 'chamar',
      explicacao: 'Sem saber qual é o bicho, não dá para saber se ele causa prejuízo. Foto nítida resolve a maioria dos casos.',
      proximosPassos: ['Fotografe o bicho de perto e o dano que ele faz.', FOTO, 'Envie ao agrônomo para identificar.'],
    }),

    r_raiz: res({
      titulo: 'Possível problema de raiz ou de solo',
      categoria: 'investigar',
      urgencia: 'chamar',
      explicacao: 'Raiz ou haste escura e mole, sem mofo branco, pode ser doença de solo, ataque de nematoide ou raiz comprometida por solo compactado. Só o exame da planta e do solo separa uma causa da outra.',
      proximosPassos: [FOTO, 'Arranque uma planta murcha inteira, com a raiz, e fotografe.', 'Chame o agrônomo: ele pode coletar amostra de solo e planta.'],
    }),
    r_estresse: res({
      titulo: 'Provável estresse (água, calor ou solo duro)',
      categoria: 'abiotico',
      urgencia: 'acompanhar',
      explicacao: 'Com raiz e haste normais, murcha costuma ser falta de água, calor forte ou solo compactado que impede a raiz de aprofundar. Não é doença.',
      proximosPassos: ['Veja se a planta se recupera no fim da tarde ou depois da chuva.', 'Cave um pouco e confira se o solo está muito duro ou seco.', FOTO],
    }),

    r_operacional: res({
      titulo: 'Provável erro de operação',
      categoria: 'abiotico',
      urgencia: 'acompanhar',
      explicacao: 'Faixas retas que seguem a máquina, com plantas novas sadias, apontam para falha de aplicação, deriva ou efeito de produto. Doença não segue a passada do pulverizador.',
      proximosPassos: ['Meça a largura da faixa e compare com a barra do pulverizador ou da plantadeira.', 'Veja no caderno de operações o que foi aplicado ali e quando.', FOTO, 'Fale com o agrônomo antes de aplicar qualquer produto: não é doença.'],
    }),
    r_reboleira: res({
      titulo: 'Reboleira: investigar a causa',
      categoria: 'investigar',
      urgencia: 'chamar',
      explicacao: 'Manchas redondas que crescem, com o centro pior, podem ser praga, doença ou problema de solo. Só olhar de perto diz qual.',
      proximosPassos: ['Marque a reboleira no mapa e tire fotos do centro e da borda.', 'Procure bichos e marcas de doença na planta e na raiz.', 'Volte ao início do guia e responda de novo olhando a planta de perto.', 'Se continuar crescendo, chame o agrônomo.'],
    }),
    r_uniforme: res({
      titulo: 'Problema geral: clima, solo ou nutrição',
      categoria: 'abiotico',
      urgencia: 'acompanhar',
      explicacao: 'Quando tudo está igual na área toda, a causa costuma ser algo que atinge todo o talhão ao mesmo tempo: clima (seca, geada, granizo), solo ou manejo. Doenças e pragas costumam aparecer em focos.',
      proximosPassos: ['Lembre o que aconteceu nos últimos dias: chuva forte, seca, geada, aplicação.', FOTO, 'Mostre ao agrônomo para avaliar.'],
    }),
    r_isoladas: res({
      titulo: 'Plantas isoladas: observar e fotografar',
      categoria: 'inconclusivo',
      urgencia: 'acompanhar',
      explicacao: 'Poucas plantas soltas dificilmente indicam um problema do talhão inteiro. Pode ser falha de semeadura, solo ruim naquele ponto ou um início de foco.',
      proximosPassos: [FOTO, 'Volte ao local em alguns dias e veja se o problema aumentou.', 'Se aumentar, responda o guia de novo e chame o agrônomo.'],
    }),
  },
}
