# Plano de melhorias v4: tela inicial, registro e mapa inteligente, guia por GPS

> ## STATUS (atualizado em 11/11/2026) — LEIA PRIMEIRO
>
> **Onde paramos:** as fases **F0, F1, F2, F3, F4 e F5 estão implementadas, testadas e commitadas** (commits locais, ainda não enviados). Faltam **F6** (passe final de bugs) e **F7** (revisão com o professor).
>
> **PUSH ADIADO DE PROPÓSITO (decisão do usuário):** os commits ficam só no disco desta máquina e serão enviados ao GitHub **uma única vez, quando tudo estiver pronto** (depois da F6 e da F7). `git status -sb` mostrando `ahead 7` (ou mais) é o esperado. **Não fazer `git push` por conta própria**; esperar o usuário pedir. Até lá o site do Pages continua na versão antiga. Não apagar a pasta do projeto nem trocar de computador antes do push, pois o código só existe aqui.
>
> ### Para retomar em outra conversa
> 1. `cd ~/Documentos/Projetos/app_monitoramento/sentinela && git log --oneline | head -8` (confirme os commits abaixo).
> 2. Publicar **só no fim e só quando o usuário pedir**: `git push origin main` (pede usuário e token do GitHub; o workflow `.github/workflows/deploy.yml` roda tipos, lint, testes, build e e2e e publica no Pages). Settings → Pages → Source = **GitHub Actions**.
> 3. Verificação local: `npm run check` (tipos, lint, unitários, build) e `npx playwright test` (e2e, ~5 min).
> 4. O token do GitHub fica em `tokengithub.odt` (ignorado pelo git; **nunca versionar**). O Claude não deve abri-lo sem pedido explícito.
>
> ### O que foi feito (commit por fase)
> | Fase | Commit | Entrega |
> |---|---|---|
> | F0 | `93bfcf2` | `domain/tempo.ts` (dia local da fazenda, fuso `America/Cuiaba`, data/hora em pt-BR); corrige R1 (registro das 21:30 virava outro dia) em visitas, rodada e série; **Registro v2** (método, protocolo, fuso, posição planejada, distância, início/fim, responsável) com migração Dexie v3 que só marca `schema: 1`; entidade **Fazenda** (cadastro em Perfil); tokens tipográficos (`rotulo, apoio, corpo, subtitulo, secao, titulo`) |
> | F1 | `265dccf` | Início: saudação por hora, data por extenso, nome da fazenda em até 2 linhas, faixa de contexto, cartão de próxima ação com botão em largura total abaixo de 380 px, metadados do talhão sem quebra e sem "(demo)", aviso "Cadastre sua fazenda" |
> | F5 | `d79b341` | Guia por GPS em **tela cheia** (`ModoNavegacao`), faixa compacta (`FaixaGuia`), barra única "Cheguei · Registrar" com gaveta de ações; o guia sempre usa GPS real; "sala de aula" virou "demonstração"; corrige `Folha` (nome acessível e troca de gaveta) |
> | F2 | `342c8bc` | **Trilha de auditoria** (corrigir = nova versão que mantém a data/hora da medição; desfazer = anular; nada é apagado; análises usam só registros ativos); formulário v2 (repetições, condições do dia); cartão de confirmação com resumo, **Desfazer 30 s**, Ver ficha, Outro achado aqui; a Coleta não pula mais de ponto sozinha (R4); **Ficha do ponto** (método, amostra, condições, coletor, responsável, posição, fotos, versões, rastro); `domain/ficha.ts` |
> | F3 | `08fcc0c` | Exportação **CSV** (Excel pt-BR: BOM, `;`, vírgula decimal) e **GeoJSON** com todos os campos e todas as versões; **Relatório do talhão** em `/talhoes/:id/relatorio`, para imprimir ou salvar em PDF; `domain/estatistica.ts` |
> | F4 | `302bde0` | Mapa v2: **calor honesto** (só com 3+ pontos, só dentro do raio de 1,5× a distância média entre vizinhos, resto hachurado como "sem dado"), escala fixa entre visitas, legenda com números, camadas Calor/Estado/Mudança, valores nos pontos, painel de análise (média, mediana, máximo, desvio, índice de Moran, tendência, pontos por nível, tabela ponto × visita, contas explicadas), qualidade dos dados; `domain/mapa.ts` |
>
> ### Verificação no último ponto
> - Unitários: **364 passam** (21 arquivos). Build ok. Lint limpo.
> - E2E: 180 passavam ao fim da F3; na F4 os **18 testes novos (`e2e/mapa.spec.ts`) passam**, mas a **suíte e2e completa da F4 não chegou a ser confirmada** quando esta nota foi escrita. **Primeira coisa ao retomar: rodar `npx playwright test` inteiro.**
> - Testes novos de e2e: `inicio`, `registro`, `exportar`, `mapa`; `guia` e `fluxos` foram ajustados ao novo comportamento.
>
> ### Decisões tomadas (as recomendações da seção 6 foram seguidas)
> Fuso fixo `America/Cuiaba`; modo "Demonstração" explícito; uma fazenda por aparelho; exportação em PDF + CSV + GeoJSON.
>
> ### Desvios do plano original (para saber)
> - **PDF**: é gerado pelo diálogo de impressão do navegador ("Salvar como PDF"), com CSS de impressão. Não há biblioteca de PDF.
> - **Guia (F5)**: não há "gaveta de detalhes". Tempo a pé e direção ficam na faixa; sinal fraco e rota de carro (acima de 400 m) aparecem só quando relevantes.
> - **Registro v2**: `parteDaPlanta`, método, protocolo, fuso, posição planejada, distância e início/fim são preenchidos automaticamente; repetições e condições vêm do formulário. **Fotos com data e coordenada por foto não foram feitas.** `revisadoPor` existe no modelo, mas **ainda não há tela para o agrônomo revisar/confirmar**.
> - **Vários achados de uma vez**: resolvido com "Outro achado aqui" (mantém o ponto), não com uma lista de alvos num só formulário.
> - **I2/I7** estão feitos; **I5** feito (sem "(demo)"). A seed antiga com "(demo)" é limpa só na exibição.
> - **Moran I**: vizinhança binária com raio de 1,5× a distância média; em grade de 100 m os vizinhos diagonais entram (documentado em teste).
> - Alguns testes de e2e usam `test.slow()` (mapa renderiza por software e a gravação demora sob carga paralela). Já houve falha intermitente de axe em `/talhoes/T-01` por animação; foi resolvida não renderizando o cartão de exportar até carregar.
>
> ### O que falta
> - **F6 — passe final** (ver lista da seção 2.2 C): ensaios de borda ainda não cobertos por teste: app fechado no meio do registro (rascunho), falha ao gravar com o aparelho cheio, talhão muito alongado, amostra em cima do vértice, rotação de tela, teclado aberto sobre o formulário, modo offline nas telas novas. Capturas automáticas das telas-chave em 360×640, 390×844, 412×915, 768 e 1280 (hoje só Início e Guia têm medição por tamanho). Revisar dados de demonstração para ficarem coerentes com o Registro v2.
> - **F7 — revisão com o professor agrônomo** (precisa do usuário): confirmar os campos do registro, ver se há ficha/protocolo próprio, e decidir se quer tela de **revisão pelo agrônomo** (`revisadoPor`) e **fotos com coordenada**.
> - **Pendências menores**: `FormPendencia`/"Não sei o que é" ainda avança sozinho de ponto (só o registro e o "sem ocorrência" ganharam confirmação); o relatório não traz ainda foco/tendência/qualidade do mapa v2; o Perfil mostra o toggle "Usar GPS real" com o texto novo, mas o padrão continua `false`.
>

