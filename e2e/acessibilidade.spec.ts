import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { carregarDemo, ROTAS } from './ajuda'

for (const tema of ['light', 'dark'] as const) {
  test.describe(`acessibilidade · tema ${tema}`, () => {
    test.use({ colorScheme: tema })
    for (const rota of ROTAS) {
      test(`sem violações WCAG 2.1 AA em ${rota}`, async ({ page }) => {
        await carregarDemo(page)
        await page.goto(`/#${rota}`)
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(400)
        const r = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          // O mapa MapLibre (tiles de terceiros) não é conteúdo nosso; os controles dele são verificados à parte.
          .exclude('.maplibregl-map')
          .analyze()
        const resumo = r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} elemento(s) · ${v.nodes[0]?.target.join(' ')}`)
        expect(resumo).toEqual([])
      })
    }
  })
}

test('formulário de registro aberto não tem violações WCAG 2.1 AA', async ({ page }) => {
  await carregarDemo(page)
  await page.goto('/#/coleta')
  await page.getByRole('button', { name: 'Registrar achado' }).click()
  await page.getByRole('dialog').waitFor()
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).include('dialog').analyze()
  expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`)).toEqual([])
})

test('formulário de diagnóstico pendente aberto não tem violações WCAG 2.1 AA', async ({ page }) => {
  await carregarDemo(page)
  await page.goto('/#/coleta')
  await page.getByRole('button', { name: 'Não sei o que é' }).click()
  await page.getByRole('dialog').waitFor()
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).include('dialog').analyze()
  expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`)).toEqual([])
})

test('mapa inteligente (detalhe do talhão) não tem violações WCAG 2.1 AA', async ({ page }) => {
  await carregarDemo(page)
  await page.goto('/#/talhoes/T-01')
  await page.getByRole('heading', { name: 'Leitura do mapa' }).waitFor()
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('.maplibregl-map').analyze()
  expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`)).toEqual([])
})

test('ficha do ponto aberta não tem violações WCAG 2.1 AA', async ({ page }) => {
  await carregarDemo(page)
  await page.goto('/#/talhoes/T-01')
  await page.getByRole('button', { name: /^Ponto 5,/ }).click()
  await page.getByRole('dialog').waitFor()
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).include('dialog').analyze()
  expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`)).toEqual([])
})
