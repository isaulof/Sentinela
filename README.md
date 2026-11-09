# Sentinela

Monitoramento fitossanitário de **soja** para o *Projeto Técnico de Monitoramento Fitossanitário 5.0*
(UNEMAT · Tecnólogo em Agrocomputação · Fazenda Santa Aurora, Lucas do Rio Verde – MT).

Aplicativo web instalável (PWA) que funciona **offline**, em celular e computador, sem servidor: os dados ficam no aparelho (IndexedDB).

> O app apoia a decisão, não a substitui. Nenhuma tela recomenda aplicar defensivo; a decisão é sempre do agrônomo.

## O que resolve (Blocos do projeto)

| Bloco | Problema | Onde no app |
|---|---|---|
| 1 | Caminhamento e amostragem | **Talhões**: desenhe o contorno no mapa; o app gera o plano (zigzag ou diagonais), com bordadura e nº de pontos por área |
| 2 | Diagnóstico diferencial | **Diagnóstico**: árvores de decisão, quadro sintoma × sinal, regras SE…ENTÃO com fonte |
| 3 | Dados e decisão | **Campo** (registro com validação V01–V12 e foto), **Painel** (mapa de calor, série temporal, nível de ação) |
| 4 | Sensores, drone e agrônomo | **Alertas**: risco climático (Open-Meteo), voo de drone simulado, ordens de checagem com prazo e KPIs |
| 5 | Gestão | **Painel** e **Mais** (exportação CSV/GeoJSON, backup) |

Rastreabilidade completa (requisito → tela → teste): [`docs/RASTREABILIDADE.md`](docs/RASTREABILIDADE.md).
Fontes agronômicas e o que é "decisão de projeto": [`FONTES.md`](FONTES.md).
Roteiro de apresentação: [`docs/PITCH.md`](docs/PITCH.md).

## Modo sala de aula

Não é preciso ir ao campo. Em **Mais → Carregar demonstração** entram 4 talhões, registros, fotos de exemplo e ordens de checagem.
Ao registrar, a posição do ponto é a planejada e o registro é marcado `posicaoSimulada: true`. Em **Mais** é possível ligar o GPS real.

## Rodar

```bash
npm ci
npm run dev        # desenvolvimento
npm run check      # tipos + lint + testes + build
npm run e2e        # Playwright (celular e desktop, a11y, offline, fluxos)
```

Requer Node 22+.

## Publicar no GitHub Pages

1. Crie o repositório no GitHub e envie o código para a branch `main`.
2. Em **Settings → Pages → Build and deployment**, escolha **Source: GitHub Actions**.
3. O workflow `.github/workflows/deploy.yml` testa (tipos, lint, unitários, E2E) e só então publica.

O build usa `base: './'` e rotas com hash (`#/campo`), então funciona em qualquer subcaminho (`usuario.github.io/repositorio/`) sem configuração extra.

## Arquitetura

```
src/domain      regras puras e testadas (geometria, amostragem, nível de ação, validação, clima, híbrido, exportação)
src/knowledge   conhecimento agronômico com fonte citada
src/data        Dexie (IndexedDB), Open-Meteo, fotos, demonstração
src/ui          telas, componentes, estado
```

React 19 · TypeScript estrito · Vite · TanStack Router (hash) · Zustand · Dexie · Tailwind v4 · Leaflet · vite-plugin-pwa · Vitest · Playwright + axe.

## Qualidade verificada

- 91 testes unitários (domínio, dados, exportação) e 42 E2E (a11y WCAG 2.1 AA em 6 telas × 2 temas × 2 formatos, offline, fluxos de negócio).
- Lighthouse (celular, build local): Desempenho 99 · Acessibilidade 100 · Boas práticas 100 · SEO 100.

## Limites conhecidos

- Fotos ficam no aparelho e **não** entram no backup JSON.
- Testado em Chromium; Safari/iOS não foi testado em aparelho real.
- Ferrugem, mofo-branco e mancha-alvo não têm nível de ação numérico nas fontes Embrapa consultadas: o app só registra e sinaliza detecção.
- Bordadura de 30 m, número de pontos por área e índices de risco climático são **decisões de projeto**, rotuladas como tal no app.