Escopo pedido: (1) tela inicial; (2) registro dos achados e mapa inteligente, para um professor agrônomo avaliar; (3) o caminho até o ponto com GPS.

## 0. Como investiguei

- Li o código das três áreas (`Painel`, `Campo`, `FormRegistro`, `Resultados`, `FaixaGuia`, `Mapa` e os módulos `analise`, `resultados`, `registro`, `validation`, `navegacao`).
- Abri o app com a demonstração em celular de **412×915** e de **360×640** (tamanho comum de aparelho de entrada) e tirei capturas.
- Executei o fluxo de registrar um achado e li o que ficou gravado no banco do aparelho.
- Rodei sondas de código para confirmar suspeitas (resultados abaixo).

Cada achado traz a etiqueta de como foi comprovado: **[tela]** visto em captura, **[execução]** reproduzido rodando, **[código]** lido no código, **[hipótese]** ainda a confirmar.

---

## 1. Tela inicial

### Achados
| # | Achado | Gravidade | Prova |
|---|---|---|---|
| I1 | A saudação mostra só **"Olá"** em texto minúsculo quando não há nome, solta acima do título. | média | [tela] |
| I2 | O nome da fazenda ("Fazenda Santa Aurora") é **texto fixo no código** (`Painel.tsx`, `Diagnostico.tsx`, mensagens). Não dá para cadastrar a fazenda real. | alta | [código] |
| I3 | Em 360 px o nome vira **"Fazenda Santa A…"** (truncado). O título não quebra em duas linhas. | alta | [tela] |
| I4 | O cartão "Próxima ação" fica apertado: o título quebra em 3 linhas e o botão pesa mais que o texto. | média | [tela] |
| I5 | Cartões de talhão: "84 ha · R3 · Cultivar precoce (demo)" quebra no meio; o "(demo)" aparece em dado real. | baixa | [tela] |
| I6 | A tela não diz **data, safra, município, responsável técnico, área total**. Falta contexto profissional. | média | [tela] |
| I7 | Não há escala tipográfica definida: tamanhos soltos (`text-sm`, `text-2xl`, `text-base`) sem regra de hierarquia. | média | [código] |

