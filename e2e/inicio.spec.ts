import { expect, test, type Page } from '@playwright/test'
import { carregarDemo } from './ajuda'

const NOME_60 = 'Agropecuária Santa Aurora do Vale dos Ipês Roxos e Amarelos' // ~60

async function cadastrar(page: Page, nome: string) {
  await page.goto('/#/perfil')
  await page.getByLabel('Nome da fazenda').fill(nome)
  await page.getByLabel('Município').fill('Lucas do Rio Verde')
  await page.getByLabel('Proprietário (opcional)').fill('Fulano')
  await page.getByRole('button', { name: 'Salvar fazenda' }).click()
  await expect(page.getByText('Fazenda salva')).toBeVisible()
}

test.describe('tela inicial', () => {
  test('sem fazenda cadastrada, convida a cadastrar e o texto fixo não aparece', async ({ page }) => {
    await page.goto('/#/')
    await expect(page.getByRole('link', { name: /Cadastre sua fazenda/ })).toBeVisible()
    await expect(page.getByText('Santa Aurora')).toHaveCount(0)
    await page.getByRole('link', { name: /Cadastre sua fazenda/ }).click()
    await expect(page).toHaveURL(/#\/perfil/)
  })

  test('mostra saudação, data por extenso, fazenda e faixa de contexto', async ({ page }) => {
    await carregarDemo(page)
    await cadastrar(page, 'Fazenda Boa Esperança')
    await page.goto('/#/')
    await expect(page.getByRole('heading', { level: 1, name: 'Fazenda Boa Esperança' })).toBeVisible()
    await expect(page.getByText(/^(Bom dia|Boa tarde|Boa noite|Boa madrugada)/).first()).toBeVisible()
    await expect(page.getByText(/-feira, \d{1,2} de \w+ de \d{4}|sábado, |domingo, /).first()).toBeVisible()
    const ctx = page.getByTestId('contexto-fazenda')
    await expect(ctx).toContainText('Lucas do Rio Verde · MT')
    await expect(ctx).toContainText(/Safra \d{2}\/\d{2}/)
    await expect(ctx).toContainText('4 talhões')
    await expect(ctx).toContainText(/\d+ ha/)
    await expect(page.getByRole('link', { name: /Cadastre sua fazenda/ })).toHaveCount(0)
  })

  test('o rótulo "(demo)" não aparece na cultivar dos talhões', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/')
    await expect(page.getByRole('heading', { name: 'Seus talhões' })).toBeVisible()
    await expect(page.getByText('(demo)')).toHaveCount(0)
  })

  for (const [largura, altura] of [[360, 640], [390, 844], [412, 915], [768, 1024], [1280, 800]] as const) {
    test(`nada truncado nem estourando em ${largura}×${altura}, com nome de 60 caracteres`, async ({ page }) => {
      await page.setViewportSize({ width: largura, height: altura })
      await carregarDemo(page)
      await cadastrar(page, NOME_60)
      await page.goto('/#/')
      const h1 = page.getByRole('heading', { level: 1 })
      await expect(h1).toHaveText(NOME_60)
      // Cabe em até 2 linhas e nenhuma palavra fica cortada.
      const m = await h1.evaluate((el) => {
        const cs = getComputedStyle(el)
        const lh = parseFloat(cs.lineHeight)
        return { linhas: Math.round(el.getBoundingClientRect().height / lh), cortado: el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1 }
      })
      expect(m.linhas).toBeLessThanOrEqual(2)
      expect(m.cortado).toBe(false)
      // A página não rola para o lado.
      const estoura = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
      expect(estoura).toBe(false)
      // O botão da próxima ação cabe na tela e tem alvo de toque ≥ 44 px.
      const botao = page.getByRole('region', { name: 'Próxima ação' }).getByRole('button')
      const caixa = (await botao.boundingBox())!
      expect(caixa.height).toBeGreaterThanOrEqual(44)
      expect(caixa.x + caixa.width).toBeLessThanOrEqual(largura)
      if (largura < 380) {
        const sec = (await page.getByRole('region', { name: 'Próxima ação' }).boundingBox())!
        expect(caixa.width).toBeGreaterThan(sec.width * 0.8) // botão em largura total, abaixo do texto
      }
      // Os metadados do talhão não quebram no meio ("84 ha" fica junto).
      const ha = page.getByRole('link', { name: /T-01 Mirante/ }).getByText(/^\d+ ha · R\d$/)
      const altHa = await ha.evaluate((el) => el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight))
      expect(Math.round(altHa)).toBe(1)
    })
  }
})
