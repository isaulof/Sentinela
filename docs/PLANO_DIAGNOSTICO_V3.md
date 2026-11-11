# Plano do Diagnóstico v3 — doenças, pragas e causas não vivas

Objetivo: o produtor descobre **o que está acontecendo na lavoura** (doença, praga, falta de nutriente, efeito de produto/fertilizante ou clima/solo), com um **norte** (percentual + explicação), nunca uma decisão final. Quem decide é o agrônomo.

## 1. Por que o atual ficou confuso

Diagnóstico do código de hoje (`funil.ts`, `diagnostico.ts`):

| Problema | Efeito para o produtor |
|---|---|
| Um **banco único** de 11 perguntas; a próxima é escolhida só por ganho de informação | A ordem "pula": uma pergunta de folha, depois uma de raiz, depois uma de clima. Parece aleatório |
| Perguntas de **tipos diferentes misturadas** (órgão, cor, bicho, clima, produto) | O produtor não entende *por que* está sendo perguntado |
| Todas as respostas têm o **mesmo peso de confiabilidade** | "Tom de amarelo" (subjetivo) pesa tanto quanto "tem bicho?" (objetivo) |
| Perfis esparsos (muitas respostas sem nível → valor neutro) | Uma resposta errada derruba a causa certa |
| **Sem imagens de comparação** | Leigo não consegue distinguir "pústula" de "ponto pardo" só pelo texto |
| Abiótico e biótico no mesmo ranking, sem separar | Não responde a pergunta-chave: *é doença/praga ou foi o que eu apliquei?* |
| Sem pragas como módulo próprio | Percevejo e lagartas viram "mais um candidato" |

## 2. Visão: funil em 4 etapas (o que você descreveu, formalizado)

```
Etapa 0  Contexto automático (o app já sabe)
Etapa 1  Triagem: 3 perguntas  →  aponta o RAMO (viva × não viva; doença × praga)
Etapa 2  Ramo específico: 4–6 perguntas dedicadas ao ramo, cada uma com peso
Etapa 3  Comparação por fotos: "qual se parece mais?"
Etapa 4  Resultado: percentual + por que + como confirmar + enviar ao agrônomo
```

### Etapa 0 — Contexto automático (zero perguntas)
Tudo que o app já tem entra como evidência, sem perguntar:
- fase da lavoura do talhão (já existe: `janela`);
- clima recente (chuva, umidade, calor — `climate.ts`/`useClima`);
- **histórico do talhão**: produtos/adubações registrados, ferrugem já detectada em pontos vizinhos, data do plantio;
- pontos do monitoramento próximos com o mesmo problema.

### Etapa 1 — Triagem (3 perguntas, sempre as mesmas)
Perguntas simples, objetivas, com foto em cada opção:

1. **O que chamou atenção?** — manchas na folha · amarelo/pálida · folha comida · bicho na planta · vagem/grão · haste/raiz/murcha.
2. **Como aparece na lavoura?** — em faixas retas · em reboleira redonda · plantas soltas · uniforme na área toda · só na borda. *(Esta é a pergunta que mais separa causa viva de não viva: faixa reta = máquina/produto; reboleira = solo/nematoide/mofo; uniforme = clima/nutrição.)*
3. **Mudou algo nos últimos 15 dias?** — apliquei herbicida · apliquei fungicida/inseticida · adubei (qual) · chuva forte/granizo · seca/calor · vizinho aplicou · nada.

Resultado da triagem: um **ramo** (ver §4) e uma distribuição inicial entre os grupos `biótico-doença`, `biótico-praga`, `abiótico-nutrição`, `abiótico-produto`, `abiótico-clima/solo`. Já aqui o app mostra "por enquanto parece: **causa não viva** (produto/clima) — vamos confirmar".

### Etapa 2 — Ramo específico (4 a 6 perguntas)
Cada ramo tem **seu próprio conjunto de perguntas**, curadas, em **ordem lógica** (a ordem é de árvore; o ganho de informação só reordena *dentro* do ramo e nunca pula de assunto). Exemplo, ramo "manchas na folha":

