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
    await page.goto('/#/talhoes/novo')
    const c = (await page.locator('.maplibregl-map').boundingBox())!
    for (const [fx, fy] of [[0.35, 0.35], [0.65, 0.35], [0.65, 0.65]] as const) await page.mouse.click(c.x + c.width * fx, c.y + c.height * fy)
    await page.getByRole('button', { name: 'Concluir', exact: true }).click()
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
    await page.mouse.wheel(0, 300) // roda sem Ctrl: a página rola e o mapa avisa, sem dar zoom
    await expect(page.locator('.maplibregl-cooperative-gesture-screen.maplibregl-show')).toHaveCount(1)
    await page.waitForTimeout(3000)
    const antes = await mapa.screenshot()
    await page.getByRole('button', { name: 'Aproximar' }).click()
    await page.waitForTimeout(1200)
    expect((await mapa.screenshot()).equals(antes)).toBe(false)
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