### O que fazer
1. **Entidade Fazenda** (nome, proprietário, município/UF, safra, responsável técnico, fuso). Cadastro no primeiro uso e em Perfil. Todos os textos fixos passam a usá-la.
2. **Cabeçalho novo:**
   - Linha 1: saudação por hora ("Bom dia, Saulo") e a data por extenso. Sem nome, só a data.
   - Linha 2: nome da fazenda em até **2 linhas** (`line-clamp-2`), com tamanho fluido (`clamp`), nunca truncado em uma linha.
   - Linha 3: faixa de contexto ("Lucas do Rio Verde · MT · Safra 25/26 · 4 talhões · 224 ha").
3. **Escala tipográfica com tokens** (título, subtítulo, corpo, apoio, rótulo) aplicada ao app todo.
4. **Cartão de próxima ação responsivo:** abaixo de 380 px o botão vai para baixo do texto, em largura total.
5. Remover "(demo)" do rótulo de cultivar e padronizar a linha de metadados do talhão.

**Aceite:** nenhum texto truncado nem quebrado de forma feia em 360, 390, 412, 768 e 1280 px, comprovado por captura automática. Nome de fazenda de 60 caracteres cabe em 2 linhas.

---

## 2. Registro dos achados e mapa inteligente

### 2.1 Bugs e lacunas

