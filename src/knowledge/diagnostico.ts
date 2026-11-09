import type { Candidato, Frequencia, PerguntaFunil } from '@/domain/funil'

/**
 * Base do guia de diagnóstico em funil (soja). Perguntas visuais + perfil de cada causa.
 *
 * Fontes: nomes, locais de ataque e níveis de ação das cinco causas monitoradas vêm da Embrapa (FONTES.md).
 * O PERFIL de sintomas (quão típica é cada resposta) é montado pela equipe a partir do que a literatura
 * descreve e está marcado como `origem: 'projeto'` até ser conferido nas circulares. O guia aponta uma
 * pista para o agrônomo; nunca indica produto nem dose.
 *
 * Fotos: public/imagens/diagnostico/<nome-do-problema>.jpg (ver slugDe). Fotos das respostas, se houver:
 * public/imagens/diagnostico/resposta-<pergunta>-<opcao>.jpg
 */

const T: Frequencia = 'tipico'
const C: Frequencia = 'comum'
const P: Frequencia = 'possivel'
const R: Frequencia = 'raro'
const N: Frequencia = 'incompativel'

export const PERGUNTAS: PerguntaFunil[] = [
  {
    id: 'onde',
    texto: 'Onde está o problema?',
    dica: 'Escolha o que mais chama atenção. Se for mais de uma coisa, comece pela que está pior.',
    opcoes: [
      { id: 'folha_mancha', rotulo: 'Manchas ou pontos nas folhas', detalhe: 'Pintas, círculos, pó ou queimado', icone: 'folha' },
      { id: 'folha_cor', rotulo: 'Folhas amarelas ou pálidas', detalhe: 'A cor mudou, sem mancha definida', icone: 'sol' },
      { id: 'folha_comida', rotulo: 'Folhas comidas ou furadas', detalhe: 'Buracos, só as nervuras ficaram', icone: 'bicho' },
      { id: 'vagem', rotulo: 'Vagens ou grãos', detalhe: 'Vagem chocha, grão manchado ou furado', icone: 'circulo' },
      { id: 'haste_raiz', rotulo: 'Haste ou raiz', detalhe: 'Perto do chão, apodrecendo', icone: 'raiz' },
      { id: 'murcha', rotulo: 'Planta murcha ou seca', detalhe: 'Cai, seca ou morre', icone: 'murcha' },
    ],
  },
  {
    id: 'mancha',
    texto: 'Olhe a folha de perto. Como são as marcas?',
    dica: 'Use o zoom da câmera do celular e vire a folha: olhe também por baixo.',
    opcoes: [
      { id: 'pustula', rotulo: 'Pontinhos ou pústulas por baixo', detalhe: 'Bolinhas pequenas, marrons ou alaranjadas', icone: 'lupa' },
      { id: 'alvo', rotulo: 'Círculos marrons com anéis', detalhe: 'Parecem um alvo, com borda amarelada', icone: 'alvo' },
      { id: 'po_branco', rotulo: 'Pó branco por cima da folha', detalhe: 'Como se tivesse polvilhado farinha', icone: 'nuvem' },
      { id: 'pardas', rotulo: 'Pontos pardos pequenos', detalhe: 'Marrom-avermelhados, com folha amarela em volta', icone: 'pontos' },
      { id: 'angular', rotulo: 'Manchas de cantos retos', detalhe: 'Parecem encharcadas, com halo amarelo', icone: 'grade' },
      { id: 'nenhuma', rotulo: 'Sem mancha definida', detalhe: 'Só cor diferente ou queimado', icone: 'folha' },
    ],
  },
  {
    id: 'altura',
    texto: 'Em que altura da planta o problema aparece?',
    dica: 'As folhas de baixo são as mais velhas; as do topo, as mais novas.',
    opcoes: [
      { id: 'baixo', rotulo: 'Folhas de baixo', detalhe: 'As mais velhas', icone: 'baixo' },
      { id: 'meio', rotulo: 'Folhas do meio', icone: 'faixas' },
      { id: 'topo', rotulo: 'Folhas de cima', detalhe: 'As mais novas, o ponteiro', icone: 'cima' },
      { id: 'toda', rotulo: 'A planta toda', icone: 'grade' },
    ],
  },
  {
    id: 'bicho',
    texto: 'Você viu algum bicho na planta?',
    dica: 'Balance a planta sobre um pano branco ou uma folha de papel e veja o que cai.',
    opcoes: [
      { id: 'lagarta', rotulo: 'Lagartas', detalhe: 'Comendo folhas ou vagens', icone: 'bicho' },
      { id: 'percevejo', rotulo: 'Percevejos', detalhe: 'Marrons ou verdes, nas plantas ou vagens', icone: 'bicho' },
      { id: 'mosca_branca', rotulo: 'Mosquinhas brancas', detalhe: 'Voam quando se balança a planta', icone: 'nuvem' },
      { id: 'nenhum', rotulo: 'Nenhum bicho', icone: 'ok' },
    ],
  },
  {
    id: 'mofo',
    texto: 'Há algo branco, preto ou escuro na haste, nos galhos ou nas vagens?',
    opcoes: [
      { id: 'algodao', rotulo: 'Mofo branco, como algodão', detalhe: 'Na haste, nas axilas ou nas vagens', icone: 'nuvem' },
      { id: 'preto_duro', rotulo: 'Pontos pretos e duros', detalhe: 'Parecem sementes pretas (escleródios)', icone: 'circulo' },
      { id: 'manchas_escuras', rotulo: 'Manchas escuras ou avermelhadas', detalhe: 'Na haste, no pecíolo ou na vagem', icone: 'fogo' },
      { id: 'nada', rotulo: 'Nada disso', icone: 'ok' },
    ],
  },
  {
    id: 'grao',
    texto: 'Como estão as vagens e os grãos?',
    dica: 'Abra algumas vagens e olhe os grãos.',
    opcoes: [
      { id: 'chochas_manchadas', rotulo: 'Vagens chochas, grãos murchos ou manchados', icone: 'murcha' },
      { id: 'furadas', rotulo: 'Vagens ou grãos furados ou comidos', icone: 'bicho' },
      { id: 'manchas_vagem', rotulo: 'Manchas escuras na casca da vagem', icone: 'fogo' },
      { id: 'normais', rotulo: 'Parecem normais', icone: 'ok' },
    ],
  },
  {
    id: 'raiz',
    texto: 'Arranque uma planta com cuidado. Como estão a raiz e a haste perto do chão?',
    opcoes: [
      { id: 'podre', rotulo: 'Escuras, moles ou podres', detalhe: 'Sem mofo branco', icone: 'raiz' },
      { id: 'mofo_branco', rotulo: 'Cobertas de mofo branco', detalhe: 'Às vezes com pontos pretos duros', icone: 'nuvem' },
      { id: 'galhas', rotulo: 'Raízes com caroços ou galhas', detalhe: 'Nódulos grandes, deformados', icone: 'pontos' },
      { id: 'normal', rotulo: 'Parecem normais', icone: 'ok' },
    ],
  },
  {
    id: 'terreno',
    texto: 'Como o problema aparece no terreno?',
    dica: 'Se der, suba num ponto alto ou olhe fotos de drone. O desenho no terreno diz muito.',
    opcoes: [
      { id: 'faixas', rotulo: 'Em faixas retas', detalhe: 'Segue o caminho da máquina', icone: 'faixas' },
      { id: 'reboleira', rotulo: 'Em manchas redondas que crescem', detalhe: 'O centro está pior que a beirada', icone: 'circulo' },
      { id: 'uniforme', rotulo: 'Igual na área toda', icone: 'grade' },
      { id: 'isoladas', rotulo: 'Plantas soltas, sem desenho', icone: 'pontos' },
    ],
  },
]

