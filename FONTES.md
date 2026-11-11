# Fontes agronômicas (pesquisa de 2026-11-07)

Status: **V** = confirmado em trecho de fonte Embrapa · **C** = conferir na edição vigente antes de entrar no app como regra.

## Percevejo-marrom (Euschistus heros)
- Nível de ação: **2 percevejos/pano de batida (1 m)** para grãos; **1/m** para sementes. **V**
- Pano de 1 m, cor clara; uso indispensável a partir de V4. **V**
- Sem dano antes das vagens; controle químico recomendado a partir do surgimento das vagens (R3). **V**
- Documento antigo (1985) usa 4/pano de 2 fileiras = 2/m. Não misturar unidades. **C**
- Fonte: Caderneta de Monitoramento Embrapa Soja (CadernetaMIP.pdf; 2ª ed.), Circular Técnica 137.

## Lagarta-falsa-medideira (Chrysodeixis includens)
- **20 lagartas > 1,5 cm por metro** (equivale a 40 por pano de 2 fileiras); lagartas menores são só registradas. **V**
- Desfolha: **30% na fase vegetativa, 15% na reprodutiva** (após as primeiras flores). **V**
- Amostragem em uma fileira de 1 m (desde 2008). **V**
- Fonte: Caderneta de Monitoramento Embrapa Soja; Agrolink (secundária).

## Ferrugem-asiática (Phakopsora pachyrhizi)
- **Não há LDE por contagem.** A decisão se baseia em: vazio sanitário, cultivar, monitoramento por coletores de esporos, calendarização e primeira aplicação na detecção. **V**
- Vazio sanitário: 60 dias em circulares antigas, 90 em circular recente; usar a norma estadual vigente (MT). **C**
- Evitar aplicações curativas repetidas (resistência a fungicidas). **V**
- Consequência para o app: o app antigo usava "LDE 10% de incidência"; isso **não tem base** nas fontes. Substituir por alerta de risco (clima) + inspeção do baixeiro.
- Fonte: Circulares Técnicas Embrapa Soja 134, 141, 188, 201, 211; programa MID-Soja.

## Mofo-branco (Sclerotinia sclerotiorum)
- Germinação dos escleródios: alta umidade do solo, **15–25 °C** e pouca luz. **V**
- Perdas médias ~21%, até 70% sem prevenção. **V**
- Manejo integrado (cultural + químico + biológico); sem resistência genética estável; limpar máquinas. **V**
- Sem parâmetro numérico de molhamento nas fontes encontradas. **C**
- Fonte: Circulares Técnicas 122 e 152; capítulo *Bioinsumos na cultura da soja*.

## Mancha-alvo (Corynespora cassiicola) × cercosporiose
- Mancha-alvo: manchas circulares castanhas, ponto central, halo amarelado, anéis tipo alvo. **V**
- Mais severa no Cerrado, em sucessão com algodão. **V**
- Cercospora kikuchii (soja): descrita como "crestamento foliar" e "mancha-púrpura"; **sintomas não confirmados nos trechos**. Ler as Circulares Técnicas 203 e 205. **C**
- Cercosporiose do milho (Cercospora zeae-maydis): referência comparativa; **não pesquisada ainda**. **C**

## Amostragem
- Ficha da caderneta: talhão, cultivar, data, fase e **10 pontos**. **V**
- Número mínimo de pontos por área, distância da bordadura e padrão de caminhamento **não foram confirmados**. Os 30 m de bordadura e a distância entre pontos serão defendidos como decisão de projeto, não como norma. **C**

## Atualização (mesma data)
- **Vazio sanitário MT 2026:** 8 jun a 6 set 2026; plantio autorizado de 7 set 2026 a 7 jan 2027 (Famato/Indea-MT, via imprensa; nº da IN conjunta não confirmado, 2025 foi IN Conjunta 002/2025 SEDEC/INDEA-MT e Portaria SDA/MAPA 1.271/2025). **V (imprensa)**, citar a norma oficial na entrega.
- **Cercospora na soja:** a Embrapa trata Septoria + Cercospora como Complexo de Doenças de Final de Ciclo (DFC); sintomas no fim do ciclo, com desfolha precoce; várias espécies além de C. kikuchii. A descrição "terço superior, pontos avermelhados" do app antigo **não foi confirmada**: tratar como a ser validada na CT 205. **C**
- **Cercosporiose do milho:** lesões retangulares, limitadas pelas nervuras, cinzentas, paralelas às nervuras; favorecida por umidade/orvalho; confundida mais com *Bipolaris maydis*. **V** (Embrapa Circ. 24; Manejo de doenças)
- **Fitotoxicidade × doença:** a Embrapa (Gazziero & Neumaier, 1985) diz que os sintomas variam por grupo químico e podem ser inespecíficos; recomenda inspecionar o local e documentar. **Não há regra Embrapa publicada para distribuição em faixa**; a regra "faixa retilínea = operacional" é raciocínio agronômico de projeto e deve ser apresentada assim.

