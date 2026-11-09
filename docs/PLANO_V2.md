# Sentinela 2.0 — Plano de reestruturação

Objetivo: um app que qualquer pessoa entenda, com **uma coisa por aba**, fluxo guiado do talhão ao diagnóstico e um mapa que conta a história da lavoura.

---

## 1. Diagnóstico do app atual

| Problema | Causa | Efeito |
|---|---|---|
| Navegação confusa | 6 abas misturando tarefas (Início, Talhões, Campo, Alertas, Diagnóstico, Mais) sem ordem de uso | Usuário não sabe o que fazer primeiro |
| Muito texto e termo técnico | Telas escritas por quem conhece o Projeto Técnico (LDE, bordadura, estádio) | Leigo trava |
| Diagnóstico solto | Está numa aba separada, sem ligação com o ponto de coleta | O achado e o diagnóstico não se encontram |
| Sem imagens no diagnóstico | Não existe acervo | Usuário não consegue comparar com o que vê |
| Mapa fraco | Leaflet, sem camadas de resultado | Dá para desenhar, mas não para entender a lavoura |
| Conhecimento misturado | "Como coletar em cada alvo" dentro de Talhões | Consulta fora de lugar |
| Herança do app de referência | Exemplos "Levi", textos e fluxo parecidos | Identidade pouco própria |

---

## 2. Princípios de design

1. **Uma tarefa por tela.** Cada aba responde a uma pergunta: onde? o que coletei? o que é? como está a lavoura? onde leio mais?
2. **Fluxo guiado, não menu.** O app sempre mostra a *próxima ação* (ex.: "Coletar no ponto 3 de 10").
3. **Mapa como centro.** Todo mapa usa a mesma base e mostra o talhão por baixo.
4. **Pouco texto na frente, profundidade atrás.** Máximo de duas linhas por cartão; o resto vai para "Saiba mais" (Biblioteca).
5. **Linguagem do campo.** "Lagarta", "mancha na folha", não "desfolha por lepidóptero". Termo técnico entra entre parênteses.
6. **Honestidade científica.** O app indica *compatibilidade* e nunca recomenda produto. Parâmetro sem fonte é marcado como decisão de projeto (regra já existente em `FONTES.md`).
7. **Funciona no campo.** Polegar, luz forte, luva, internet ruim.

---

## 3. Nova arquitetura de informação

Barra inferior no celular e lateral no desktop, **5 abas**:

| Aba | Pergunta que responde | Conteúdo |
|---|---|---|
| **Início** | O que faço agora? | Próxima ação, resumo da safra, avisos (clima, ordens de checagem) |
| **Talhões** | Onde? | Desenhar talhão, dados, plano de pontos, **Mapa inteligente** como visão "Resultados" do talhão |
| **Coleta** | O que encontrei? | Percurso ponto a ponto, registro rápido, fotos |
| **Diagnóstico** | O que é isso? | Guia interativo de pragas e doenças |
| **Biblioteca** | Quero ler mais | Busca, categorias e artigos completos |

- **Perfil/Configurações** vira ícone no topo (nome, tema, sobre). A aba "Mais" some.
- **Alertas** (clima, drone, IoT) deixa de ser aba: aparece como avisos no Início e como "ponto a checar" na Coleta.
- Abas internas do talhão: **Plano · Resultados · Histórico**.

> Dúvida sobre o Mapa inteligente: a alternativa é uma 6ª aba própria. Recomendo mantê-lo dentro de Talhões, para a barra do celular não ficar cheia. Decisão no item 11.

---

## 4. Jornada principal

```
1 Talhão ─► 2 Plano ─► 3 Coleta ─► 4 Diagnóstico ─► 5 Resultados ─► 6 Decisão
desenha     gera       registra    identifica       mapa
no mapa     pontos     por ponto   o problema       inteligente    e próxima visita
```

Em cada etapa o botão principal leva à seguinte. Exemplo: ao concluir o plano, "Começar coleta"; ao salvar o último ponto, "Ver resultados".

### Coleta ponto a ponto
- Lista e mapa do percurso, com o ponto atual destacado e **distância até ele** (GPS real ou simulado).
- Cada ponto tem **3 estados de resultado**:
  - ✅ **Sem ocorrência**: um toque.
  - 🔎 **Com achado**: contagem rápida por alvo (botões + e −), nota e foto.
  - ❓ **Diagnóstico probabilístico**: "encontrei algo e não sei o que é". O app guarda fotos e anotações e deixa o ponto **pendente de diagnóstico**.