const FOTO = 'Tire uma foto da planta e outra da área toda e marque o ponto no mapa.'
const AGRONOMO = 'Leve as fotos ao agrônomo: a decisão de aplicar é dele.'

export const CANDIDATOS: Candidato[] = [
  {
    id: 'ferrugem', nome: 'Ferrugem-asiática', cientifico: 'Phakopsora pachyrhizi', tipo: 'doenca', alvo: 'ferrugem', origem: 'projeto', fontes: ['ct188'],
    resumo: 'Pontinhos ou pústulas por baixo das folhas, começando pelas de baixo, são o sinal típico. Evolui para manchas marrons, amarelecimento e queda das folhas.',
    confundeCom: ['Doenças de final de ciclo', 'Pústula bacteriana', 'Mancha-alvo'],
    comoConfirmar: ['Olhe a face de baixo das folhas do baixeiro com lupa (10x a 20x).', 'Procure pústulas abertas com pó (esporos).'],
    proximosPassos: [FOTO, 'Registre na Coleta como "Ferrugem-asiática".', 'Avise o agrônomo hoje: o momento de agir depende da época e do clima.'],
    perfil: {
      onde: { folha_mancha: T, folha_cor: C, folha_comida: R, vagem: R, haste_raiz: N, murcha: R },
      mancha: { pustula: T, alvo: R, po_branco: N, pardas: P, angular: R, nenhuma: P },
      altura: { baixo: T, meio: C, topo: P, toda: P },
      bicho: { nenhum: C, lagarta: R, percevejo: R, mosca_branca: R },
      mofo: { nada: C, algodao: N, preto_duro: N, manchas_escuras: R },
      grao: { normais: C, chochas_manchadas: R, furadas: R, manchas_vagem: R },
      raiz: { normal: C, podre: R, mofo_branco: N, galhas: R },
      terreno: { reboleira: C, uniforme: P, faixas: N, isoladas: P },
    },
  },
  {
    id: 'manchaalvo', nome: 'Mancha-alvo', cientifico: 'Corynespora cassiicola', tipo: 'doenca', alvo: 'manchaAlvo', origem: 'projeto', fontes: ['ct139'],
    resumo: 'Manchas redondas e marrons, com anéis como um alvo e borda amarelada, nas folhas do baixeiro e do meio.',
    confundeCom: ['Ferrugem-asiática', 'Doenças de final de ciclo'],
    comoConfirmar: ['Procure o ponto escuro no centro da mancha e os anéis concêntricos.', 'Confira o histórico da área: é mais comum depois de algodão.'],
    proximosPassos: [FOTO, 'Registre na Coleta como "Mancha-alvo".', AGRONOMO],
    perfil: {
      onde: { folha_mancha: T, folha_cor: P, folha_comida: N, vagem: R, haste_raiz: R, murcha: R },
      mancha: { alvo: T, pardas: P, pustula: R, po_branco: N, angular: P, nenhuma: R },
      altura: { baixo: C, meio: T, topo: P, toda: P },
      bicho: { nenhum: C, lagarta: R, percevejo: R, mosca_branca: R },
      mofo: { nada: C, algodao: N, preto_duro: N, manchas_escuras: R },
      raiz: { normal: C, podre: P, mofo_branco: N, galhas: R },
      terreno: { uniforme: P, reboleira: P, faixas: N, isoladas: P },
    },
  },
  {
    id: 'mofo', nome: 'Mofo-branco', cientifico: 'Sclerotinia sclerotiorum', tipo: 'doenca', alvo: 'mofo', origem: 'projeto', fontes: ['ct152'],
    resumo: 'Mofo branco como algodão na haste, nas axilas ou nas vagens, às vezes com pontos pretos duros (escleródios). Aparece com solo úmido, clima ameno e dossel fechado.',
    confundeCom: ['Podridões de raiz e haste', 'Antracnose'],
    comoConfirmar: ['Procure o micélio branco e os escleródios pretos na haste.', 'Abra a haste: os escleródios também aparecem por dentro.'],
    proximosPassos: [FOTO, 'Registre na Coleta como "Mofo-branco".', 'Limpe as máquinas ao sair da área, para não levar os escleródios a outro talhão.', AGRONOMO],
    perfil: {
      onde: { haste_raiz: T, murcha: T, vagem: C, folha_mancha: P, folha_cor: P, folha_comida: N },
      mancha: { nenhuma: C, pardas: R, alvo: N, po_branco: N, pustula: N, angular: R },
      altura: { meio: C, baixo: C, topo: P, toda: P },
      bicho: { nenhum: C, lagarta: R, percevejo: R, mosca_branca: R },
      mofo: { algodao: T, preto_duro: T, manchas_escuras: R, nada: R },
      grao: { manchas_vagem: P, normais: P, chochas_manchadas: P, furadas: R },
      raiz: { mofo_branco: T, podre: P, normal: P, galhas: N },
      terreno: { reboleira: T, isoladas: C, uniforme: R, faixas: N },
    },
  },
  {
    id: 'oidio', nome: 'Oídio', cientifico: 'Microsphaera diffusa', tipo: 'doenca', origem: 'projeto', fontes: ['projeto'],
    resumo: 'Pó branco, como farinha, por cima das folhas. Com o tempo as folhas ficam amareladas e podem cair.',
    confundeCom: ['Resíduo de produto aplicado', 'Mofo-branco'],
    comoConfirmar: ['Passe o dedo na folha: o pó sai e é superficial.', 'Compare folhas de plantas diferentes.'],
    proximosPassos: [FOTO, 'Anote o estádio da lavoura e o clima dos últimos dias.', AGRONOMO],
    perfil: {
      onde: { folha_mancha: T, folha_cor: P, folha_comida: N, vagem: R, haste_raiz: N, murcha: N },
      mancha: { po_branco: T, pardas: R, alvo: N, pustula: N, angular: N, nenhuma: R },
      altura: { toda: C, topo: C, meio: C, baixo: P },
      bicho: { nenhum: C, lagarta: R, percevejo: R, mosca_branca: R },
      mofo: { nada: C, algodao: P, preto_duro: N, manchas_escuras: N },
      raiz: { normal: C, podre: N, mofo_branco: N, galhas: N },
      terreno: { uniforme: C, reboleira: P, isoladas: P, faixas: N },
    },
  },
  {
    id: 'dfc', nome: 'Doenças de final de ciclo', cientifico: 'Septoria glycines e Cercospora spp.', tipo: 'doenca', origem: 'projeto', fontes: ['ct205'],
    resumo: 'Pontos pardos pequenos nas folhas, com amarelecimento em volta, mais nas folhas de baixo. Aparecem no fim do ciclo e podem causar queda precoce das folhas.',
    confundeCom: ['Ferrugem-asiática', 'Mancha-alvo', 'Pústula bacteriana'],
    comoConfirmar: ['Confira o estádio: é típico a partir do enchimento de grãos.', 'Compare com a ferrugem olhando por baixo da folha: aqui não há pústulas abertas.'],
    proximosPassos: [FOTO, 'Anote o estádio e a posição das lesões na planta.', AGRONOMO],
    perfil: {
      onde: { folha_mancha: T, folha_cor: C, vagem: P, folha_comida: N, haste_raiz: R, murcha: R },
      mancha: { pardas: T, angular: P, pustula: R, alvo: P, po_branco: N, nenhuma: R },
      altura: { baixo: T, meio: C, topo: P, toda: P },
      bicho: { nenhum: C, lagarta: R, percevejo: R, mosca_branca: R },
      mofo: { nada: C, manchas_escuras: P, algodao: N, preto_duro: N },
      grao: { normais: C, manchas_vagem: P, chochas_manchadas: R, furadas: R },
      raiz: { normal: C, podre: R, mofo_branco: N, galhas: R },
      terreno: { uniforme: C, reboleira: P, isoladas: P, faixas: N },
    },
  },
  {
    id: 'antracnose', nome: 'Antracnose', cientifico: 'Colletotrichum truncatum', tipo: 'doenca', origem: 'projeto', fontes: ['projeto'],
    resumo: 'Manchas escuras ou avermelhadas na haste, no pecíolo e nas vagens, que podem deixar vagens vazias ou grãos manchados.',
    confundeCom: ['Mofo-branco', 'Doenças de final de ciclo'],
    comoConfirmar: ['Procure pontinhos pretos (frutificações) sobre as manchas.', 'Abra as vagens afetadas e veja os grãos.'],
    proximosPassos: [FOTO, 'Anote o estádio e a parte da planta atingida.', AGRONOMO],
    perfil: {
      onde: { vagem: T, haste_raiz: C, folha_mancha: P, murcha: P, folha_cor: P, folha_comida: N },
      mancha: { nenhuma: C, pardas: P, angular: P, alvo: R, pustula: N, po_branco: N },
      bicho: { nenhum: C, lagarta: R, percevejo: P, mosca_branca: R },
      mofo: { manchas_escuras: T, nada: P, algodao: N, preto_duro: R },
      grao: { manchas_vagem: T, chochas_manchadas: C, normais: P, furadas: R },
      raiz: { normal: C, podre: P, mofo_branco: N, galhas: R },
      terreno: { uniforme: C, isoladas: C, reboleira: P, faixas: N },
    },
  },
  {
    id: 'bacteriose', nome: 'Pústula e crestamento bacteriano', cientifico: 'Xanthomonas e Pseudomonas', tipo: 'doenca', origem: 'projeto', fontes: ['projeto'],
    resumo: 'Manchas de cantos retos, com aspecto encharcado e halo amarelo, que depois secam e podem rasgar a folha. Costumam aparecer depois de chuva com vento ou granizo.',
    confundeCom: ['Ferrugem-asiática', 'Doenças de final de ciclo'],
    comoConfirmar: ['Olhe a mancha contra a luz: o halo amarelo e a borda reta ajudam.', 'Pergunte se houve chuva forte, vento ou granizo nos dias anteriores.'],
    proximosPassos: [FOTO, 'Anote chuvas e granizo recentes.', AGRONOMO],
    perfil: {
      onde: { folha_mancha: T, folha_cor: P, folha_comida: R, vagem: R, haste_raiz: N, murcha: N },
      mancha: { angular: T, pardas: P, pustula: P, alvo: R, po_branco: N, nenhuma: R },
      altura: { meio: C, topo: C, baixo: P, toda: P },
      bicho: { nenhum: C, lagarta: R, percevejo: R, mosca_branca: R },
      mofo: { nada: C, algodao: N, preto_duro: N, manchas_escuras: R },
      raiz: { normal: C, podre: N, mofo_branco: N, galhas: N },
      terreno: { reboleira: P, uniforme: P, isoladas: P, faixas: R },
    },
  },
  {
    id: 'raiz_haste', nome: 'Podridões de raiz e haste', tipo: 'doenca', origem: 'projeto', fontes: ['projeto'],
    resumo: 'Raiz ou haste escura, mole ou podre, com a planta murchando e secando, sem mofo branco. Costuma aparecer em reboleiras ou plantas isoladas.',
    confundeCom: ['Mofo-branco', 'Nematoides', 'Solo compactado'],
    comoConfirmar: ['Arranque a planta inteira e corte a haste ao meio para ver a cor por dentro.', 'Compare com uma planta sadia vizinha.'],
    proximosPassos: [FOTO, 'Arranque uma planta murcha inteira, com a raiz, e fotografe.', 'Peça ao agrônomo para coletar amostra de solo e planta.'],
    perfil: {
      onde: { haste_raiz: T, murcha: T, folha_cor: C, folha_mancha: R, folha_comida: N, vagem: R },
      mancha: { nenhuma: C, pardas: R, alvo: N, po_branco: N, pustula: N, angular: N },
      bicho: { nenhum: C, lagarta: R, percevejo: R, mosca_branca: R },
      mofo: { nada: C, algodao: R, preto_duro: R, manchas_escuras: P },
      raiz: { podre: T, galhas: P, normal: N, mofo_branco: R },
      terreno: { reboleira: C, isoladas: C, uniforme: R, faixas: N },
    },
  },
  {
    id: 'nematoide', nome: 'Nematoides de galhas', tipo: 'praga', origem: 'projeto', fontes: ['projeto'],
    resumo: 'Raízes com caroços ou galhas. Na lavoura, a planta fica amarelada, atrofiada ou murcha, quase sempre em reboleiras.',
    confundeCom: ['Nódulos de nitrogênio (que saem fácil e são róseos por dentro)', 'Podridões de raiz'],
    comoConfirmar: ['Arranque a planta e lave a raiz: as galhas não saem ao esfregar, ao contrário dos nódulos.', 'Peça análise nematológica do solo e da raiz.'],
    proximosPassos: [FOTO, 'Marque a reboleira no mapa e fotografe a raiz.', 'Peça ao agrônomo a coleta de amostra para análise nematológica.'],
    perfil: {
      onde: { haste_raiz: C, murcha: C, folha_cor: C, folha_mancha: R, folha_comida: N, vagem: R },
      mancha: { nenhuma: T, pardas: R, alvo: N, po_branco: N, pustula: N, angular: N },
      altura: { toda: C, baixo: P, meio: P, topo: P },
      bicho: { nenhum: C, lagarta: R, percevejo: R, mosca_branca: R },
      mofo: { nada: C, algodao: N, preto_duro: N, manchas_escuras: R },
      raiz: { galhas: T, podre: P, normal: N, mofo_branco: N },
      terreno: { reboleira: T, isoladas: P, uniforme: R, faixas: N },
    },
  },
  {
    id: 'percevejo', nome: 'Percevejo-marrom', cientifico: 'Euschistus heros', tipo: 'praga', alvo: 'percevejo', origem: 'projeto', fontes: ['caderneta', 'ct137'],
    resumo: 'Percevejos nas plantas ou nas vagens, com vagens chochas e grãos murchos ou manchados. O dano começa a partir da formação das vagens.',
    confundeCom: ['Outros percevejos', 'Estresse hídrico (vagens chochas)'],
    comoConfirmar: ['Use o pano de batida de 1 m e conte adultos e ninfas maiores.', 'Abra as vagens e veja se os grãos têm picadas ou manchas.'],
    proximosPassos: [FOTO, 'Faça o pano de batida e registre na Coleta: o app compara com o nível de ação.', 'Se o nível for atingido, a decisão é do agrônomo.'],
    perfil: {
      onde: { vagem: T, folha_mancha: R, folha_cor: R, folha_comida: N, haste_raiz: N, murcha: R },
      mancha: { nenhuma: T, pardas: R, alvo: N, po_branco: N, pustula: N, angular: N },
      bicho: { percevejo: T, nenhum: R, lagarta: P, mosca_branca: R },
      mofo: { nada: C, manchas_escuras: R, algodao: N, preto_duro: N },
      grao: { chochas_manchadas: T, normais: P, furadas: R, manchas_vagem: P },
      raiz: { normal: C, podre: R, mofo_branco: N, galhas: N },
      terreno: { uniforme: C, reboleira: P, isoladas: P, faixas: R },
    },
  },
  {
    id: 'lagarta', nome: 'Lagarta-falsa-medideira', cientifico: 'Chrysodeixis includens', tipo: 'praga', alvo: 'lagarta', origem: 'projeto', fontes: ['caderneta'],
    resumo: 'Lagartas comendo as folhas, deixando buracos ou só as nervuras. Ter lagarta não quer dizer que precisa aplicar: o app compara a contagem com o nível de ação.',
    confundeCom: ['Outras lagartas desfolhadoras', 'Danos de granizo'],
    comoConfirmar: ['Faça o pano de batida e conte lagartas maiores que 1,5 cm por metro.', 'Estime a porcentagem de folhas comidas.'],
    proximosPassos: [FOTO, 'Conte as lagartas em 1 metro de fileira, em vários pontos, e registre na Coleta.', 'Se o nível for atingido, a decisão é do agrônomo.'],
    perfil: {
      onde: { folha_comida: T, folha_mancha: R, folha_cor: P, vagem: P, haste_raiz: N, murcha: N },
      mancha: { nenhuma: T, pardas: R, alvo: N, po_branco: N, pustula: N, angular: N },
      altura: { meio: C, baixo: C, topo: P, toda: P },
      bicho: { lagarta: T, nenhum: R, percevejo: P, mosca_branca: R },
      mofo: { nada: C, manchas_escuras: N, algodao: N, preto_duro: N },
      grao: { normais: C, furadas: P, chochas_manchadas: R, manchas_vagem: R },
      raiz: { normal: C, podre: N, mofo_branco: N, galhas: N },
      terreno: { reboleira: P, uniforme: C, isoladas: P, faixas: R },
    },
  },
  {
    id: 'lagarta_vagem', nome: 'Lagartas das vagens', cientifico: 'Helicoverpa spp.', tipo: 'praga', origem: 'projeto', fontes: ['projeto'],
    resumo: 'Lagartas que atacam vagens e grãos, deixando furos. Também podem comer folhas e ponteiros.',
    confundeCom: ['Lagarta-falsa-medideira', 'Percevejos (vagens chochas)'],
    comoConfirmar: ['Abra as vagens furadas: a lagarta ou as fezes aparecem por dentro.', 'Faça o pano de batida para contar as lagartas.'],
    proximosPassos: [FOTO, 'Fotografe a lagarta e a vagem furada de perto.', 'Conte as lagartas em vários pontos e leve ao agrônomo.'],
    perfil: {
      onde: { vagem: C, folha_comida: P, folha_mancha: R, folha_cor: R, haste_raiz: N, murcha: N },
      mancha: { nenhuma: T, pardas: R, alvo: N, po_branco: N, pustula: N, angular: N },
      bicho: { lagarta: T, nenhum: R, percevejo: P, mosca_branca: R },
      mofo: { nada: C, manchas_escuras: R, algodao: N, preto_duro: N },
      grao: { furadas: T, chochas_manchadas: P, normais: R, manchas_vagem: P },
      raiz: { normal: C, podre: N, mofo_branco: N, galhas: N },
      terreno: { reboleira: P, uniforme: C, isoladas: P, faixas: R },
    },
  },
  {
    id: 'mosca_branca', nome: 'Mosca-branca', cientifico: 'Bemisia tabaci', tipo: 'praga', origem: 'projeto', fontes: ['projeto'],
    resumo: 'Mosquinhas brancas que voam quando se balança a planta. As folhas ficam amareladas ou pegajosas e podem criar uma camada escura (fumagina).',
    confundeCom: ['Falta de nutrientes', 'Pulgões'],
    comoConfirmar: ['Vire a folha: ninfas e adultos ficam na face de baixo.', 'Balance a planta e veja se saem mosquinhas brancas.'],
    proximosPassos: [FOTO, 'Fotografe a face de baixo da folha de perto.', AGRONOMO],
    perfil: {
      onde: { folha_cor: T, folha_mancha: R, folha_comida: N, vagem: N, haste_raiz: N, murcha: R },
      mancha: { nenhuma: C, pardas: R, alvo: N, po_branco: N, pustula: N, angular: N },
      altura: { topo: C, meio: C, baixo: P, toda: P },
      bicho: { mosca_branca: T, nenhum: N, lagarta: R, percevejo: R },
      mofo: { nada: C, algodao: N, preto_duro: N, manchas_escuras: N },
      raiz: { normal: C, podre: N, mofo_branco: N, galhas: N },
      terreno: { reboleira: C, uniforme: P, isoladas: P, faixas: R },
    },
  },
  {
    id: 'nutriente', nome: 'Falta de nutriente', tipo: 'abiotico', origem: 'projeto', fontes: ['projeto'],
    resumo: 'Amarelecimento sem mancha definida, sem bicho e sem mofo. Nas folhas de baixo costuma ser nutriente que a planta move (como nitrogênio ou potássio); nas de cima, nutriente que ela não move (como enxofre, ferro ou manganês). Não é doença: fungicida não resolve.',
    confundeCom: ['Efeito de herbicida', 'Mosca-branca', 'Nematoides'],
    comoConfirmar: ['Compare com uma planta sadia da mesma área.', 'Peça análise de solo e de folha para saber qual nutriente falta.'],
    proximosPassos: [FOTO, 'Confira se as raízes têm nódulos (bolinhas), que fornecem nitrogênio à soja.', 'Peça ao agrônomo análise de solo e de folha.'],
    perfil: {
      onde: { folha_cor: T, folha_mancha: P, folha_comida: N, vagem: R, haste_raiz: R, murcha: R },
      mancha: { nenhuma: T, pardas: P, alvo: N, po_branco: N, pustula: N, angular: R },
      altura: { baixo: C, topo: C, toda: C, meio: P },
      bicho: { nenhum: T, lagarta: R, percevejo: R, mosca_branca: R },
      mofo: { nada: T, algodao: N, preto_duro: N, manchas_escuras: R },
      raiz: { normal: C, podre: R, mofo_branco: N, galhas: P },
      terreno: { uniforme: T, reboleira: C, faixas: P, isoladas: P },
    },
  },
  {
    id: 'fitotoxidez', nome: 'Efeito de herbicida ou outro produto', tipo: 'abiotico', origem: 'projeto', fontes: ['fitotoxicidade'],
    resumo: 'Folhas amareladas, queimadas ou deformadas, sem doença nem bicho. A Embrapa lembra que os sintomas variam com o produto e podem ser parecidos com os de outras causas. Faixas retas que seguem a máquina apontam para falha de aplicação ou deriva.',
    confundeCom: ['Falta de nutriente', 'Doenças foliares'],
    comoConfirmar: ['Veja no caderno de operações o que foi aplicado ali e quando.', 'Meça a largura da faixa e compare com a barra do pulverizador.', 'Plantas novas, que nasceram depois, estão sadias?'],
    proximosPassos: [FOTO, 'Documente o local e a data, como a Embrapa recomenda.', 'Fale com o agrônomo antes de aplicar qualquer produto: não é doença.'],
    perfil: {
      onde: { folha_cor: T, folha_mancha: C, folha_comida: R, vagem: R, haste_raiz: N, murcha: P },
      mancha: { nenhuma: C, pardas: P, angular: R, alvo: N, po_branco: N, pustula: N },
      altura: { topo: C, toda: C, meio: P, baixo: P },
      bicho: { nenhum: T, lagarta: R, percevejo: R, mosca_branca: R },
      mofo: { nada: T, algodao: N, preto_duro: N, manchas_escuras: R },
      raiz: { normal: C, podre: R, mofo_branco: N, galhas: N },
      terreno: { faixas: T, uniforme: C, reboleira: R, isoladas: P },
    },
  },
  {
    id: 'estresse', nome: 'Estresse hídrico, calor ou solo duro', tipo: 'abiotico', origem: 'projeto', fontes: ['projeto'],
    resumo: 'Planta murcha, com raiz e haste normais, sem bicho nem doença. Costuma ser falta de água, calor forte ou solo compactado que impede a raiz de aprofundar.',
    confundeCom: ['Podridões de raiz', 'Nematoides'],
    comoConfirmar: ['Veja se a planta se recupera no fim da tarde ou depois da chuva.', 'Cave um pouco e confira se o solo está muito duro ou seco.'],
    proximosPassos: [FOTO, 'Lembre o que aconteceu nos últimos dias: seca, calor, chuva forte.', AGRONOMO],
    perfil: {
      onde: { murcha: T, folha_cor: C, folha_mancha: P, vagem: P, folha_comida: N, haste_raiz: R },
      mancha: { nenhuma: T, pardas: R, alvo: N, po_branco: N, pustula: N, angular: N },
      altura: { toda: T, topo: C, meio: P, baixo: P },
      bicho: { nenhum: T, lagarta: R, percevejo: R, mosca_branca: R },
      mofo: { nada: T, algodao: N, preto_duro: N, manchas_escuras: N },
      grao: { normais: C, chochas_manchadas: C, furadas: R, manchas_vagem: R },
      raiz: { normal: T, podre: R, mofo_branco: N, galhas: N },
      terreno: { uniforme: C, reboleira: C, isoladas: C, faixas: R },
    },
  },
]