## Pendências
1. Ler a CT 203 e a CT 205 integralmente (PDFs) para fechar o diferencial mancha-alvo × DFC.
2. Citar o número oficial da norma de vazio sanitário (Diário Oficial / Indea-MT).
3. Confirmar a edição mais recente da caderneta de monitoramento.

## Guia de diagnóstico em funil (2026-11-09)
- O **perfil de sintomas** de cada causa (`src/knowledge/diagnostico.ts`) é decisão de projeto: níveis típico/comum/possível/raro/incompatível por resposta. Nomes, locais de ataque e níveis de ação das cinco causas monitoradas seguem as fontes Embrapa citadas; **os perfis das demais (oídio, antracnose, bacterioses, DFC, podridões, nematoides, percevejo/lagartas adicionais, mosca-branca, nutrição, estresse) ainda precisam ser conferidos** contra as circulares. **C**
- A porcentagem exibida é **compatibilidade** com prior uniforme, não probabilidade calibrada.
- Pendência 4: conferir cada perfil e ajustar os níveis; ler CT 203 e 205 para separar mancha-alvo de DFC.

## Diagnóstico com contexto (2026-11-09)
Duas informações novas entram no cálculo do funil. **Ambas são decisão de projeto**, ainda a conferir contra as circulares da Embrapa:
- **Janela de fases da lavoura** (`janela` em cada causa): fora do período em que a causa costuma aparecer, a compatibilidade cai (1 fase de distância: ×0,7; até 3: ×0,4; mais longe: ×0,15), sem nunca zerar. Janelas adotadas: ferrugem-asiática V6–R6, mofo-branco R1–R5, doenças de final de ciclo R3–R7, percevejo-marrom R3–R7, lagarta-falsa-medideira V2–R6, lagartas das vagens R2–R7. As demais causas não têm janela. A fase vem do talhão escolhido.
- **Pergunta "o que aconteceu nos últimos dias?"** (chuva forte/granizo, umidade, seca e calor, produto aplicado): separa, por exemplo, bacteriose (chuva com vento e granizo), efeito de produto e estresse hídrico. Quem não tem relação conhecida com a resposta recebe nível "possível" para não ficar em desvantagem.
- **Linguagem**: o app não mostra porcentagem ao usuário. Usa "Bem provável / Provável / Ainda incerto", calculado da compatibilidade do primeiro colocado e da folga para o segundo.
- **Pendência 5**: conferir as janelas de fase e os níveis da pergunta "últimos dias" com as circulares (CT 188 para ferrugem, CT 152 para mofo-branco, CT 205 para DFC, caderneta para percevejo e lagartas).

## Diagnóstico v3 (2026-11-11)
Decisões de projeto, a calibrar com desfechos reais e a conferir com agrônomo (todas `origem: 'projeto'`):
- **Fluxo em etapas**: triagem fixa (onde, padrão no terreno, o que mudou) → até 5 perguntas do ramo → comparação por fotos → resultado.
- **Peso da pergunta** (`confiabilidade`, 0 a 1): expoente da verossimilhança; pergunta subjetiva (cor do amarelo: 0,7) pesa menos que objetiva (bicho: 0,95).
- **Foto como evidência fraca**: escolhida ×2,5; mostrada e não escolhida ×0,8; "nenhuma parece" ×0,6 nas mostradas.
- **Percentual** = compatibilidade do primeiro colocado, limitada por 40% + 7 pontos por evidência, teto 95%. Índice, **não probabilidade calibrada**; some "viva × não viva" calculado do mesmo ranking.
- **Causas reais da lavoura** modeladas: deficiências de K, Mg, Mn e N; deriva de hormonal (2,4-D); herbicida de contato; residual de herbicida; queima por calda/adubo; granizo. Fungicida não é causa isolada: o que ocorre é queima por calda/mistura/horário.