- Registro por **toque, não formulário**: contador grande, chips de alvo, câmera em um toque e observação curta.

---

## 5. Ligação ponto ↔ diagnóstico

Os dois caminhos que você descreveu ficam ligados nos dois sentidos.

**A. Da Coleta para o Diagnóstico**
1. No ponto, o usuário marca "Diagnóstico probabilístico". O ponto fica com marcador ❓ no mapa.
2. Em **Diagnóstico**, uma faixa no topo lista "Pontos aguardando diagnóstico (3)". Também dá para tocar no marcador ❓ no mapa.
3. O funil abre já vinculado ao ponto, com as fotos dele disponíveis.
4. Ao terminar, "Anexar ao ponto 4": o marcador muda para o ícone do diagnóstico (cor por categoria) e o ponto passa a mostrar "Provável: ferrugem-asiática · 78% compatível".

**B. Do Diagnóstico para a Coleta**
- Quem abre o Diagnóstico direto, sem ponto, pode terminar e escolher "Anexar a um ponto" (seletor no mapa) ou "Só consultar".

### Modelo de dados (migração do Dexie para v2)
```
Achado        { id, pontoId, talhaoId, tipo: 'sem_ocorrencia'|'contagem'|'pendente_diagnostico',
                contagens?, fotos[], nota, criadoEm, amostrador }
Diagnostico   { id, achadoId?, pontoId?, respostas[], candidatos[{alvoId, compat}],
                escolhido?, confirmadoPor?: 'usuario'|'agronomo', fotos[], criadoEm }
```
Os registros atuais são migrados para `Achado`. Os testes de migração entram na Fase 3.

---

## 6. Guia de diagnóstico (funil interativo)

Hoje é uma árvore fixa. Passa a ser um **funil por evidências**:

1. **Escolha do tipo:** praga (inseto, ácaro, lagarta...), doença ou "não sei" (o funil decide).
2. **Perguntas visuais, uma por vez**, com cartões de imagem: "Onde está o sintoma? (folha nova / folha velha / vagem / haste / raiz)", "Como é a mancha?", "O que o inseto tem?".
3. **Cada resposta reordena os candidatos.** A próxima pergunta é a que mais separa os candidatos que sobraram (ganho de informação), por isso o funil é curto.
4. **Barra de candidatos ao vivo** no topo ("3 possibilidades restantes").
5. **Resultado:** os 3 mais compatíveis com **% de compatibilidade**, foto de referência, "como confirmar" e "pode ser confundido com...". Ação: anexar ao ponto, salvar com fotos, abrir artigo na Biblioteca.
6. Voltar uma pergunta a qualquer momento; "não sei responder" é uma opção válida.

**Sobre a porcentagem:** ela é uma estimativa de compatibilidade entre sintomas e o perfil de cada alvo, não uma probabilidade estatística calibrada. O app mostra o rótulo "compatibilidade" e um aviso curto de que é uma estimativa. Isso protege na banca.

**Cobertura inicial (soja), sujeita a revisão com fontes Embrapa:**
- Pragas: percevejo-marrom, percevejo-verde, percevejo-barriga-verde, lagarta-da-soja, falsa-medideira, *Helicoverpa*, mosca-branca, ácaros, tripes.
- Doenças: ferrugem-asiática, mancha-alvo, mofo-branco, oídio, antracnose, doenças de final de ciclo (DFC), crestamento e pústula bacterianos, podridões de raiz e haste, nematoides.
- Abióticos (parecem doença): fitotoxidez por herbicida, deficiência nutricional, estresse hídrico.

**Estrutura dos dados** (`src/knowledge/diagnostico/`): um arquivo por alvo com sintomas, parte da planta, estádio provável, confundidores, imagens e fonte. Um validador de testes garante: toda característica tem imagem, toda entrada tem fonte e os pesos fecham.

**Imagens (decisão tomada):** você pesquisa e coloca em `public/imagens/diagnostico/`, nomeadas com o nome da praga ou doença. Convenção para o app achar sozinho:
- Nome em minúsculas, sem acento, com hífen: `ferrugem-asiatica.jpg`, `percevejo-marrom.jpg`.
- Mais de uma foto do mesmo alvo: `ferrugem-asiatica-2.jpg`, `ferrugem-asiatica-3.jpg`.
- Um arquivo opcional `creditos.csv` (arquivo, autor, fonte) para dar o crédito na tela.
- Um teste do projeto avisa quando algum alvo estiver sem foto.