| # | Achado | Gravidade | Prova |
|---|---|---|---|
| R1 | **Dia da visita calculado em UTC.** Um registro das 21:30 (Cuiabá, UTC-4) cai no **dia seguinte**: uma única visita aparece como duas na linha do tempo. Afeta também a rodada de 7 dias, a série temporal e a "última visita" do Início. A função correta (`diaEmCuiaba`) já existe, mas não é usada nessas contas. | **alta** | [execução] com 21:30 local deu `["2026-11-11","2026-11-12"]` |
| R2 | **O registro não mostra data e hora.** O banco guarda `criadoEm` em UTC, mas nenhuma tela exibe a hora. As listas mostram só "dd/mm", sem ano. | **alta** | [execução] [tela] |
| R3 | **O registro não guarda o método.** O método de coleta aparece como texto informativo no formulário, mas não vai para o registro. Também faltam: número de repetições (batidas), área amostrada, parte da planta, condições do dia (tempo, vento, umidade), horário de início e fim. | **alta** | [execução] (o registro salvo tem 18 campos e nenhum de método) |
| R4 | **Depois de salvar, a tela pula para o próximo ponto** e só há o aviso "Registro salvo em P01". O que foi registrado fica numa lista abaixo da dobra, atrás do cartão fixo. O usuário acha que não registrou. | **alta** | [tela] |
| R5 | **Três conceitos misturados:** registro (medida), achado pendente (não identificado) e diagnóstico (resultado). Cada um tem uma tela diferente e não existe **ficha única do ponto**. | alta | [código] |
| R6 | **Um alvo por vez.** Um ponto com dois achados exige abrir o formulário duas vezes. "Sem ocorrência" grava 5 registros de zero (um por alvo) sem mostrar isso. | média | [código] |
| R7 | **O mapa de calor mente com poucas amostras.** Com **1 amostra, os 3.584 quadradinhos do talhão ficam com o mesmo valor** (o talhão inteiro pintado). Com 2 amostras (8 e 0), 87% do talhão aparece acima de 1. Não há raio de influência nem indicação de confiança. | **alta** | [execução] |
| R8 | **A legenda do calor não tem números**: só "menos / mais". Falta a unidade, o valor máximo e o nível de ação. A escala muda a cada visita (o teto muda), então não dá para comparar duas visitas. | alta | [tela] [código] |
| R9 | Ao escolher um alvo, a ficha do ponto **esconde os registros dos outros alvos** e as pendências; o estado do ponto ignora pendências nesse filtro. | média | [código] |
| R10 | A linha "Posição por GPS / simulada" da ficha olha só o **primeiro** registro. | baixa | [código] |
| R11 | A legenda do mapa fica coberta pelo cartão fixo e pelo aviso de "registro salvo". | média | [tela] |
| R12 | A ajuda do estádio é fixa ("R3 = início de formação de vagens") mesmo com o talhão em V5. "Posição simulada (sala de aula)" é jargão. | baixa | [tela] |
| R13 | A "Leitura do mapa" é só um texto curto. Não há análise visual de verdade: focos, tendência, comparação entre visitas, distribuição. | alta | [tela] |

### 2.2 O que fazer

**A. Fundação de dados (antes de tudo)**
1. **Fuso e datas:** uma função única `diaLocal(iso, fuso)` com o fuso da fazenda (padrão `America/Cuiaba`), usada em visitas, rodada, série e Início. Exibir sempre data completa e hora ("11/11/2026 13:24").
2. **Registro v2.** Novos campos, com migração dos registros antigos (marcados "método não informado"):
   - `metodo` (texto do protocolo, vindo do alvo) e `protocoloVersao`;
   - `repeticoes` e `areaAmostrada` ("5 batidas de 1 m"), `parteDaPlanta`;
   - `inicioEm` e `fimEm` (a duração da amostragem), `fusoHorario`;
   - `condicoes` (tempo, vento, umidade da folha, hora do dia);
   - `posicaoReal` × `posicaoPlanejada`, `distanciaDoPontoM`, `precisaoM`;
   - `fotos` com data e coordenada de cada uma;
   - `responsavel` e `revisadoPor` (quando o agrônomo confirma).
3. **Ficha completa do ponto:** uma tela só com o histórico do ponto (registros, pendências, diagnósticos, fotos), em ordem de data, com hora, método, responsável, GPS e nível de decisão.
4. **Confirmação depois de salvar:** cartão de resumo ("Percevejo-marrom · 4 por metro · 11/11 13:24 · acima do nível de ação") com **Ver ficha** e **Desfazer** (30 s). Ficar no mesmo ponto até o usuário seguir.
5. **Vários achados de uma vez** no mesmo ponto (lista de alvos), e "sem ocorrência" mostrando o que foi gravado.
6. **Trilha de auditoria:** registro só se corrige gerando nova versão (nada é apagado), com autor e data.
7. **Exportação** para avaliação: ficha por ponto e relatório do talhão em **PDF**, mais **CSV** e **GeoJSON** com todos os campos.

