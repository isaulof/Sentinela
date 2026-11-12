import { expect, test, type Page } from '@playwright/test'
import { anexarFoto, carregarDemo } from './ajuda'

/** Responde o questionário como quem vê ferrugem: pústulas por baixo das folhas de baixo, sem bicho nem mofo. */
async function responderFunilFerrugem(page: Page) {
  const RESP: [RegExp, RegExp][] = [
    [/Onde está o problema/, /Manchas ou pontos nas folhas/],
    [/aparece no terreno/, /manchas redondas/],
    [/O que aconteceu na lavoura/, /Muita chuva ou dias nublados/],
    [/Como são as marcas/, /Pontinhos ou pústulas por baixo/],
    [/Em que altura/, /Folhas de baixo/],
    [/Vire a folha/, /Pontinhos em relevo/],
    [/Como o problema andou/, /Está aumentando/],
  ]
  const salvar = page.getByRole('button', { name: /^Salvar (em um|no) ponto/ })
  for (let i = 0; i < 16; i++) {
    if (await salvar.first().isVisible()) return
    const titulo = (await page.getByRole('heading', { level: 2 }).first().textContent()) ?? ''
    if (/Qual foto mais se parece/.test(titulo)) {
      await page.getByRole('button', { name: /Ferrugem-asiática/ }).click()
    } else {
      const par = RESP.find(([q]) => q.test(titulo))
      await (par ? page.getByRole('button', { name: par[1] }) : page.getByRole('button', { name: 'Não consigo ver isso' })).click()
    }
    await page.waitForTimeout(150)
  }
}

