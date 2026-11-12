import { expect, test, type Page } from '@playwright/test'
import { carregarDemo } from './ajuda'

async function definirNome(page: Page, nome: string) {
  await page.goto('/#/perfil')
  await page.getByLabel('Seu nome').fill(nome)
}

test.describe('tela inicial', () => {
  test('a fazenda é fixa (a do projeto): aparece pequena no topo e não há cadastro nem aviso para cadastrar', async ({ page }) => {
    await page.goto('/#/')
    await expect(page.getByText('Fazenda Santa Aurora')).toBeVisible()
    await expect(page.getByText(/Cadastre sua fazenda/)).toHaveCount(0)
    await page.goto('/#/perfil')
    await expect(page.getByRole('heading', { name: 'Fazenda', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Salvar fazenda' })).toHaveCount(0)
  })

  test('mostra uma saudação grande e uma única linha de data curta, sem faixa de contexto', async ({ page }) => {
    await carregarDemo(page)
    await definirNome(page, 'Saulo Teste')
    await page.goto('/#/')
    const h1 = page.getByRole('heading', { level: 1 })
    await expect(h1).toHaveText(/^(Bom dia|Boa tarde|Boa noite|Boa madrugada), Saulo$/)
    await expect(page.getByText(/^(domingo|segunda-feira|terça-feira|quarta-feira|quinta-feira|sexta-feira|sábado), \d{1,2} de [a-zç]+$/i)).toBeVisible()
    // Nada da faixa antiga (município, UF, safra, contagem e área).
    await expect(page.getByText(/Lucas do Rio Verde/)).toHaveCount(0)
    await expect(page.getByText(/Safra \d{2}\/\d{2}/)).toHaveCount(0)
    // A saudação é a maior letra da tela: pelo menos 28 px.
    const tamanho = await h1.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
    expect(tamanho).toBeGreaterThanOrEqual(28)
  })

  test('sem nome cadastrado, a saudação vem sem vírgula', async ({ page }) => {
    await page.goto('/#/')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^(Bom dia|Boa tarde|Boa noite|Boa madrugada)$/)
  })

  test('o rótulo "(demo)" não aparece na cultivar dos talhões', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/')
    await expect(page.getByRole('heading', { name: 'Seus talhões' })).toBeVisible()
    await expect(page.getByText('(demo)')).toHaveCount(0)
  })

  test('o texto de apoio e os rótulos ficaram maiores (15 px e 13 px)', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/')
    const apoio = await page.locator('.text-apoio').first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
    expect(apoio).toBeCloseTo(15, 0)
    const rotulo = await page.locator('.text-rotulo').first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
    expect(rotulo).toBeCloseTo(13, 0)
  })

  for (const [largura, altura] of [[360, 640], [390, 844], [412, 915], [768, 1024], [1280, 800]] as const) {
    test(`nada truncado nem estourando em ${largura}×${altura}`, async ({ page }) => {
      await page.setViewportSize({ width: largura, height: altura })
      await carregarDemo(page)
      await definirNome(page, 'Saulo Teste')
      await page.goto('/#/')
      const h1 = page.getByRole('heading', { level: 1 })
      await expect(h1).toBeVisible()
      // A saudação cabe em até 2 linhas, sem cortar.
      const m = await h1.evaluate((el) => {
        const lh = parseFloat(getComputedStyle(el).lineHeight)
        return { linhas: Math.round(el.getBoundingClientRect().height / lh), cortado: el.scrollWidth > el.clientWidth + 1 }
      })
      expect(m.linhas).toBeLessThanOrEqual(2)
      expect(m.cortado).toBe(false)
      // O nome da fazenda cabe numa linha, inteiro.
      const fazenda = page.getByText('Fazenda Santa Aurora')
      const cortada = await fazenda.evaluate((el) => el.scrollWidth > el.clientWidth + 1)
      expect(cortada).toBe(false)
      // A página não rola para o lado.
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false)
      // O botão da próxima ação cabe na tela e tem alvo de toque ≥ 44 px (com folga de arredondamento).
      const botao = page.getByRole('region', { name: 'Próxima ação' }).getByRole('button')
      const caixa = (await botao.boundingBox())!
      expect(caixa.height).toBeGreaterThanOrEqual(43.9)
      expect(caixa.x + caixa.width).toBeLessThanOrEqual(largura + 0.5)
      if (largura < 480) {
        const sec = (await page.getByRole('region', { name: 'Próxima ação' }).boundingBox())!
        expect(caixa.width).toBeGreaterThan(sec.width * 0.8) // botão em largura total, abaixo do texto
      }
      // Os dados do talhão não quebram no meio ("84 ha · R3" fica junto).
      const ha = page.getByRole('link', { name: /T-01 Mirante/ }).getByText(/^\d+ ha · R\d$/)
      const linhasHa = await ha.evaluate((el) => el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight))
      expect(Math.round(linhasHa)).toBe(1)
    })
  }
})
