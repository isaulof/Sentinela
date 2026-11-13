# Sentinela

Monitoramento fitossanitário de **soja** para o *Projeto Técnico de Monitoramento Fitossanitário 5.0*
(UNEMAT · Tecnólogo em Agrocomputação · Fazenda Santa Aurora, Lucas do Rio Verde – MT).

Aplicativo web instalável (PWA) que funciona **offline**, em celular e computador, sem servidor: os dados ficam no aparelho (IndexedDB).

**Abrir o app:** https://isaulof.github.io/Sentinela/ (no celular, use "Instalar" / "Adicionar à tela inicial").

> O app apoia a decisão, não a substitui. Nenhuma tela recomenda aplicar defensivo; a decisão é sempre do agrônomo.

## O que resolve (Blocos do projeto)

| Bloco | Problema | Onde no app |
|---|---|---|
| 1 | Caminhamento e amostragem | **Talhões**: desenhe o contorno no mapa; o app gera o plano (zigzag ou diagonais), com bordadura e nº de pontos por área. Editar e apagar talhão |
| 2 | Diagnóstico diferencial | **Diagnóstico**: árvores de decisão, quadro sintoma × sinal, regras SE…ENTÃO com fonte |
| 3 | Dados e decisão | **Coleta**: registro de 22 alvos (pragas e doenças) com validação, foto, método de coleta, condições do dia e trilha de auditoria (corrigir cria nova versão; desfazer anula; nada é apagado). **Guia até o ponto** pelo GPS em tela cheia. **Talhão**: mapa de calor, série temporal e nível de ação |
| 4 | Sensores, drone e agrônomo | **Alertas**: risco climático (Open-Meteo), voo de drone simulado, ordens de checagem com prazo e KPIs |
| 5 | Gestão | **Início** (clima, próxima ação, resumo), **Relatório do talhão em PDF** (croqui, resultado por alvo e uma ficha por ponto), exportação **CSV/GeoJSON** e backup |
| — | Biblioteca | Ficha completa por praga e doença, com **fonte numerada em cada fato** (Embrapa, Sistemas de Produção 17). Sem marcas e sem doses; lacunas ditas com honestidade |

Rastreabilidade completa (requisito → tela → teste): [`docs/RASTREABILIDADE.md`](docs/RASTREABILIDADE.md).
Fontes agronômicas e o que é "decisão de projeto": [`FONTES.md`](FONTES.md).
Roteiro de apresentação: [`docs/PITCH.md`](docs/PITCH.md).

## Modo sala de aula

Não é preciso ir ao campo. Em **Perfil → Carregar demonstração** entram 4 talhões, registros, fotos reais de exemplo e ordens de checagem.
Ao registrar, a posição do ponto é a planejada e o registro é marcado `posicaoSimulada: true`. Em **Perfil** é possível ligar o GPS real.

## Rodar

```bash
npm ci
npm run dev        # desenvolvimento
npm run check      # tipos + lint + testes + build
npm run e2e        # Playwright (celular e desktop, a11y, offline, fluxos); ~6 min
```

Requer Node 22+.

## Publicar no GitHub Pages

1. Crie o repositório no GitHub e envie o código para a branch `main`.
2. Em **Settings → Pages → Build and deployment**, escolha **Source: GitHub Actions**.
3. O workflow `.github/workflows/deploy.yml` testa (tipos, lint, unitários) e só então publica. O E2E **não** roda no deploy: rode `npm run e2e` na sua máquina antes do push.

O build usa `base: './'` e rotas com hash (`#/campo`), então funciona em qualquer subcaminho (`isaulof.github.io/Sentinela/`) sem configuração extra.

## Arquitetura

```
src/domain      regras puras e testadas (geometria, amostragem, nível de ação, validação, diagnóstico, estatística, fuso, clima, híbrido, exportação)
src/knowledge   alvos, árvores de decisão e Biblioteca, tudo com fonte citada
src/data        Dexie (IndexedDB), Open-Meteo, fotos, exportação, demonstração
src/ui          telas, componentes, estado
```

React 19 · TypeScript estrito · Vite · TanStack Router (hash) · Zustand · Dexie · Tailwind v4 · Leaflet · vite-plugin-pwa · Vitest · Playwright + axe.

## Qualidade verificada

- 457 testes unitários (domínio, conhecimento, dados, exportação) e 414 execuções E2E (celular e desktop: acessibilidade WCAG 2.1 AA com axe, offline, tamanhos de tela, fluxos de negócio).
- A Biblioteca tem testes que exigem fonte em todo fato e proíbem marca, dose e "aplique".

## Limites conhecidos

- Fotos ficam no aparelho e **não** entram no backup JSON.
- Testado em Chromium; Safari/iOS não foi testado em aparelho real.
- Só a lagarta-da-soja, a lagarta-helicoverpa e outros alvos com nível publicado pela Embrapa têm nível de ação numérico. Nos demais (ferrugem, mofo-branco, mancha-alvo, spodoptera e outros), o app só registra e sinaliza **detecção**.
- Spodoptera, broca e mela têm ficha na Biblioteca, mas ainda não têm árvore de sintomas no Diagnóstico. Faltam as fichas de nematoides e de pulgão.
- Clima vem do Open-Meteo e precisa de internet; sem rede, o app segue funcionando e o bloco de clima some.
- Bordadura de 30 m, número de pontos por área e índices de risco climático são **decisões de projeto**, rotuladas como tal no app.
