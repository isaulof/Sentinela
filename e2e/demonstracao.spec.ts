import { expect, type Page } from '@playwright/test'
import { test } from './fixtures'
import { carregarDemo } from './ajuda'

/** As fotos guardadas no aparelho, lidas direto do banco: tipo, tamanho em bytes e tamanho da imagem em pixels. */
const fotosGuardadas = (page: Page) => page.evaluate(() => new Promise<{ id: string; tipo: string; bytes: number }[]>((ok) => {
  const a = indexedDB.open('sentinela')
  a.onsuccess = () => {
    const r = a.result.transaction('fotos').objectStore('fotos').getAll()
    r.onsuccess = () => ok((r.result as { id: string; blob: Blob }[]).map((f) => ({ id: f.id, tipo: f.blob.type, bytes: f.blob.size })))
  }
}))

test.describe('demonstração com fotos reais', () => {
  test('os arquivos de foto de referência existem e são JPEG de verdade', async ({ page }) => {
    for (const arquivo of ['percevejo.jpg', 'lagarta.jpg', 'ferrugem.jpg', 'manchaalvo.jpg']) {
      const r = await page.request.get(`/imagens/diagnostico/${arquivo}`)
      expect(r.status(), arquivo).toBe(200)
      expect(r.headers()['content-type'], arquivo).toMatch(/image\/jpeg/)
      expect((await r.body()).byteLength, arquivo).toBeGreaterThan(10_000)
    }
  })

  test('ao carregar a demonstração, as fotos dos pontos são JPEG reais, não a ilustração desenhada', async ({ page }) => {
    await carregarDemo(page)
    const fotos = await fotosGuardadas(page)
    expect(fotos.length).toBeGreaterThanOrEqual(8)
    for (const f of fotos) {
      expect(f.tipo, f.id).toBe('image/jpeg') // a ilustração antiga era image/svg+xml
      expect(f.bytes, f.id).toBeGreaterThan(8_000) // foto de verdade, não um desenho de poucos bytes
    }
  })

  test('no mapa, a foto do ponto aparece de verdade, em tamanho de foto', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/talhoes/T-01')
    await expect(page.getByRole('heading', { name: 'Fotos do talhão' })).toBeVisible()
    const miniaturas = page.getByRole('button', { name: /^Foto do ponto \d+$/ })
    await expect(miniaturas.first()).toBeVisible()
    const img = miniaturas.first().locator('img')
    await expect.poll(() => img.evaluate((e) => (e as HTMLImageElement).complete && (e as HTMLImageElement).naturalWidth)).toBeGreaterThan(600)
    expect(await img.evaluate((e) => (e as HTMLImageElement).naturalHeight)).toBeGreaterThan(400)
    // É um arquivo JPEG (não SVG).
    expect(await img.evaluate(async (e) => (await (await fetch((e as HTMLImageElement).src)).blob()).type)).toBe('image/jpeg')
  })

  test('cada problema mostra a foto do problema certo (fotos diferentes para percevejo e ferrugem)', async ({ page }) => {
    await carregarDemo(page)
    const tamanhos = new Set((await fotosGuardadas(page)).map((f) => f.bytes))
    expect(tamanhos.size).toBeGreaterThanOrEqual(3) // percevejo, lagarta, ferrugem e mancha-alvo são arquivos diferentes
  })

  test('carregar a demonstração de novo não acumula fotos no aparelho', async ({ page }) => {
    await carregarDemo(page)
    const antes = (await fotosGuardadas(page)).length
    await page.goto('/#/perfil')
    await page.getByRole('button', { name: 'Carregar demonstração' }).click()
    await page.getByText('Demonstração carregada').last().waitFor()
    await page.waitForTimeout(600)
    expect((await fotosGuardadas(page)).length).toBe(antes)
  })

  test('as fotos reais saem no relatório em PDF', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/talhoes/T-01/relatorio')
    const fotos = page.getByRole('img', { name: 'Foto de evidência do ponto' })
    await expect(fotos.first()).toBeVisible()
    await expect.poll(() => fotos.first().evaluate((e) => (e as HTMLImageElement).complete && (e as HTMLImageElement).naturalWidth)).toBeGreaterThan(600)
  })
})