Tamanho recomendado: lado maior de até 1200 px, em JPG ou WebP; o app reduz o resto.

---

## 7. Mapa inteligente (MapLibre)

**Uma base única** `<MapaBase>` em MapLibre GL JS, usada por Talhões, Coleta, Diagnóstico e Resultados. Substitui o Leaflet.

- **Fundo:** satélite da região do talhão (raster tiles) com opção "Mapa". O app enquadra o talhão automaticamente.
- **Desenho:** contorno com vértices arrastáveis e área em hectares ao vivo.
- **Pontos com estado visual:**
  - ⚪ a coletar · 🟢 sem ocorrência · 🟡 achado leve · 🟠 achado acima do alerta · 🔴 acima do nível de ação · ❓ aguardando diagnóstico · ícone do alvo quando diagnosticado.
- **Camadas ligáveis:** contorno, percurso, pontos, **mapa de calor de incidência** (interpolação entre pontos, por alvo), ordens de checagem, clima.
- **Filtros:** por alvo (praga ou doença), por visita/data.
- **Linha do tempo:** controle deslizante que mostra a evolução entre visitas.
- **Toque no ponto:** cartão com fotos, contagens, diagnóstico, data, quem coletou, e botões "Ver diagnóstico" e "Abrir artigo".
- **Resumo do talhão sobre o mapa:** % de pontos com ocorrência e alvo dominante, sem indicar produto.

**Pontos de atenção:**
- Satélite exige internet e tem termos de uso por provedor. O app precisa de fallback (mapa simples do OSM) e de cache dos tiles da área do talhão para uso offline.
- MapLibre pesa mais que Leaflet; carrega só nas telas com mapa (lazy), para manter o Lighthouse alto.

---

## 8. Biblioteca (consulta separada)

- Aba própria com **busca** (nome, sintoma, sinônimo) e categorias: Pragas · Doenças · Monitoramento · Estádios da soja · Clima e manejo · Glossário.
- Lista de cartões com imagem e resumo de uma linha.
- Toque abre a **página do assunto** em rota própria (`/biblioteca/ferrugem-asiatica`) com o texto integral, imagens, fontes, "como identificar", "onde ocorre", "quando monitorar", "pode ser confundido com".
- Links cruzados: do resultado do diagnóstico para o artigo, e do artigo para "Diagnosticar isto".
- Conteúdo em Markdown com cabeçalho de metadados, funcionando offline.
- O texto "Como coletar em cada alvo" sai de Talhões e vira artigos aqui.

---

## 9. Interface e experiência (padrão sênior)

**Design system novo**
- Tipografia variável (ex.: Inter ou Geist), escala de 8 níveis, números tabulares nos dados.
- Tokens de cor com paleta agro (verde-folha, terra, âmbar de alerta), claro e escuro, contraste AA.
- Grade de 4/8 px, raios e sombras consistentes, ícones de um único conjunto (Lucide).
- Componentes: cartão, chip, bottom sheet, stepper, seletor de imagem, contador, esqueleto de carregamento, estado vazio.

**Interação**
- **Bottom sheet sobre o mapa** (como apps de mapas): detalhes sobem sem tirar o usuário do mapa.
- Movimento curto (150 a 250 ms) e desligado com `prefers-reduced-motion`.
- Botão principal sempre na zona do polegar; alvos de toque de 48 px ou mais.
- **Modo campo:** alto contraste, botões maiores, tela sem apagar durante a coleta.
- Onboarding de 3 telas e **tour guiado** opcional (bom para apresentar à banca).
- Feedback visível em toda ação (o bug do "nada acontece" não pode se repetir): toasts acima de qualquer folha e estados de erro claros.

**Texto**
- Revisão completa de microcopy em linguagem simples.
- Substituir "Levi" por exemplos neutros ou nenhum placeholder com nome de pessoa.
- Nível de detalhe: modo **Simples** (padrão) e **Técnico** (mostra LDE, parâmetros e fontes).

---

## 10. Ideias que você talvez não tenha considerado

Em ordem do que eu mais recomendo:

1. **Navegação até o ponto**: seta e distância até o próximo ponto. Evita o usuário se perder no talhão e dá valor real ao GPS.
2. **Próxima visita sugerida**: lembrete local com prazo (ex.: 3 a 7 dias) baseado no resultado.
3. **Linha do tempo do talhão** com todas as visitas e a evolução de cada alvo.
4. **Dicas de foto** (enquadramento, luz, escala) e **marca com data e ponto** na imagem salva.
5. **Modo apresentação**: dados de demonstração com um clique, para a banca.

