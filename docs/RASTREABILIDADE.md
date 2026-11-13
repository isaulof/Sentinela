# Rastreabilidade: requisito do PDF → tela → regra → teste

Projeto Técnico de Monitoramento Fitossanitário 5.0 · cultura: soja.

| Req. | Requisito | Tela | Implementação | Teste |
|---|---|---|---|---|
| 1.1 | Caminhamento em zigzag/diagonais com bordadura | Talhões | `domain/sampling.ts`, `domain/geo.ts` | `sampling.test.ts`; E2E "desenha um talhão…" |
| 1.2 | Método de amostragem por alvo (pano de batida, metro de fileira, folha) | Campo (formulário) | `knowledge/alvos.ts` | `decision.test.ts` |
| 1.3 | Regras de qualidade da amostragem (mín. de pontos, espaçamento, bordadura) | Talhões (avisos do plano) | `sampling.ts` (AREA_INSUFICIENTE, POUCOS_PONTOS, ESPACAMENTO_CURTO, BORDADURA_CURTA) | `sampling.test.ts` |
| 2.1 | Triagem: causa biótica × abiótica | Diagnóstico | `knowledge/arvores.ts` (TRIAGEM) | `diagnosis.test.ts`; E2E "percorre uma árvore…" |
| 2.2 | Padrão no campo (faixa de 20 m, reboleira) | Diagnóstico | `arvores.ts` (FAIXA_20M) | `diagnosis.test.ts` |
| 2.3 | Diferencial foliar e fitotoxicidade | Diagnóstico | `arvores.ts`, `sintomaSinal.ts`, `regras.ts` | `diagnosis.test.ts` |
| 2.4 | Evitar aplicação desnecessária | Alertas (ordem → falso positivo) | `hibrido.ts` (`resolverOrdem`, KPIs) | `hibrido.test.ts`; E2E "resolve uma ordem…" |
| 3.1 | Registro georreferenciado com foto | Campo | `FormRegistro.tsx`, `data/fotos.ts` | E2E "registra um ponto com foto…" |
| 3.2 | Nível de ação por alvo e estádio | Campo, Painel | `domain/decision.ts` | `decision.test.ts` |
| 3.3 | Validação de dados (V01–V13; V13 = plantas analisadas no ponto) | Campo | `domain/validation.ts` | `validation.test.ts`; E2E "bloqueia o salvamento sem foto…" |
| 3.4 | Histórico, mapa de calor, série temporal, exportação | Painel, Mais | `domain/analise.ts`, `exportacao.ts` | `analise.test.ts`, `exportacao.test.ts`; E2E "exporta CSV… backup" |
| 4.1 | Sensor/clima: risco de ferrugem e mofo | Alertas | `domain/climate.ts`, `data/clima.ts` (Open-Meteo) | `climate.test.ts`, `data.test.ts` |
| 4.2 | ~~Drone~~ (retirado em 13/11/2026: a simulação de voo saiu do app; fica só o risco pelo clima) | Alertas | — | — |
| 4.3 | Ordem de checagem com prazo (SLA 24 h) | Alertas | `hibrido.ts` (`SLA_CHECAGEM_H`) | `hibrido.test.ts` |
| 4.4 | Decisão final do agrônomo | Alertas, Diagnóstico | texto e fluxo; nenhum botão recomenda aplicar | E2E "não apresenta recomendação…" |
| 5.x | Gestão: visão geral, KPIs, backup | Painel, Mais | `hibrido.ts` (`calcularKpis`) | `hibrido.test.ts` |
| — | Funciona offline | todas | `vite-plugin-pwa` | E2E `offline.spec.ts` |
| — | Acessível (WCAG 2.1 AA) | todas | tokens de contraste, foco, rótulos | E2E `acessibilidade.spec.ts` |

> A numeração 1.1–5.x segue a estrutura de blocos do PDF e a matriz do `PLANO.md`; conferir cada linha com o enunciado antes da entrega.

## Decisões de projeto (sem norma Embrapa)

Marcadas como `tipo: 'projeto'` em `src/knowledge/fontes.ts` e exibidas assim na interface:

- Bordadura de 30 m.
- Pontos por área: 10 até 50 ha, +1 a cada 10 ha, máximo 30.
- Índices de risco climático (horas de molhamento e faixas de temperatura).
- Regra "faixa retilínea → causa operacional (abiótica)".
- Outlier de registro (5× a média histórica) e prazo de 24 h da ordem de checagem.

## Sem nível de ação numérico (só detecção)

Ferrugem-asiática, mofo-branco e mancha-alvo: as fontes Embrapa consultadas não trazem LDE por contagem. O app registra, sinaliza "detecção" e encaminha ao agrônomo.
