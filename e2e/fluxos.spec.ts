import { expect, test, type Page } from '@playwright/test'
import { anexarFoto, carregarDemo } from './ajuda'

/** Responde o funil como quem vê ferrugem: pústulas por baixo das folhas de baixo, sem bicho nem mofo. */
async function responderFunilFerrugem(page: Page) {
  const RESP: [RegExp, RegExp][] = [
    [/Onde está o problema/, /Manchas ou pontos nas folhas/],
    [/Como são as marcas/, /Pontinhos ou pústulas por baixo/],
    [/Em que altura/, /Folhas de baixo/],
    [/algum bicho/, /Nenhum bicho/],
    [/algo branco, preto ou escuro/, /Nada disso/],
    [/vagens e os grãos/, /Parecem normais/],
    [/raiz e a haste/, /Parecem normais/],
    [/aparece no terreno/, /manchas redondas/],
  ]
  for (let i = 0; i < 10; i++) {
    if (await page.getByText('Resultado', { exact: true }).isVisible()) return
    const titulo = (await page.getByRole('heading', { level: 2, name: /\?$/ }).first().textContent()) ?? ''
    const par = RESP.find(([q]) => q.test(titulo))
    await (par ? page.getByRole('button', { name: par[1] }) : page.getByRole('button', { name: 'Não sei responder' })).click()
  }
}