1. Onde na planta? (baixeiro / meio / topo / toda)
2. Como é a mancha? (foto: pústula · alvo · ponto pardo · angular encharcada · pó branco · queimado de contato)
3. Olhe por baixo da folha: tem pó/pústula/bolinhas? (sim/não/não sei)
4. Tem halo amarelo? Segue as nervuras?
5. Há quanto tempo? Espalhou rápido (dias) ou devagar (semanas)?

Cada pergunta **aponta para outras**: as respostas ativam/desativam perguntas seguintes (campo `quando`). Ex.: "pó branco" ativa "pós-floração?" e desativa as perguntas de pústula.

### Etapa 3 — Comparação por fotos
Depois do ramo, o app mostra **3 ou 4 cartões de foto** dos candidatos que restaram (os mais prováveis + 1 "pegadinha" que costuma ser confundida). O produtor escolhe **"mais parecido"** ou **"nenhum parece"** ou **"não sei"**. Cada cartão traz uma legenda de **o que olhar** ("procure o centro claro com anel").
- A escolha é evidência com **peso limitado**: leigo erra comparação de foto. A escolha sozinha nunca vira o resultado (ver §5).
- "Nenhum parece" reduz todos os apresentados e abre a opção de ver os próximos candidatos.
- Dá para repetir a etapa 3 uma vez com os candidatos seguintes.

### Etapa 4 — Resultado
- **Duas camadas**: primeiro *viva × não viva* (ex.: "72% causa não viva"), depois a causa específica dentro do grupo ("Efeito de herbicida (PPO): 64%").
- **Percentual de certeza** com faixa e aviso fixo: *"É um norte, não a decisão final."*
- **Por que o app pensa isso**: cada resposta com seu efeito (+/−) e as fotos escolhidas.
- **Conflitos**: respostas que não combinam ("você marcou faixas retas e pústula por baixo — isso é raro em ferrugem").
- **Como confirmar** (teste de campo), **o que NÃO combina**, **outras possibilidades** (2º e 3º).
- **Ações**: salvar no ponto, enviar ao agrônomo (mensagem pronta, sem produto nem dose), abrir a Biblioteca do problema.

## 3. Motor v3 (o que muda no código)

Base: o motor Bayesiano atual é bom e testado; o que muda é **estrutura e conteúdo**, não a matemática inteira.

1. **Peso da pergunta (confiabilidade)** — cada pergunta ganha `confiabilidade` de 0 a 1 (ex.: "tem bicho?" 0,95; "tom do amarelo" 0,5). A verossimilhança vira `p^confiabilidade`: pergunta subjetiva puxa menos. É o "cada uma tem um peso" que você pediu.
2. **Ramos e ativação (`quando`)** — perguntas pertencem a um ramo e só aparecem se as respostas anteriores a ativam. A próxima pergunta = maior ganho **entre as ativas do ramo atual**.
3. **Pisos de segurança** — nenhuma resposta zera uma causa (já é assim: `incompativel = 0.01`); respostas "não sei" são neutras; uma única resposta errada não pode tirar a causa certa do top-3 (testado — ver §6).
4. **Evidência de foto** — `escolhaFoto` entra como razão de verossimilhança limitada (escolhido ×2,5; não escolhido ×0,8; "nenhum" ×0,6 nos mostrados). Valores de projeto, ajustados na calibração.
5. **Dois universos** — `catalogo/doencas+abioticos` e `catalogo/pragas`, mesmo motor, perguntas e ramos próprios. A triagem decide para qual ir ("é um bicho?" vai direto ao módulo de pragas).
6. **Checagem de consistência** — regras de conflito (`incompativeis: [[q1:o1, q2:o2]]`) geram avisos e uma pergunta de confirmação.
7. **Percentual** — voltamos a mostrar porcentagem (você pediu), mas como **índice de compatibilidade** com teto de 95% e rótulo em palavras ao lado (ver decisão D1).
8. **Desfecho** — o diagnóstico salvo guarda o `desfecho` (o agrônomo confirmou? qual foi a causa real?). Com ~100 casos dá para **calibrar** pesos e percentuais de verdade.