**B. Mapa inteligente v2**
1. **Calor honesto:** raio de influência (por exemplo, 1,5× a distância média entre pontos); fora dele a célula fica vazia ou hachurada ("sem dado"). Abaixo de 3 amostras, não desenhar calor, só os pontos.
2. **Legenda com números:** escala em unidade real (perc./m, % severidade), marca do nível de ação e valor máximo. **Escala fixa entre visitas** para permitir comparação.
3. **Camadas:** estado do ponto · calor · confiança/cobertura · **diferença entre visitas** (piorou / melhorou / igual) · rótulo de valor em cada ponto.
4. **Análises automáticas** em painel:
   - estatística descritiva (média, mediana, máximo, % acima do nível de ação);
   - **focos**: detectar agrupamentos e dizer se a concentração é real ou aleatória (índice de autocorrelação espacial, com a conta e o limite explicados);
   - **tendência** entre visitas (subindo, estável, caindo);
   - distribuição dos pontos por nível (barras);
   - tabela ponto × visita (visão rápida de evolução).
5. **Sinais de qualidade de dados:** pontos sem registro, GPS impreciso, ponto registrado longe do planejado, valores atípicos, visita incompleta.
6. **Relatório do talhão** (PDF) com mapa, análises, tabela, fotos, método, fontes e data/hora de geração.

**C. Caça a bugs (obrigatória nesta frente)**
Lista de ensaios, cada um vira teste automatizado:
- fuso: registros às 23:59 e 00:01; mudança de horário do aparelho; relógio adiantado;
- mesmo ponto registrado duas vezes no dia; duas visitas no mesmo dia; ponto sem GPS;
- talhão com 0, 1, 2 e 3 amostras; amostra em cima do vértice do talhão; talhão muito alongado;
- fotos grandes; falha ao gravar no banco (aparelho cheio); app fechado no meio do registro (rascunho);
- filtros de alvo combinados com pendências; reprodução da linha do tempo com 1 visita;
- tema escuro; rotação de tela; teclado aberto sobre o formulário; modo offline.

**Aceite:** nenhum registro novo sai sem data/hora local, método e responsável; a ficha do ponto mostra todos os campos; o calor não é desenhado com menos de 3 amostras; duas visitas no mesmo dia local nunca aparecem separadas; exportação abre em PDF/CSV/GeoJSON com os mesmos números da tela.

---

## 3. Guia até o ponto por GPS

### Achados
| # | Achado | Gravidade | Prova |
|---|---|---|---|
| G1 | Em **360×640** o mapa quase desaparece: o cabeçalho, o seletor e a barra de progresso ocupam o topo, a faixa do guia (~170 px) e o cartão fixo de baixo (~190 px) cobrem o resto. | **alta** | [tela] |
| G2 | A distância quebra em duas linhas ("760 / m") e o rótulo "GPS ±8 m" também. | alta | [tela] |
| G3 | **Informação repetida:** a faixa mostra "Ponto 1 · nordeste · ~9 min" e o cartão de baixo mostra "Ponto 1 de 10" e o estado. | média | [tela] |
| G4 | A linha "Está longe? Rota de carro: Google Maps / Waze" ocupa uma linha inteira da faixa, mesmo quando o ponto está a 760 m. | média | [tela] |
| G5 | A legenda e a barra de progresso ficam escondidas ou irrelevantes durante a navegação. | baixa | [tela] |
| G6 | **Dois modos de GPS confusos:** durante o guia o GPS liga, mas o registro continua usando a posição planejada se "GPS real" estiver desligado em Perfil. Aparece "Sala de aula: registros usam a posição planejada" no meio da tela. | alta | [código] [tela] |
| G7 | O botão de zoom e o de camadas colidem com a faixa do guia (a faixa precisa de `right: 3.75rem`). | baixa | [tela] |
| G8 | A tela inteira rola; o mapa usa `calc(100dvh − 31rem)`, que depende de medidas fixas e quebra em telas baixas. | média | [código] |