test.describe('fluxos de negócio', () => {
  test('registra um ponto com foto em modo sala de aula', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/coleta')
    await page.getByRole('button', { name: 'Registrar achado' }).click()
    const dialogo = page.getByRole('dialog')
    await expect(dialogo.getByText('Posição simulada (sala de aula)')).toBeVisible()
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
    await page.goto('/#/talhoes')
    await page.getByRole('button', { name: 'Desenhar talhão' }).click()
    const mapa = page.locator('.maplibregl-map')
    const caixa = (await mapa.boundingBox())!
    for (const [fx, fy] of [[0.3, 0.3], [0.7, 0.3], [0.7, 0.7], [0.3, 0.7]] as const) {
      await page.mouse.click(caixa.x + caixa.width * fx, caixa.y + caixa.height * fy)
    }
    await page.getByRole('button', { name: 'Concluir contorno' }).click()
    const dialogo = page.getByRole('dialog')
    await dialogo.getByPlaceholder('Ex.: T-05 Sede').fill('T-99 Teste')
    await dialogo.getByRole('button', { name: 'Salvar talhão e gerar plano' }).click()
    await expect(page.getByText('T-99 Teste').first()).toBeVisible()
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

  test('funil de diagnóstico: chega a um resultado com compatibilidade, passos e ressalva', async ({ page }) => {
    await page.goto('/#/diagnostico')
    await responderFunilFerrugem(page)
    await expect(page.getByRole('heading', { name: /Ferrugem-asiática é o mais compatível/ })).toBeVisible()
    await expect(page.getByText(/Compatibilidade (alta|média|baixa)/)).toBeVisible()
    await expect(page.getByText(/Não é uma probabilidade medida nem um laudo/)).toBeVisible()
    await expect(page.getByText('Quem decide se aplica algum produto é o agrônomo.')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'O que fazer agora' }).first()).toBeVisible()
    await page.getByRole('button', { name: 'Voltar' }).first().click()
    await expect(page.getByText(/Pergunta \d+/)).toBeVisible()
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
    await expect(page.getByRole('heading', { name: /Achados aguardando diagnóstico/ })).toBeVisible()
    await responderFunilFerrugem(page)
    await page.getByRole('button', { name: 'Anexar ao ponto 1' }).click()
    await expect(page).toHaveURL(/#\/coleta/)
    await expect(page.getByRole('button', { name: 'Ponto 1, Diagnosticado' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/Ferrugem-asiática · \d+%/)).toBeVisible()
  })

  test('diagnóstico direto: anexa o resultado a um ponto escolhido, sem achado guardado', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/diagnostico')
    await responderFunilFerrugem(page)
    await page.getByLabel('Talhão', { exact: true }).selectOption({ label: 'T-04 Cabeceira' })
    await page.getByLabel('Ponto onde encontrou').selectOption({ label: 'Ponto 3' })
    const nome = page.getByPlaceholder('Nome e sobrenome')
    if (await nome.isVisible()) await nome.fill('Aluno Teste')
    await page.getByRole('button', { name: 'Anexar ao ponto 3' }).click()
    await expect(page.getByRole('button', { name: 'Ponto 3, Diagnosticado' })).toBeVisible({ timeout: 15_000 })
  })

  test('salva um talhão com o nome sugerido, sem precisar digitar nada', async ({ page }) => {
    await page.goto('/#/talhoes')
    await page.getByRole('button', { name: 'Desenhar talhão' }).click()
    const c = (await page.locator('.maplibregl-map').boundingBox())!
    for (const [fx, fy] of [[0.35, 0.35], [0.65, 0.35], [0.65, 0.65]] as const) await page.mouse.click(c.x + c.width * fx, c.y + c.height * fy)
    await page.getByRole('button', { name: 'Concluir contorno' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Salvar talhão e gerar plano' }).click()
    await expect(page.getByText(/Talhão 1 salvo com \d+ pontos/)).toBeVisible()
  })

  test('coleta guiada: "sem ocorrência" em um toque avança para o próximo ponto', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/coleta')
    await page.getByLabel('Talhão', { exact: true }).selectOption({ label: 'T-04 Cabeceira' })
    await expect(page.getByText('0 de 10 pontos coletados')).toBeVisible()
    await expect(page.getByText('Ponto 1 de 10')).toBeVisible()
    await page.getByRole('button', { name: 'Sem ocorrência' }).click()
    const nome = page.getByRole('dialog').getByPlaceholder('Nome e sobrenome')
    if (await nome.isVisible()) { await nome.fill('Aluno Teste'); await page.getByRole('button', { name: 'Continuar' }).click() }
    await expect(page.getByText('1 de 10 pontos coletados')).toBeVisible()
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

  test('mapa inteligente: resumo, filtro por alvo com mapa de calor, linha do tempo e cartão do ponto', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/talhoes')
    await page.getByRole('radio', { name: 'Resultados' }).click()
    await expect(page.getByRole('heading', { name: 'Resumo do talhão' })).toBeVisible()
    await expect(page.getByText(/dos pontos com ocorrência/)).toBeVisible()
    await expect(page.getByText(/Escolha um alvo acima/)).toBeVisible()
    await page.getByRole('button', { name: 'Percevejo-marrom', exact: true }).click()
    await expect(page.getByText(/cores mais fortes indicam valores mais altos/)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Evolução no tempo' })).toBeVisible()
    await expect(page.getByRole('slider', { name: /Visita/ })).toBeVisible()
    await page.getByRole('button', { name: /^Ponto 5,/ }).click()
    await expect(page.getByRole('heading', { name: 'Ponto 5' })).toBeVisible()
    await expect(page.getByText(/Percevejo-marrom/).first()).toBeVisible()
  })

  test('mapa inteligente: talhão sem coleta mostra orientação, não um mapa vazio', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/talhoes')
    await page.getByRole('button', { name: 'T-04 Cabeceira' }).click()
    await page.getByRole('radio', { name: 'Resultados' }).click()
    await expect(page.getByText('Ainda não há coleta neste talhão')).toBeVisible()
  })

  test('início mostra uma única próxima ação e leva até ela', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/')
    await expect(page.getByText('Agora', { exact: true })).toBeVisible()
    await expect(page.getByText(/ponto(s)? para checar/)).toBeVisible()
    await page.getByRole('button', { name: 'Ver pontos' }).click()
    await expect(page).toHaveURL(/#\/alertas/)
  })

  test('início: cada talhão tem Coletar e Ver mapa', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/')
    await expect(page.getByRole('heading', { name: 'Seus talhões' })).toBeVisible()
    const card = page.getByRole('listitem').filter({ hasText: 'T-04 Cabeceira' })
    await expect(card.getByText('Ainda não coletado')).toBeVisible()
    await card.getByRole('button', { name: 'Ver mapa' }).click()
    await expect(page).toHaveURL(/#\/talhoes/)
    await expect(page.getByText('Ainda não há coleta neste talhão')).toBeVisible()
  })

  test('perfil: sem exportação nem backup, com nome, GPS e demonstração', async ({ page }) => {
    await page.goto('/#/perfil')
    await expect(page.getByRole('heading', { name: 'Perfil', level: 1 })).toBeVisible()
    await expect(page.getByLabel('Usar GPS real')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Carregar demonstração' })).toBeVisible()
    await expect(page.getByText(/Backup|CSV|GeoJSON/)).toHaveCount(0)
  })

  test('mapa fica fixo no talhão selecionado e só é livre ao desenhar um novo', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/coleta')
    const mapa = page.locator('.maplibregl-map')
    await expect(mapa).toBeVisible()
    await expect(page.locator('.maplibregl-ctrl-zoom-in')).toHaveCount(0)
    const antes = await mapa.evaluate((el) => el.querySelector('canvas')!.toDataURL().length)
    const c = (await mapa.boundingBox())!
    await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2)
    await page.mouse.down()
    await page.mouse.move(c.x + c.width / 2 - 120, c.y + c.height / 2 - 80, { steps: 8 })
    await page.mouse.up()
    await page.mouse.wheel(0, -600)
    await page.waitForTimeout(600)
    expect(await mapa.evaluate((el) => el.querySelector('canvas')!.toDataURL().length)).toBe(antes)
    await page.goto('/#/talhoes')
    await page.getByRole('button', { name: 'Novo talhão' }).click()
    await expect(page.locator('.maplibregl-ctrl-zoom-in')).toHaveCount(1)
  })

  test('biblioteca: busca um assunto e abre o texto completo', async ({ page }) => {
    await page.goto('/#/biblioteca')
    await page.getByRole('searchbox', { name: 'Buscar na biblioteca' }).fill('ferrugem')
    await expect(page.getByRole('link', { name: /Ferrugem-asiática/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Percevejo/ })).toHaveCount(0)
    await page.getByRole('link', { name: /Ferrugem-asiática/ }).click()
    await expect(page).toHaveURL(/#\/biblioteca\/ferrugem-asiatica/)
    await expect(page.getByRole('heading', { name: 'Como coletar' })).toBeVisible()
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