### Modelo de dados do catálogo (cada problema)
```ts
{
  id, nome, cientifico?, grupo: 'doenca' | 'praga' | 'nutricao' | 'produto' | 'clima_solo',
  janela?: [fase, fase], hospedeiro/regiao?: ...,
  sinais: { [perguntaId]: { [opcaoId]: nivel } },     // típico|comum|possível|raro|incompatível
  fotos: [{ arquivo, tipo: 'sintoma'|'sinal'|'campo'|'confundivel', legenda, oQueOlhar, fonte, licenca }],
  confundeCom: [ids], comoConfirmar: [...], proximosPassos: [...], fontes: [...],
  origem: 'fonte' | 'projeto'                         // o que ainda não foi conferido fica marcado
}
```

### Pasta de fotos (você pesquisa e anexa)
```
public/imagens/diagnostico/<id-do-problema>/
  01-sintoma.jpg        02-sinal-detalhe.jpg      03-campo.jpg      04-confundivel.jpg
public/imagens/diagnostico/_opcoes/<pergunta>-<opcao>.jpg   (foto de cada resposta)
public/imagens/diagnostico/creditos.json                     (fonte, autor, licença de cada foto)
```
- JPG, ~1200 px no lado maior, até ~250 KB.
- **Registrar autor e licença**: foto da Embrapa e de universidades tem direitos autorais. Preferir fotos próprias, de domínio/licença aberta ou com autorização escrita.
- Script `npm run fotos:faltando` lista o que ainda não tem foto; o app mostra um cartão provisório (ícone) até a foto chegar, então dá para construir tudo antes de ter as imagens.

## 4. Os ramos

| Ramo | Quando | Candidatos |
|---|---|---|
| A. Manchas na folha | folha com manchas/pontos/pó | ferrugem, mancha-alvo, oídio, DFC, olho-de-rã, bacterioses, mela, queima por produto |
| B. Folha amarela/pálida/deformada | cor ou forma mudou | deficiências (N, P, K, Mg, S, Mn, Fe, Zn…), herbicidas (2,4-D, glifosato, ALS), nematoide, vírus, estresse |
| C. Folha comida/furada | dano com falta de tecido | lagartas, vaquinhas, mosca-branca (indireto), granizo |
| D. Vagem e grão | problema nas vagens | percevejos, antracnose, lagartas de vagem, haste verde, mancha-púrpura |
| E. Haste, raiz e murcha | perto do chão, murcha | mofo-branco, podridões, SDS, nematoides, tombamento, estresse hídrico |
| F. Bicho (módulo de pragas) | "vi um bicho" | percevejos, lagartas (várias), mosca-branca, ácaros, tripes, vaquinhas, elasmo, coró… |
| G. Dano em área (padrão) | faixas, reboleiras | deriva/herbicida, fertilizante mal distribuído, compactação, raio, encharcamento |

Cada ramo tem no máximo **6 perguntas** e termina na Etapa 3.

## 5. Como o sistema "não se confunde"

- **Pergunta objetiva primeiro, subjetiva depois.** Cor e tom entram tarde e com peso baixo.
- **Foto em toda opção** de pergunta visual (não só texto).
- **"Não sei" em tudo**: é neutro e não penaliza.
- **Voltar e corrigir**: qualquer resposta pode ser trocada e o resultado recalcula na hora.
- **Conflito vira pergunta de confirmação**, não resultado errado.
- **Foto do produtor não manda sozinha**: a escolha por comparação visual tem peso limitado; o resultado exige concordância entre perguntas e fotos para passar de ~80%.
- **Incerteza honesta**: se top-1 e top-2 estão próximos, o app mostra os dois ("duas possibilidades") em vez de forçar um.
- **Teto 95%**: nunca "100% de certeza".

