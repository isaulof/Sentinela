import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { carregarDemo } from './ajuda'

/** Posição planejada de um ponto, lida do IndexedDB (é de onde o app tira o destino do guia). */
async function posicaoDoPonto(page: Page, talhaoId: string, ordem: number): Promise<{ lat: number; lng: number }> {
  const [lng, lat] = await page.evaluate(
    ([t, o]) => new Promise<[number, number]>((ok, erro) => {
      const abrir = indexedDB.open('sentinela')
      abrir.onerror = () => erro(abrir.error)
      abrir.onsuccess = () => {
        const r = abrir.result.transaction('planos').objectStore('planos').get(t as string)
        r.onerror = () => erro(r.error)
        r.onsuccess = () => ok((r.result.pontos as { order: number; position: [number, number] }[]).find((p) => p.order === o)!.position)
      }
    }),
    [talhaoId, ordem] as const,
  )
  return { lat, lng }
}

const metrosAoNorte = (p: { lat: number; lng: number }, m: number) => ({ latitude: p.lat + m / 110_574, longitude: p.lng, accuracy: 6 })

test.describe('guia até o ponto (GPS)', () => {
  test.use({ permissions: ['geolocation'], geolocation: { latitude: -13.25, longitude: -55.8, accuracy: 6 } })

  async function abrirColetaDoT04(page: Page) {
    await carregarDemo(page)
    await page.goto('/#/coleta')
    await page.getByLabel('Talhão', { exact: true }).selectOption({ label: 'T-04 Cabeceira' })
    await expect(page.getByText('Ponto 1 de 10')).toBeVisible()
  }

  test('mostra distância, direção e sua posição, e avisa quando chega ao ponto', async ({ page, context }) => {
    await abrirColetaDoT04(page)
    const p1 = await posicaoDoPonto(page, 'T-04', 1)
    await context.setGeolocation(metrosAoNorte(p1, 200)) // 200 m ao norte do ponto: o ponto fica ao sul
    await page.getByRole('button', { name: 'Ir até o ponto' }).click()
    await expect(page.getByText(/^(190|200|210) m$/)).toBeVisible()
    await expect(page.getByText(/Ponto 1 · sul · /)).toBeVisible()
    await expect(page.getByText(/GPS ±\d+ m/)).toBeVisible()
    await expect(page.getByRole('img', { name: 'Sua posição' })).toBeVisible()

    await context.setGeolocation(metrosAoNorte(p1, 0)) // em cima do ponto
    await expect(page.getByText('Registre o que encontrou.')).toBeVisible()
    await expect(page.getByText('Você chegou ao ponto 1').first()).toBeAttached()

    await page.getByRole('button', { name: 'Parar o guia' }).click()
    await expect(page.getByText('Registre o que encontrou.')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Ir até o ponto' })).toBeVisible()
  })

  test('longe da fazenda oferece a rota de carro no Google Maps e no Waze', async ({ page, context }) => {
    await abrirColetaDoT04(page)
    const p1 = await posicaoDoPonto(page, 'T-04', 1)
    await context.setGeolocation(metrosAoNorte(p1, 5000))
    await page.getByRole('button', { name: 'Ir até o ponto' }).click()
    await expect(page.getByText(/^5,0 km$/)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Google Maps' })).toHaveAttribute('href', new RegExp(`destination=${p1.lat.toFixed(6)},${p1.lng.toFixed(6)}`))
    await expect(page.getByRole('link', { name: 'Waze' })).toHaveAttribute('href', new RegExp(`ll=${p1.lat.toFixed(6)},${p1.lng.toFixed(6)}`))
  })

  test('o guia segue o ponto da vez: trocar de ponto muda o destino', async ({ page, context }) => {
    await abrirColetaDoT04(page)
    const p1 = await posicaoDoPonto(page, 'T-04', 1)
    await context.setGeolocation(metrosAoNorte(p1, 300))
    await page.getByRole('button', { name: 'Ir até o ponto' }).click()
    await expect(page.getByText(/Ponto 1 · /)).toBeVisible()
    await page.getByRole('button', { name: 'Próximo ponto' }).click()
    await expect(page.getByText(/Ponto 2 · /)).toBeVisible()
  })

  test('faixa do guia não tem violações WCAG 2.1 AA', async ({ page, context }) => {
    await abrirColetaDoT04(page)
    const p1 = await posicaoDoPonto(page, 'T-04', 1)
    await context.setGeolocation(metrosAoNorte(p1, 500))
    await page.getByRole('button', { name: 'Ir até o ponto' }).click()
    await expect(page.getByText(/^(490|500|510) m$/)).toBeVisible()
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('.maplibregl-map').analyze()
    expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`)).toEqual([])
  })

  test('desenhar o primeiro talhão: o mapa abre onde a pessoa está, com o ponto azul', async ({ page, context }) => {
    await context.setGeolocation({ latitude: -15.601, longitude: -56.097, accuracy: 8 }) // Cuiabá, longe da fazenda de demonstração
    await page.goto('/#/talhoes/novo')
    const eu = page.getByRole('img', { name: 'Sua posição' })
    await expect(eu).toBeVisible()
    await page.waitForTimeout(1800) // fim da animação da câmera
    const m = (await page.locator('.maplibregl-map').boundingBox())!
    const p = (await eu.boundingBox())!
    expect(Math.abs(p.x + p.width / 2 - (m.x + m.width / 2))).toBeLessThan(25)
    expect(Math.abs(p.y + p.height / 2 - (m.y + m.height / 2))).toBeLessThan(25)
  })
})

test.describe('guia sem permissão de localização', () => {
  test.use({ permissions: [] })
  test('explica como liberar a localização em vez de ficar procurando para sempre', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/coleta')
    await page.getByRole('button', { name: 'Ir até o ponto' }).click()
    await expect(page.getByText(/Localização bloqueada/)).toBeVisible()
    await page.getByRole('button', { name: 'Parar o guia' }).click()
  })
})