---

## 11. Decisões que preciso de você

| # | Decisão | Recomendação |
|---|---|---|
| 1 | ~~Origem das imagens~~ | **Decidido:** você pesquisa e anexa na pasta, nomeadas pelo alvo |
| 2 | **Mapa inteligente**: monta-se ao vivo e vira o mapa final ao concluir | Dentro de Talhões, como "Resultados" |
| 3 | **Satélite**: qual provedor de tiles | Esri World Imagery com fallback OSM; conferir termos de uso para trabalho acadêmico |
| 4 | **Porcentagem do diagnóstico**: rótulo | "Compatibilidade", nunca "probabilidade" |
| 5 | **Aba Alertas**: mantida ou absorvida | Absorvida pelo Início e pela Coleta |
| 6 | ~~Relatório, backup, confirmação do agrônomo~~ | **Fora do escopo** (decisão sua) |

---

## 12. Fases de implementação

Estimativa relativa: P (pequena), M (média), G (grande).

| Fase | Entrega | Tamanho | Pronto quando |
|---|---|---|---|
| **0. Alinhar** | Decisões do item 11, wireframes de baixa fidelidade das 5 abas, lista final de alvos | P | Você aprova o fluxo no papel |
| **1. Fundação** | Design system novo, nova navegação de 5 abas, `<MapaBase>` em MapLibre no lugar do Leaflet, rotas | G | App abre com a nova casca, mapa com satélite, sem regressão |
| **2. Talhões e plano** | Desenhar talhão, dados em 3 campos, plano gerado, sheet sobre o mapa, abas Plano/Resultados/Histórico (vazia) | M | Fluxo "desenha, salva, vê pontos" sem erro em celular e desktop |
| **3. Coleta guiada** | Modelo `Achado`, migração do Dexie, tela de percurso, registro por toque, 3 estados, marcadores por estado | G | Coleta completa de um talhão em menos de 2 minutos por ponto |
| **4. Guia de diagnóstico** | Motor por evidências, conteúdo e imagens dos alvos, cartões visuais, tela de resultado com compatibilidade | G | Funil chega a resultado em até 6 perguntas; validador de dados passa |
| **5. Ligação ponto ↔ diagnóstico** | Faixa de pendentes, anexar ao ponto, marcador atualizado, abrir pelo mapa | M | Fluxo A e B do item 5 cobertos por testes E2E |
| **6. Mapa inteligente** | Camadas, mapa de calor, filtros, linha do tempo, cartão do ponto | G | Talhão demo mostra a evolução entre duas visitas |
| **7. Biblioteca** | Busca, categorias, páginas de artigo, links cruzados, conteúdo migrado | M | Qualquer artigo abre completo e offline |
| **8. Início e extras** | Próxima ação, avisos, navegação até o ponto, próxima visita sugerida | M | Itens 1 e 2 do item 10 funcionando |
| **9. Polimento e QA** | Revisão de textos, acessibilidade, desempenho, E2E reescritos, Lighthouse | M | Lighthouse ≥ 95, axe sem erros graves, testes verdes |
| **10. Entrega** | README, rastreabilidade (PDF → app), pitch, Projeto Técnico de 8 a 12 páginas | M | Documentos refletem o app novo |

**Regras durante a evolução**
- A camada `src/domain` (regra pura e testada) é preservada; o que muda é a interface e os modelos novos.
- Todo conteúdo novo entra com fonte; o que não tiver vira "decisão de projeto".
- Cada fase termina com `npm run check` verde e testes E2E dos fluxos novos.
- Testar sempre também pelo celular, no IP da rede **e** via HTTPS (câmera e GPS só funcionam em contexto seguro).

---

## 13. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Falta de imagens boas | Guia perde valor | Você reunir as fotos antes da Fase 4; o teste lista as que faltam |
| Termos de uso dos tiles de satélite | Bloqueio ou aviso legal | Conferir antes da Fase 1; manter fallback OSM |
| Compatibilidade lida como diagnóstico definitivo | Crítica da banca | Rótulo "compatibilidade" e aviso curto |
| Escopo grande | Atraso | Entregar por fase; cortar os itens 5 a 9 do item 10 se apertar |
| MapLibre pesado | Lighthouse cai | Carga sob demanda; avaliar tamanho no fim da Fase 1 |
| Migração de dados | Perda de registros existentes | Teste de migração antes de aplicar; Fase 3 mantém a versão antiga do banco até validar |