## 6. Testes (para provar que é inteligente)

1. **Casos de ouro**: para cada problema, um conjunto de respostas "de livro" → tem que ser o top-1.
2. **Mutação**: troca 1 resposta (simula erro do leigo) → o problema certo tem que continuar no top-3.
3. **Pegadinhas**: pares confundíveis (ferrugem × mancha-alvo, deficiência de Mg × herbicida ALS) → o app tem que pedir a pergunta que desempata.
4. **Cobertura da base**: toda pergunta/opção citada existe; todo problema tem fotos mínimas, "como confirmar" e fonte (já existe `validarBase`, será estendida).
5. **E2E + acessibilidade** do fluxo novo (já existe a infra Playwright).
6. **Revisão agronômica**: um agrônomo revisa cada perfil (marca `origem: 'fonte'` quando conferido).

## 7. Pragas — diagnóstico próprio

Mesmo motor, outro catálogo. Particularidades:
- Perguntas sobre o **inseto**: forma (lagarta, percevejo, mosquinha, besouro), cor, tamanho, como anda (lagarta "mede-palmo" = falsa-medideira), onde está (folha, vagem, haste, solo), quantos por pano-de-batida.
- Perguntas sobre o **dano**: furo redondo, folha raspada, "só ficou a nervura", grão chocho/manchado, planta cortada rente ao chão, teia.
- **Estágio** (ovo, ninfa, adulto, lagarta pequena/grande): foto de cada um — o produtor confunde ninfa com outro inseto.
- Ao final, **liga ao monitoramento**: se for percevejo/lagarta, oferece registrar na Coleta e mostra o nível de ação já existente (`decision.ts`). As demais não têm nível de ação no app: só orientação ao agrônomo.

## 8. Fases de entrega

| Fase | Entrega | Depende de |
|---|---|---|
| **F0** | Catálogo e lista de fotos (este plano + `CATALOGO_DIAGNOSTICO.md`) | — |
| **F1** | Motor v3: ramos, `quando`, confiabilidade, foto como evidência, consistência + testes de ouro/mutação | F0 |
| **F2** | Triagem de 3 perguntas + Etapa 0 automática + ramo "manchas na folha" completo (ferrugem, mancha-alvo, oídio, DFC, produto) | F1 |
| **F3** | Tela de comparação por fotos + novo resultado (duas camadas, percentual, explicação, conflitos) | F1, algumas fotos |
| **F4** | Demais ramos de doença e causas não vivas (nutrição, herbicida, fungicida/calda, fertilizante, clima) | F2 |
| **F5** | Módulo de pragas | F1 |
| **F6** | Revisão agronômica + calibração com desfecho real | uso em campo |

Sugestão: começar por **F1 + F2** (o ramo mais comum, manchas na folha, funcionando de ponta a ponta) para você sentir o fluxo novo antes de alimentarmos o resto.

## 9. Decisões que preciso de você

- **D1 — Percentual.** O último commit tirou a porcentagem de propósito: não é probabilidade calibrada e passa falsa precisão. Você agora quer o percentual. Proponho mostrar "**78% de certeza**" **junto** com a palavra ("provável") e o aviso "é um norte", com teto de 95%. Concorda?
- **D2 — Só soja** neste momento (milho e algodão ficam fora do escopo)? Assumi que sim.
- **D3 — Fotos**: você vai pegar fotos com licença aberta/autorização, ou usamos fotos próprias de campo? Define o `creditos.json`.
- **D4 — Fungicida e fertilizante como causa**: fungicida raramente causa dano sozinho; o que se vê é queima por mistura de calda, adjuvante/óleo e aplicação em horas quentes. Vou modelar assim ("efeito de calda/aplicação"), a menos que você tenha casos específicos em mente.
