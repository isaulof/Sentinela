# Roteiro do pitch (5 minutos)

Preparação: abrir o app, **Mais → Carregar demonstração**, deixar a aba em **Painel**. Funciona sem internet.

| Tempo | Mensagem | Mostrar no app |
|---|---|---|
| 0:00–0:30 | **Problema.** Monitoramento no papel: amostragem sem padrão, dado sem prova, diagnóstico por achismo e aplicação desnecessária. | Painel (visão geral da Fazenda Santa Aurora) |
| 0:30–1:30 | **Amostragem.** O talhão é desenhado no mapa; o app gera zigzag com bordadura e o nº de pontos por área, e avisa quando o plano é fraco. | Talhões → Novo talhão → desenhar → plano; trocar zigzag × diagonais |
| 1:30–3:00 | **Doença × erro de aplicação.** Antes de pensar em fungicida, a triagem separa causa biótica de abiótica. Faixa retilínea sugere operação, não doença. | Diagnóstico → árvore de triagem até a conclusão; mostrar "decisão do agrônomo" |
| 3:00–4:00 | **Dado confiável.** Registro com foto, validação (V01–V12), zero explícito e nível de ação por estádio. Mapa de calor e série temporal. | Campo → registrar (modo sala de aula); Painel → mapa de calor |
| 4:00–5:00 | **Sensor + drone + agrônomo.** Clima e drone geram ordem de checagem com prazo de 24 h; o técnico confirma ou marca falso positivo; o app conta a aplicação evitada. | Alertas → ordem → Ir ao ponto e checar → falso positivo → KPI |

## Falas-chave
- "O app nunca recomenda aplicar. Ele organiza a evidência para o agrônomo decidir."
- "Onde a Embrapa não define um nível numérico (ferrugem, mofo, mancha-alvo), o app não inventa: só detecta e encaminha."
- "O que é decisão nossa (bordadura, pontos por área, índices de clima) está rotulado como decisão de projeto."

## Perguntas prováveis
- **Por que a posição é simulada?** Para apresentar em sala; o registro fica marcado `posicaoSimulada`. Em campo, liga-se o GPS real.
- **E sem internet?** Funciona: PWA com dados no aparelho. Só o clima e os mapas precisam de rede (com cache).
- **Onde ficam os dados?** No próprio aparelho (IndexedDB); backup e CSV/GeoJSON em Mais.
- **Por que sem LDE para ferrugem?** Não há LDE por contagem nas fontes; a decisão usa vazio sanitário, risco climático e detecção.