test.describe('fluxos de negócio', () => {
  test('registra um ponto com foto em modo demonstração', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/coleta')
    await page.getByRole('button', { name: 'Registrar achado' }).click()
    await page.getByRole('dialog').getByLabel('Estádio fenológico').waitFor() // o formulário só monta depois de ler o rascunho no aparelho: esperar, senão o campo de nome ainda não existe
    const dialogo = page.getByRole('dialog')
    await expect(dialogo.getByText('Posição simulada (demonstração)')).toBeVisible()
    const nome = dialogo.getByPlaceholder('Nome e sobrenome')
    if (await nome.isVisible()) await nome.fill('Aluno Teste')
    await dialogo.getByRole('radio', { name: 'Ninfa' }).click()
    await dialogo.getByRole('button', { name: 'Nenhuma ocorrência (registrar zero)' }).click()
    await anexarFoto(page)
    await dialogo.getByRole('button', { name: 'Salvar registro' }).click()
    await expect(page.getByText(/Registro salvo em/)).toBeVisible()
    await expect(dialogo).toBeHidden()
  })

  test('bloqueia o salvamento sem foto quando o nível de ação é atingido', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/coleta')
    await page.getByRole('button', { name: 'Registrar achado' }).click()
    await page.getByRole('dialog').getByLabel('Estádio fenológico').waitFor() // o formulário só monta depois de ler o rascunho no aparelho: esperar, senão o campo de nome ainda não existe
    const dialogo = page.getByRole('dialog')
    const nome = dialogo.getByPlaceholder('Nome e sobrenome')
    if (await nome.isVisible()) await nome.fill('Aluno Teste')
    await dialogo.getByLabel('Estádio fenológico').selectOption('R5')
    await dialogo.getByRole('radio', { name: 'Percevejo-marrom' }).click()
    await dialogo.getByRole('radio', { name: 'Ninfa' }).click()
    await dialogo.getByRole('button', { name: 'Aumentar' }).click({ clickCount: 5 })
    const salvar = dialogo.getByRole('button', { name: 'Salvar registro' })
    await expect(salvar).toBeDisabled()
    await expect(dialogo.getByRole('alert').filter({ hasText: /foto/i })).toBeVisible()
    await anexarFoto(page)
    await expect(salvar).toBeEnabled()
  })

  test('desenha um talhão no mapa e gera o plano de amostragem', async ({ page }) => {
    await page.goto('/#/')
    await page.getByRole('button', { name: 'Desenhar talhão' }).click() // do Início direto para o desenho, sem passo extra
    await expect(page).toHaveURL(/#\/talhoes\/novo/)
    const mapa = page.locator('.maplibregl-map')
    const caixa = (await mapa.boundingBox())!
    for (const [fx, fy] of [[0.3, 0.3], [0.7, 0.3], [0.7, 0.7], [0.3, 0.7]] as const) {
      await page.mouse.click(caixa.x + caixa.width * fx, caixa.y + caixa.height * fy)
    }
    await page.getByRole('button', { name: 'Concluir', exact: true }).click()
    const dialogo = page.getByRole('dialog')
    await dialogo.getByPlaceholder('Ex.: T-05 Sede').fill('T-99 Teste')
    await dialogo.getByRole('button', { name: 'Salvar talhão e gerar plano' }).click()
    await expect(page).toHaveURL(/#\/talhoes\/T-/)
    await expect(page.getByRole('heading', { name: 'T-99 Teste' })).toBeVisible()
    await page.goto('/#/coleta')
    await expect(page.getByText(/\d+ pontos/).first()).toBeVisible()
  })

  test('resolve uma ordem de checagem como falso positivo e registra a aplicação evitada', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/alertas')
    const evitadas = page.getByText('Aplicação desnecessária evitada.')
    await expect(page.getByRole('button', { name: 'Ir ao ponto e checar' }).first()).toBeVisible()
    const antes = await evitadas.count()
    await page.getByRole('button', { name: 'Ir ao ponto e checar' }).first().click()
    await expect(page).toHaveURL(/#\/coleta/)
    await page.getByRole('button', { name: 'Registrar achado' }).click()
    await page.getByRole('dialog').getByLabel('Estádio fenológico').waitFor() // o formulário só monta depois de ler o rascunho no aparelho: esperar, senão o campo de nome ainda não existe
    const dialogo = page.getByRole('dialog')
    await expect(dialogo.getByText(/Ordem de checagem aberta/)).toBeVisible()
    const nome = dialogo.getByPlaceholder('Nome e sobrenome')
    if (await nome.isVisible()) await nome.fill('Aluno Teste')
    await dialogo.getByRole('radio', { name: 'Ninfa' }).click()
    await dialogo.getByRole('button', { name: 'Nenhuma ocorrência (registrar zero)' }).click()
    await dialogo.getByRole('radio', { name: 'Falso positivo (abiótica)' }).click()
    await dialogo.getByPlaceholder(/Causa/).fill('Fitotoxicidade por herbicida')
    await anexarFoto(page)
    await dialogo.getByRole('button', { name: 'Salvar registro' }).click()
    await expect(page.getByText(/Registro salvo em/)).toBeVisible()
    await page.goto('/#/alertas')
    await expect(evitadas).toHaveCount(antes + 1)
  })

  test('questionário em etapas: triagem, detalhes, fotos e um resultado com percentual e explicação', async ({ page }) => {
    await page.goto('/#/diagnostico')
    await page.getByRole('button', { name: 'Iniciar diagnóstico' }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'Onde está o problema?' })).toBeVisible()
    await expect(page.getByText('Triagem · 1 de 3')).toBeVisible()
    await expect(page.getByRole('progressbar', { name: 'Andamento do diagnóstico' })).toBeVisible()
    await page.getByRole('button', { name: /Manchas ou pontos nas folhas/ }).click()
    await expect(page.getByText('Triagem · 2 de 3')).toBeVisible()
    await expect(page.getByText(/\d+%/)).toHaveCount(0) // nada de porcentagem no meio das perguntas
    await page.getByRole('button', { name: /manchas redondas/ }).click()
    await page.getByRole('button', { name: /Muita chuva ou dias nublados/ }).click()
    await expect(page.getByText(/^Detalhes · 1$/)).toBeVisible() // depois da triagem só entram perguntas do ramo
    await page.getByRole('button', { name: /Pontinhos ou pústulas por baixo/ }).click()
    await responderFunilFerrugem(page)
    await expect(page.getByRole('heading', { level: 2, name: 'Ferrugem-asiática' })).toBeVisible()
    await expect(page.getByText(/\d+% de certeza · (Bem provável|Provável|Ainda incerto)/)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'É doença ou praga? Ou outra causa?' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'O que fazer agora' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Por que o app pensa isso' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Como ter certeza' })).toBeVisible()
    await expect(page.getByText(/não a decisão final/)).toBeVisible()
    await page.getByText('Como o app chegou a esse resultado').click()
    await expect(page.getByText(/Não é uma probabilidade medida nem um laudo|não uma probabilidade medida nem um laudo/)).toBeVisible()
    await page.getByRole('button', { name: 'Voltar', exact: true }).click()
    await expect(page.getByRole('progressbar', { name: 'Andamento do diagnóstico' })).toBeVisible()
  })

  test('sem base, o app não dá nome ao problema: pergunta as características e termina "ainda não dá para dizer"', async ({ page }) => {
    await page.goto('/#/diagnostico')
    await page.getByRole('button', { name: 'Iniciar diagnóstico' }).click()
    await page.getByRole('button', { name: /Vi um bicho na planta/ }).click()
    await page.getByRole('button', { name: /Plantas soltas/ }).click()
    await page.getByRole('button', { name: /Nada de diferente/ }).click()
    await page.getByRole('button', { name: /em forma de escudo/ }).click()
    // Segue a linha do percevejo: tamanho, cor, faixa nas costas, onde estava (e nada de antenas ou como a lagarta anda)
    const vistas: string[] = []
    const incerto = page.getByRole('heading', { level: 2, name: 'Ainda não dá para dizer o que é' })
    for (let i = 0; i < 20 && !(await incerto.isVisible()); i++) {
      const titulo = (await page.getByRole('heading', { level: 2 }).first().textContent()) ?? ''
      vistas.push(titulo)
      if (/Qual foto mais se parece/.test(titulo)) await page.getByRole('button', { name: 'Nenhuma parece' }).click()
      else await page.getByRole('button', { name: 'Não consigo ver isso' }).click()
      await page.waitForTimeout(120)
    }
    await expect(incerto).toBeVisible()
    expect(vistas.join('|')).toMatch(/tamanho do bicho/)
    expect(vistas.join('|')).toMatch(/faixa clara/)
    expect(vistas.join('|')).not.toMatch(/antenas|como ela anda/)
    await expect(page.getByRole('heading', { name: 'Percevejo-marrom', level: 2 })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Enviar ao agrônomo' })).toBeVisible()
  })

  test('cada bicho segue a sua linha: lagarta pergunta como anda; besouro pergunta o desenho', async ({ page }) => {
    const seguir = async (escolha: RegExp) => {
      await page.goto('/#/diagnostico')
      await page.reload() // recomeça do zero (a mudança de hash sozinha manteria o questionário anterior)
      await page.getByRole('button', { name: 'Iniciar diagnóstico' }).click()
      await page.getByRole('button', { name: /Vi um bicho na planta/ }).click()
      await page.getByRole('button', { name: /Plantas soltas/ }).click()
      await page.getByRole('button', { name: /Nada de diferente/ }).click()
      await page.getByRole('button', { name: escolha }).click()
      const vistas: string[] = []
      for (let i = 0; i < 4; i++) {
        const titulo = (await page.getByRole('heading', { level: 2 }).first().textContent()) ?? ''
        if (/Qual foto mais se parece|Ainda não dá/.test(titulo)) break // acabaram as perguntas do caminho
        vistas.push(titulo)
        await page.getByRole('button', { name: 'Não consigo ver isso' }).click()
        await page.waitForTimeout(120)
      }
      return vistas.join('|')
    }
    const lagarta = await seguir(/^Lagarta/)
    expect(lagarta).toMatch(/como ela anda|patinhas/)
    expect(lagarta).not.toMatch(/antenas|asas|Como é o besouro/)
    const besouro = await seguir(/^Besouro/)
    expect(besouro).toMatch(/Como é o besouro|balança a planta/)
    expect(besouro).not.toMatch(/como ela anda|patinhas|antenas/)
  })

  test('quem aplicou herbicida recebe perguntas sobre o produto, não sobre doença nem bicho', async ({ page }) => {
    await page.goto('/#/diagnostico')
    await page.getByRole('button', { name: 'Iniciar diagnóstico' }).click()
    await page.getByRole('button', { name: /Folhas amarelas, pálidas ou deformadas/ }).click()
    await page.getByRole('button', { name: /Em faixas retas/ }).click()
    await page.getByRole('button', { name: /Apliquei herbicida/ }).click()
    const vistas: string[] = []
    for (let i = 0; i < 5; i++) {
      const titulo = (await page.getByRole('heading', { level: 2 }).first().textContent()) ?? ''
      if (/Qual foto mais se parece|Ainda não dá/.test(titulo)) break
      vistas.push(titulo)
      await page.getByRole('button', { name: 'Não consigo ver isso' }).click()
      await page.waitForTimeout(120)
    }
    const todas = vistas.join('|')
    expect(todas).toMatch(/herbicida foi|depois da aplicação|nasceram depois/)
    expect(todas).not.toMatch(/embaixo|bicho|raiz e a haste|vagens/i)
  })

  test('quem não aplicou nada não recebe perguntas de aplicação', async ({ page }) => {
    await page.goto('/#/diagnostico')
    await page.getByRole('button', { name: 'Iniciar diagnóstico' }).click()
    await page.getByRole('button', { name: /Folhas amarelas, pálidas ou deformadas/ }).click()
    await page.getByRole('button', { name: /Igual na área toda/ }).click()
    await page.getByRole('button', { name: /Nada de diferente/ }).click()
    const vistas: string[] = []
    for (let i = 0; i < 6; i++) {
      const titulo = (await page.getByRole('heading', { level: 2 }).first().textContent()) ?? ''
      if (/Qual foto mais se parece|Ainda não dá/.test(titulo)) break
      vistas.push(titulo)
      await page.getByRole('button', { name: 'Não consigo ver isso' }).click()
      await page.waitForTimeout(120)
    }
    expect(vistas.join('|')).not.toMatch(/herbicida foi|depois da aplicação|nasceram depois|desenho da aplicação/)
  })

  test('liga o diagnóstico ao ponto: guarda na Coleta, diagnostica e o ponto vira "Diagnosticado"', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/coleta')
    await page.getByLabel('Talhão', { exact: true }).selectOption({ label: 'T-04 Cabeceira' })
    await page.getByRole('button', { name: 'Não sei o que é' }).click()
    const dialogo = page.getByRole('dialog')
    const nome = dialogo.getByPlaceholder('Nome e sobrenome')
    if (await nome.isVisible()) await nome.fill('Aluno Teste')
    await dialogo.getByPlaceholder(/manchas marrons/).fill('pontinhos por baixo da folha')
    await dialogo.getByRole('button', { name: 'Guardar para diagnóstico' }).click()
    await page.getByRole('button', { name: 'Ponto 1, Aguardando diagnóstico' }).click()
    await page.getByRole('link', { name: 'Diagnosticar agora' }).click()
    await expect(page).toHaveURL(/#\/diagnostico/)
    // Vindo da Coleta, o questionário abre direto, já sabendo o talhão, a fase e o ponto.
    await expect(page.getByRole('heading', { level: 2, name: 'Onde está o problema?' })).toBeVisible()
    await expect(page.getByText(/T-04 Cabeceira · fase V5 · ponto 1/)).toBeVisible()
    await responderFunilFerrugem(page)
    await page.getByRole('button', { name: 'Salvar no ponto 1' }).click()
    const folha = page.getByRole('dialog')
    await expect(folha.getByText(/o achado que você guardou na Coleta/)).toBeVisible()
    await folha.getByRole('button', { name: 'Salvar no ponto 1' }).click()
    await expect(page).toHaveURL(/#\/coleta/)
    await expect(page.getByRole('button', { name: 'Ponto 1, Diagnosticado' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/Ferrugem-asiática · \d+% · (bem provável|provável|ainda incerto)/)).toBeVisible()
  })

  test('diagnóstico direto: salva o resultado num ponto escolhido, sem achado guardado', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/diagnostico')
    await page.getByRole('button', { name: 'Iniciar diagnóstico' }).click()
    await responderFunilFerrugem(page)
    await page.getByRole('button', { name: 'Salvar em um ponto' }).click()
    const folha = page.getByRole('dialog')
    await folha.getByLabel('Talhão').selectOption({ label: 'T-04 Cabeceira' })
    await folha.getByLabel('Ponto onde encontrou').selectOption({ label: 'Ponto 3' })
    const nome = folha.getByPlaceholder('Nome e sobrenome')
    if (await nome.isVisible()) await nome.fill('Aluno Teste')
    await folha.getByRole('button', { name: 'Salvar no ponto 3' }).click()
    await expect(page.getByRole('button', { name: 'Ponto 3, Diagnosticado' })).toBeVisible({ timeout: 15_000 })
  })

  test('achados guardados aparecem no início do diagnóstico e abrem o questionário com o ponto certo', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/coleta')
    await page.getByLabel('Talhão', { exact: true }).selectOption({ label: 'T-04 Cabeceira' })
    await page.getByRole('button', { name: 'Não sei o que é' }).click()
    const dialogo = page.getByRole('dialog')
    const nome = dialogo.getByPlaceholder('Nome e sobrenome')
    if (await nome.isVisible()) await nome.fill('Aluno Teste')
    await dialogo.getByRole('button', { name: 'Guardar para diagnóstico' }).click()
    await expect(dialogo).toBeHidden()
    await page.goto('/#/diagnostico')
    await expect(page.getByRole('heading', { name: /Achados aguardando diagnóstico \(1\)/ })).toBeVisible()
    await page.getByRole('button', { name: 'Diagnosticar o ponto 1 de T-04 Cabeceira' }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'Onde está o problema?' })).toBeVisible()
    await expect(page.getByText(/T-04 Cabeceira · fase V5 · ponto 1/)).toBeVisible()
  })

  test('enviar ao agrônomo: monta a mensagem com a hipótese, o que foi visto e a ressalva', async ({ page }) => {
    await page.addInitScript(() => {
      ;(navigator as unknown as { share: (d: { text: string }) => Promise<void> }).share = async (d) => { (window as unknown as { __enviado: string }).__enviado = d.text }
    })
    await carregarDemo(page)
    await page.goto('/#/diagnostico')
    await page.getByRole('button', { name: 'Iniciar diagnóstico' }).click()
    await responderFunilFerrugem(page)
    await page.getByRole('button', { name: 'Enviar ao agrônomo' }).click()
    const texto = await page.evaluate(() => (window as unknown as { __enviado?: string }).__enviado ?? '')
    expect(texto).toContain('Hipótese mais compatível: Ferrugem-asiática')
    expect(texto).toContain('Fazenda Santa Aurora')
    expect(texto).toContain('O que foi observado:')
    expect(texto).toMatch(/não um laudo/)
  })

  test('material do técnico fica numa página própria, fora do caminho de quem só quer diagnosticar', async ({ page }) => {
    await page.goto('/#/diagnostico')
    await expect(page.getByText('Árvores de decisão detalhadas')).toHaveCount(0)
    await page.getByRole('link', { name: /Material do técnico/ }).click()
    await expect(page).toHaveURL(/#\/diagnostico\/tecnico/)
    await expect(page.getByRole('heading', { name: 'Material do técnico' })).toBeVisible()
    await page.getByRole('radio', { name: 'Regras SE … ENTÃO' }).click()
    await expect(page.getByText('ENTÃO').first()).toBeVisible()
    await page.getByRole('link', { name: 'Voltar para Diagnóstico' }).click()
    await expect(page.getByRole('heading', { name: 'Diagnóstico', level: 1 })).toBeVisible()
  })

  test('salva um talhão com o nome sugerido, sem precisar digitar nada', async ({ page }) => {
    await page.goto('/#/talhoes/novo')
    const c = (await page.locator('.maplibregl-map').boundingBox())!
    for (const [fx, fy] of [[0.35, 0.35], [0.65, 0.35], [0.65, 0.65]] as const) await page.mouse.click(c.x + c.width * fx, c.y + c.height * fy)
    await page.getByRole('button', { name: 'Concluir', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar talhão e gerar plano' }).click()
    await expect(page.getByText(/Talhão 1 salvo com \d+ pontos/)).toBeVisible()
  })

  test('coleta guiada: "sem ocorrência" confirma o que gravou, fica no ponto e só avança quando a pessoa pede', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/coleta')
    await page.getByLabel('Talhão', { exact: true }).selectOption({ label: 'T-04 Cabeceira' })
    await expect(page.getByText('0 de 10 pontos coletados')).toBeVisible()
    await expect(page.getByText('Ponto 1 de 10')).toBeVisible()
    await page.getByRole('button', { name: 'Sem ocorrência' }).click()
    const nome = page.getByRole('dialog').getByPlaceholder('Nome e sobrenome')
    if (await nome.isVisible()) { await nome.fill('Aluno Teste'); await page.getByRole('button', { name: 'Continuar' }).click() }
    const conf = page.getByRole('region', { name: 'Registro salvo' })
    await expect(conf).toContainText('Ponto 1: sem ocorrência')
    await expect(page.getByText('1 de 10 pontos coletados')).toBeVisible()
    await expect(page.getByText('Ponto 1 de 10')).toBeVisible() // não pulou sozinho
    await conf.getByRole('button', { name: 'Próximo ponto' }).click()
    await expect(page.getByText('Ponto 2 de 10')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ponto 1, Sem ocorrência' })).toBeVisible()
  })

  test('coleta guiada: "não sei o que é" guarda o ponto para diagnóstico', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/coleta')
    await page.getByLabel('Talhão', { exact: true }).selectOption({ label: 'T-04 Cabeceira' })
    await page.getByRole('button', { name: 'Não sei o que é' }).click()
    const dialogo = page.getByRole('dialog')
    const nome = dialogo.getByPlaceholder('Nome e sobrenome')
    if (await nome.isVisible()) await nome.fill('Aluno Teste')
    await dialogo.getByPlaceholder(/manchas marrons/).fill('manchas nas folhas de baixo')
    await anexarFoto(page)
    await dialogo.getByRole('button', { name: 'Guardar para diagnóstico' }).click()
    await expect(page.getByText(/guardado para diagnóstico/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ponto 1, Aguardando diagnóstico' })).toBeVisible()
    await page.getByRole('button', { name: 'Ponto 1, Aguardando diagnóstico' }).click()
    await expect(page.getByRole('heading', { name: 'Achados deste ponto' })).toBeVisible()
  })

  test('mapa inteligente: leitura em texto, calor por alvo, linha do tempo, ficha do ponto e foto', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/')
    await page.getByRole('link', { name: /T-01 Mirante/ }).click()
    await expect(page).toHaveURL(/#\/talhoes\/T-01/)
    await expect(page.getByRole('tab', { name: 'Mapa inteligente' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('heading', { name: 'Leitura do mapa' })).toBeVisible()
    await expect(page.getByText(/pontos em atenção/).first()).toBeVisible()
    // O alvo dominante já vem escolhido, com o mapa de calor ligado.
    await expect(page.getByRole('button', { name: 'Percevejo-marrom', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('heading', { name: /Evolução · Percevejo-marrom/ })).toBeVisible()
    await page.getByRole('button', { name: 'Só pontos' }).click()
    await expect(page.getByRole('heading', { name: /Evolução/ })).toHaveCount(0)
    await expect(page.getByRole('slider', { name: /Visita/ })).toBeVisible()
    await page.getByRole('button', { name: /^Ponto 5,/ }).click()
    const ficha = page.getByRole('dialog')
    await expect(ficha.getByRole('heading', { name: 'Ponto 5' })).toBeVisible()
    await expect(ficha.getByText(/Percevejo-marrom/).first()).toBeVisible()
    // Foto direto da ficha do ponto: vira um achado aguardando diagnóstico.
    const fotosAntes = await ficha.getByRole('button', { name: 'Ampliar foto' }).count()
    await ficha.getByRole('button', { name: 'Adicionar foto' }).click()
    const nome = ficha.getByPlaceholder('Nome e sobrenome')
    if (await nome.isVisible()) await nome.fill('Aluno Teste')
    await anexarFoto(page)
    await ficha.getByRole('button', { name: 'Guardar para diagnóstico' }).click()
    await expect(ficha.getByText('Aguardando diagnóstico').first()).toBeVisible()
    await expect(ficha.getByRole('button', { name: 'Ampliar foto' })).toHaveCount(fotosAntes + 1)
  })

  test('Início mostra os talhões salvos com a análise de cada um', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/')
    for (const nome of ['T-01 Mirante', 'T-02 Baixada', 'T-03 Estrada', 'T-04 Cabeceira']) await expect(page.getByRole('link', { name: new RegExp(nome) })).toBeVisible()
    await expect(page.getByText(/concentrado no|no centro do talhão/).first()).toBeVisible()
  })

  test('tema escolhido no Perfil vale para o app e fica salvo', async ({ page }) => {
    await page.goto('/#/perfil')
    await page.getByRole('radio', { name: 'Escura' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })

  test('mapa inteligente: talhão sem coleta mostra orientação, não um mapa vazio', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/talhoes/T-04')
    await expect(page.getByText('Ainda não há coleta neste talhão')).toBeVisible()
  })

  test('início mostra uma única próxima ação e leva até ela', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/')
    await expect(page.getByText(/ponto(s)? para checar/)).toBeVisible()
    await page.getByRole('button', { name: 'Ver pontos' }).click()
    await expect(page).toHaveURL(/#\/alertas/)
  })

  test('início: o cartão do talhão sem coleta leva ao mapa com orientação', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/')
    await expect(page.getByRole('heading', { name: 'Seus talhões' })).toBeVisible()
    const card = page.getByRole('link', { name: /T-04 Cabeceira/ })
    await expect(card.getByText('Sem coleta')).toBeVisible()
    await card.click()
    await expect(page).toHaveURL(/#\/talhoes\/T-04/)
    await expect(page.getByText('Ainda não há coleta neste talhão')).toBeVisible()
  })

  test('perfil: sem exportação nem backup, com nome, GPS e demonstração', async ({ page }) => {
    await page.goto('/#/perfil')
    await expect(page.getByRole('heading', { name: 'Perfil', level: 1 })).toBeVisible()
    await expect(page.getByLabel('Usar GPS real')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Carregar demonstração' })).toBeVisible()
    await expect(page.getByText(/Backup|CSV|GeoJSON/)).toHaveCount(0)
  })

  test('mapa não "rouba" a rolagem da página: zoom por botões e Ctrl + roda', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/coleta')
    const mapa = page.locator('.maplibregl-map')
    await expect(mapa).toBeVisible()
    await page.waitForTimeout(1500)
    const c = (await mapa.boundingBox())!
    await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2)
    // Roda sem Ctrl: a página rola e o mapa avisa, sem dar zoom. O aviso dura ~1 s; em máquina lenta o teste pode perdê-lo,
    // então repete a rolagem até ver o aviso.
    await expect(async () => {
      await page.mouse.wheel(0, 300)
      await expect(page.locator('.maplibregl-cooperative-gesture-screen.maplibregl-show')).toHaveCount(1, { timeout: 1500 })
    }).toPass({ timeout: 20_000 })
    await page.waitForTimeout(3000)
    const antes = await mapa.screenshot()
    await page.getByRole('button', { name: 'Aproximar' }).click()
    await page.waitForTimeout(1200)
    expect((await mapa.screenshot()).equals(antes)).toBe(false)
  })

  test('pontos ficam presos às coordenadas ao dar zoom e o zoom tem limite', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/coleta')
    const mapa = page.locator('.maplibregl-map')
    const marca = page.locator('button.maplibregl-marker').first()
    await expect(marca).toBeVisible()
    await page.waitForTimeout(1500)
    await expect(marca).toHaveCSS('position', 'absolute') // posicionado pelo MapLibre, não pelo fluxo da página
    const deslocamento = async () => {
      const m = (await mapa.boundingBox())!
      const p = (await marca.boundingBox())!
      return { dx: p.x + p.width / 2 - (m.x + m.width / 2), dy: p.y + p.height / 2 - (m.y + m.height / 2) }
    }
    // Aproximar um nível dobra a distância entre o ponto e o centro do mapa: o ponto não "anda".
    const antes = await deslocamento()
    await page.getByRole('button', { name: 'Aproximar' }).click()
    await page.waitForTimeout(1200)
    const depois = await deslocamento()
    expect(Math.abs(depois.dx - 2 * antes.dx)).toBeLessThan(3)
    expect(Math.abs(depois.dy - 2 * antes.dy)).toBeLessThan(3)
    // O zoom para onde ainda há imagem de satélite (além disso o servidor devolve "Map data not yet available").
    const mais = page.getByRole('button', { name: 'Aproximar' })
    for (let i = 0; i < 8 && (await mais.isEnabled()); i++) { await mais.click(); await page.waitForTimeout(500) }
    await expect(mais).toBeDisabled()
  })

  test('plano: o número de pontos pode ser apagado e redigitado, com limite só ao sair do campo', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/talhoes/T-04')
    await page.getByRole('tab', { name: 'Plano de pontos' }).click()
    const pontos = page.getByLabel(/^Pontos/)
    await pontos.fill('') // apagar não pode "voltar" para o mínimo
    await expect(pontos).toHaveValue('')
    await pontos.pressSequentially('5')
    await expect(pontos).toHaveValue('5')
    await expect(page.getByText(/^5 pontos · caminhada/)).toBeVisible()
    await pontos.fill('12')
    await expect(page.getByText(/^12 pontos · caminhada/)).toBeVisible()
    await pontos.fill('2') // abaixo do mínimo: segue o texto digitado e ajusta ao sair
    await expect(pontos).toHaveValue('2')
    await pontos.blur()
    await expect(pontos).toHaveValue('3')
    await pontos.fill('') // vazio ao sair volta ao último valor válido
    await pontos.blur()
    await expect(pontos).toHaveValue('3')
    const borda = page.getByLabel(/^Bordadura/)
    await borda.fill('')
    await expect(borda).toHaveValue('')
    await borda.pressSequentially('40')
    await expect(borda).toHaveValue('40')
  })

  test('biblioteca: busca um assunto e abre o texto completo', async ({ page }) => {
    await page.goto('/#/biblioteca')
    await page.getByRole('searchbox', { name: 'Buscar na biblioteca' }).fill('ferrugem')
    await expect(page.getByRole('link', { name: /Ferrugem-asiática/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Percevejo/ })).toHaveCount(0)
    await page.getByRole('link', { name: /Ferrugem-asiática/ }).click()
    await expect(page).toHaveURL(/#\/biblioteca\/ferrugem/)
    await expect(page.getByRole('heading', { name: 'Como coletar' })).toBeVisible() // ferrugem é monitorada pelo app
    await expect(page.getByRole('heading', { name: 'Como reconhecer' })).toBeVisible()
  })

  test('biblioteca: traz todos os assuntos do diagnóstico, com filtros e texto de cada um', async ({ page }) => {
    await page.goto('/#/biblioteca')
    const cards = page.getByRole('main').getByRole('link').filter({ hasText: /Praga|Doença|Falta de nutriente|Produto ou adubo|Clima ou solo/ })
    expect(await cards.count()).toBeGreaterThanOrEqual(30)
    await page.getByRole('button', { name: 'Nutrientes' }).click()
    await expect(page.getByRole('link', { name: /Falta de manganês/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Ferrugem/ })).toHaveCount(0)
    await page.getByRole('button', { name: 'Produtos e adubo' }).click()
    await expect(page.getByRole('link', { name: /herbicida hormonal/ })).toBeVisible()
    await page.getByRole('button', { name: 'Tudo' }).click()
    await page.getByRole('searchbox', { name: 'Buscar na biblioteca' }).fill('manganês')
    await page.getByRole('link', { name: /Falta de manganês/ }).click()
    await expect(page.getByRole('heading', { name: 'Como reconhecer' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'O que fazer' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Como coletar' })).toHaveCount(0) // não é alvo de coleta
    await expect(page.getByText(/em conferência com agrônomo/)).toBeVisible()
  })

  test('o resultado do diagnóstico leva ao texto do problema na Biblioteca', async ({ page }) => {
    await page.goto('/#/biblioteca/def_mn')
    await expect(page.getByRole('heading', { name: 'Falta de manganês', level: 1 })).toBeVisible()
    await page.goto('/#/biblioteca/ferrugem-asiatica') // link antigo continua funcionando
    await expect(page.getByRole('heading', { name: 'Ferrugem-asiática', level: 1 })).toBeVisible()
  })

  test('não apresenta recomendação de aplicar defensivo em nenhuma tela', async ({ page }) => {
    await carregarDemo(page)
    for (const rota of ['/', '/talhoes', '/coleta', '/alertas', '/diagnostico', '/biblioteca', '/perfil']) {
      await page.goto(`/#${rota}`)
      await page.waitForLoadState('networkidle')
      const texto = (await page.locator('body').innerText()).toLowerCase()
      expect(texto, rota).not.toMatch(/\b(aplique|aplicar agora|recomenda-se aplicar|pulverize)\b/)
    }
  })
})
