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

test('questionário e resultado do diagnóstico não têm violações WCAG 2.1 AA', async ({ page }) => {
  await carregarDemo(page)
  await page.goto('/#/diagnostico')
  await page.getByRole('button', { name: 'Começar' }).click()
  await page.getByRole('heading', { level: 2, name: 'Onde está o problema?' }).waitFor()
  const pergunta = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(pergunta.violations.map((v) => `pergunta ${v.id}: ${v.nodes[0]?.target.join(' ')}`)).toEqual([])
  const passos: [RegExp, RegExp][] = [[/Onde está/, /Manchas ou pontos nas folhas/], [/aparece no terreno/, /manchas redondas/], [/O que aconteceu na lavoura/, /Muita chuva/], [/Como são as marcas/, /Pontinhos ou pústulas por baixo/], [/Em que altura/, /Folhas de baixo/], [/Vire a folha/, /Pontinhos em relevo/], [/Como o problema andou/, /Está aumentando/]]
  const salvar = page.getByRole('button', { name: /^Salvar (em um|no) ponto/ })
  for (let i = 0; i < 16 && !(await salvar.first().isVisible()); i++) {
    const t = (await page.getByRole('heading', { level: 2 }).first().textContent()) ?? ''
    const par = passos.find(([q]) => q.test(t))
    if (/Qual foto mais se parece/.test(t)) {
      const fotos = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
      expect(fotos.violations.map((v) => `fotos ${v.id}: ${v.nodes[0]?.target.join(' ')}`)).toEqual([])
      await page.getByRole('button', { name: /Ferrugem-asiática/ }).click()
    } else await (par ? page.getByRole('button', { name: par[1] }) : page.getByRole('button', { name: 'Não consigo ver isso' })).click()
    await page.waitForTimeout(150)
  }
  await salvar.first().waitFor()
  await page.getByText('Como o app chegou a esse resultado').click()
  const resultado = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(resultado.violations.map((v) => `resultado ${v.id}: ${v.nodes[0]?.target.join(' ')}`)).toEqual([])
  await salvar.first().click()
  await page.getByRole('dialog').waitFor()
  const folha = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).include('dialog').analyze()
  expect(folha.violations.map((v) => `folha ${v.id}: ${v.nodes[0]?.target.join(' ')}`)).toEqual([])
})
