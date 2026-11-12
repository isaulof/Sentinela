import { expect, test, type Page } from '@playwright/test'
import { carregarDemo, esperarAnimacoes } from './ajuda'

async function abrirMapaT01(page: Page) {
  await carregarDemo(page)
  await page.goto('/#/talhoes/T-01')
  await expect(page.getByRole('button', { name: 'Percevejo-marrom', exact: true })).toHaveAttribute('aria-pressed', 'true')
}

test.describe('mapa inteligente v2', () => {
  test('com poucos pontos não desenha calor e explica por quê (o talhão inteiro não é pintado)', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/coleta')
    await page.getByLabel('Talhão', { exact: true }).selectOption({ label: 'T-04 Cabeceira' })
    await expect(page.getByText('0 de 10 pontos coletados')).toBeVisible()
    await page.getByRole('button', { name: 'Sem ocorrência', exact: true }).click()
    const nome = page.getByRole('dialog').getByPlaceholder('Nome e sobrenome')
    if (await nome.isVisible()) { await nome.fill('Ana Teste'); await page.getByRole('button', { name: 'Continuar' }).click() }
    await expect(page.getByRole('region', { name: 'Registro salvo' })).toBeVisible()
    await page.goto('/#/talhoes/T-04')
    await page.getByRole('button', { name: 'Percevejo-marrom', exact: true }).click()
    const aviso = page.getByRole('status').filter({ hasText: 'Sem mapa de calor' })
    await expect(aviso).toContainText('Só 1 ponto tem leitura')
    await expect(aviso).toContainText('pelo menos 3')
  })

  test('a legenda do calor tem números: escala, unidade, nível de ação e cobertura', async ({ page }) => {
    await abrirMapaT01(page)
    const legenda = page.getByText(/Escala de 0 a/)
    await expect(legenda).toContainText(/Escala de 0 a \d+ perc\.\/m/)
    await expect(legenda).toContainText(/maior valor já registrado é \d+/)
    await expect(page.getByText(/Tem dado em \d+% do talhão/)).toBeVisible()
    await expect(page.getByText('nível de ação').first().or(page.getByText(/Nível de ação: \d+/)).first()).toBeVisible()
  })

  test('a escala é a mesma em todas as visitas, para poder comparar', async ({ page }) => {
    await abrirMapaT01(page)
    const escala = async () => (await page.getByText(/Escala de 0 a/).textContent())!.match(/Escala de 0 a (\d+)/)![1]
    await page.getByRole('button', { name: 'Percevejo-marrom', exact: true }).click() // fixa o alvo (sem isso ele acompanha o "dominante" de cada visita)
    const ultima = await escala()
    await page.getByRole('slider', { name: /Visita/ }).fill('0')
    await expect(page.getByText(/Visita de 0[0-9]\/\d{2}\/\d{4}/).first()).toBeVisible()
    expect(await escala()).toBe(ultima)
  })

  test('camada Mudança mostra o que piorou, melhorou ou não foi revisitado, e a legenda explica', async ({ page }) => {
    await abrirMapaT01(page)
    await page.getByRole('radio', { name: 'Mudança' }).click()
    const leg = page.getByText(/Mudança desde a visita de \d{2}\/\d{2}\/\d{4}/)
    await expect(leg).toBeVisible()
    await expect(page.getByText(/"Sem nova leitura" é diferente de "igual"/)).toBeVisible()
    // Os marcadores ganham o nome da mudança e o valor antes e depois.
    await expect(page.getByRole('button', { name: /^Ponto \d+, (Piorou|Melhorou|Igual) \(de \d+ para \d+\)/ }).first()).toBeVisible()
  })

  test('Mudança fica desativada quando só há uma visita', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/talhoes/T-03')
    await expect(page.getByRole('button', { name: 'Mancha-alvo', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('radio', { name: 'Mudança' })).toBeDisabled()
  })

  test('Valores nos pontos troca o número do ponto pelo valor lido, sem perder o nome acessível', async ({ page }) => {
    await abrirMapaT01(page)
    const ponto = page.getByRole('button', { name: /^Ponto 1,/ })
    await expect(ponto).toHaveText('1')
    await page.getByRole('button', { name: 'Valores nos pontos' }).click()
    await expect(ponto).toHaveText(/^\d+(,\d)?$/)
    await expect(ponto).toHaveAccessibleName(/^Ponto 1,/)
    await page.getByRole('button', { name: 'Valores nos pontos' }).click()
    await expect(ponto).toHaveText('1')
  })

  test('painel de análise: estatística, foco, tendência, distribuição, tabela ponto × visita e as contas', async ({ page }) => {
    await abrirMapaT01(page)
    const analise = page.getByRole('region', { name: 'Análise de Percevejo-marrom' }).or(page.locator('[aria-label="Análise de Percevejo-marrom"]'))
    await expect(analise.getByRole('heading', { name: /Análise · Percevejo-marrom/ })).toBeVisible()
    for (const k of ['Pontos', 'Média', 'Mediana', 'Máximo', 'Desvio']) await expect(analise.getByText(k, { exact: true })).toBeVisible()
    await expect(analise.getByRole('heading', { name: 'Foco no talhão' })).toBeVisible()
    await expect(analise.getByRole('heading', { name: 'Tendência' })).toBeVisible()
    await expect(analise.getByText(/Subindo|Caindo|Estável/)).toBeVisible()
    await expect(analise.getByRole('heading', { name: 'Pontos por nível' })).toBeVisible()
    await analise.getByText(/Tabela ponto × visita/).click()
    const tabela = analise.getByRole('region', { name: /Tabela ponto por visita/ })
    await expect(tabela.getByRole('row')).not.toHaveCount(1)
    await analise.getByText('Como estes indicadores são calculados').click()
    await expect(analise.getByText(/índice de Moran I/)).toBeVisible()
    await expect(analise.getByText(/inverso da distância ao quadrado/)).toBeVisible()
  })

  test('qualidade dos dados: avisa que as posições da demonstração são simuladas', async ({ page }) => {
    await abrirMapaT01(page)
    const q = page.getByRole('list', { name: 'Alertas de qualidade dos dados' })
    await expect(q).toContainText(/posição simulada/)
  })

  test('relatório e mapa não têm violações de acessibilidade nas novas camadas', async ({ page }) => {
    const AxeBuilder = (await import('@axe-core/playwright')).default
    await abrirMapaT01(page)
    await page.getByRole('radio', { name: 'Mudança' }).click()
    await page.getByRole('button', { name: 'Valores nos pontos' }).click()
    await page.waitForTimeout(500)
    await esperarAnimacoes(page)
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('.maplibregl-map').analyze()
    expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`)).toEqual([])
  })
})
