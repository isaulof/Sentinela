# Sentinela — Plano de ação

Monitoramento fitossanitário de **soja** · Fazenda Santa Aurora (Lucas do Rio Verde – MT) · UNEMAT

## Decisões
- Só soja. Cercosporiose do milho aparece apenas como referência comparativa (Bloco 2).
- Tudo feito no app: talhão desenhado no mapa, pontos gerados no app, foto da câmera ou galeria.
- Modo sala de aula: posição do ponto = posição planejada; o app marca `posicaoSimulada: true`.
- Clima: Open-Meteo (gratuito, sem chave). Sem backend; dados em IndexedDB.
- Deploy: GitHub Pages via GitHub Actions, hash routing.

## Stack
React 19 · TypeScript estrito · Vite · TanStack Router · Zustand · Dexie · Tailwind v4 ·
Leaflet · vite-plugin-pwa · Vitest · Playwright

## Camadas
- `src/domain`: funções puras e testadas (amostragem, LDE, validação, diagnóstico, risco climático)
- `src/knowledge`: dados agronômicos com fonte citada (pragas, doenças, árvores de decisão)
- `src/data`: Dexie, exportação, clima
- `src/ui`: telas e componentes

## Fases
1. Fundação (repo, CI, tokens, PWA)  2. Domínio + conhecimento + testes
3. Telas  4. Polimento (responsivo, offline, a11y, Lighthouse)  5. QA  6. Entrega (README, matriz, pitch, documento)

## Rastreabilidade (PDF → app)
| Requisito | Onde |
|---|---|
| 1.1 Caminhamento | Talhões → Plano de amostragem |
| 1.2 Método por alvo | Conhecimento → Alvos |
| 1.3 Regras de qualidade | Domínio: validação de amostragem |
| 2.1–2.4 Diagnóstico | Diagnóstico |
| 3.1–3.4 Dados | Registro, Histórico, Análise |
| 4.1–4.4 Híbrido | Central de alertas |
| 5.x Gestão | Painel |