### O que fazer
1. **Modo Navegação em tela cheia:** ao tocar em "Ir até o ponto", some o cabeçalho, o seletor, a barra de progresso e a legenda. O mapa ocupa a tela toda (≥ 60% da altura útil).
2. **Faixa compacta de uma linha:** seta de direção + **distância grande sem quebra** (`tabular-nums`, `whitespace-nowrap`) + "Ponto 1". Detalhes (precisão, tempo a pé, rota de carro) em uma gaveta que abre ao toque.
3. **Uma ação por vez:** botão fixo "Cheguei · Registrar" (ativo quando perto), em vez de o cartão grande de 3 botões. Os 3 botões completos só aparecem **ao chegar** ou ao puxar a gaveta.
4. **Unificar o GPS:** um só controle. Com permissão concedida, **GPS real é o padrão**. O modo simulado vira "Demonstração", marcado de forma clara e explícita, nunca misturado com o guia.
5. **Layout por altura disponível**, sem constantes fixas: `dvh` + variáveis de safe-area; testes em 360×640, 390×844, 412×915 e paisagem.
6. **Rota de carro** só como botão pequeno quando a distância passar de 400 m.
7. Opcional depois: avançar para o próximo ponto sozinho ao chegar e registrar; mapa offline da área do talhão.

**Aceite:** em 360×640 a área do mapa tem ao menos 60% da altura; nenhum texto quebra de forma feia; alvos de toque ≥ 44 px; ao chegar, 1 toque abre o registro.

---

## 4. Ordem de execução

| Fase | Entrega | Depende de | Tamanho |
|---|---|---|---|
| **F0** | Fuso único (`diaLocal`), escala tipográfica, entidade Fazenda, Registro v2 com migração | — | G |
| **F1** | Tela inicial nova | F0 | M |
| **F2** | Registro completo: formulário v2, confirmação pós-salvar, ficha do ponto, vários achados, trilha de auditoria | F0 | G |
| **F3** | Exportação (PDF/CSV/GeoJSON) e relatório do talhão | F2 | M |
| **F4** | Mapa inteligente v2: calor honesto, legenda real, camadas, análises, qualidade de dados | F0, F2 | G |
| **F5** | Guia por GPS em tela cheia | F0 | M |
| **F6** | Caça a bugs + testes visuais em 4 tamanhos + acessibilidade + dados de demonstração coerentes | todas | M |
| **F7** | Revisão com o professor agrônomo e ajuste dos campos | F3 | P |

Sugestão: começar por **F0**, porque o fuso e o registro completo mexem nos dados e quase tudo depende deles. Depois F1 e F5 (visíveis e independentes) e, em seguida, a frente mais pesada (F2 a F4).

## 5. Como vamos provar que melhorou
- **Captura automática** das telas-chave em 360×640, 390×844, 412×915, 768 e 1280, comparada a cada alteração.
- **Testes de fuso e de qualidade de dados** (os ensaios da seção 2.2 C).
- **Teste do mapa de calor** (0, 1, 2 e 3 amostras).
- **E2E do registro:** salvar → ver a ficha com data, hora, método e responsável → exportar.
- **Acessibilidade (WCAG 2.1 AA)** em todas as telas novas.

## 6. Decisões que preciso de você
1. **Campos do registro:** a lista acima é a minha proposta (Registro v2). O professor tem uma **ficha ou protocolo** que quer ver? Se tiver, me passe e eu ajusto os campos a ela.
2. **Exportação:** PDF + CSV + GeoJSON basta, ou há outro formato esperado?
3. **Fuso:** fixar `America/Cuiaba` ou seguir o fuso do aparelho? (Recomendo fixar o da fazenda.)
4. **Modo "sala de aula":** manter como "Demonstração" explícita ou remover do fluxo principal? (Recomendo manter só como demonstração.)
5. **Uma ou várias fazendas** por aparelho? (Recomendo uma por enquanto.)

## 7. Riscos
- **Migração de dados:** registros antigos não têm método nem fuso. Mitigação: campos opcionais com marca "não informado", sem inventar valores.
- **Escopo do mapa inteligente:** as análises espaciais precisam ser explicáveis. Cada indicador mostra a conta e o limite, para o professor conseguir auditar.
- **Tela cheia de navegação** muda um fluxo que já funciona: manter os testes de guia existentes e acrescentar os de layout.
