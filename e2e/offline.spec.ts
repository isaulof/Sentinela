import { expect, test } from '@playwright/test'
import { carregarDemo } from './ajuda'

test('funciona sem internet depois da primeira visita, com os dados salvos', async ({ page, context }) => {
  await carregarDemo(page)
  // Espera o service worker assumir o controle (primeira visita instala; recarregar passa a ser controlada).
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await page.waitForFunction(() => !!navigator.serviceWorker.controller)

  await context.setOffline(true)
  await page.goto('/#/coleta')
  await page.reload()
  await expect(page.getByRole('button', { name: 'Registrar achado' })).toBeVisible()
  await expect(page.getByText(/Sem internet/)).toBeVisible()

  // E dá para registrar offline.
  await page.getByRole('button', { name: 'Registrar achado' }).click()
  await page.getByRole('dialog').getByLabel('Estádio fenológico').waitFor() // o formulário só monta depois de ler o rascunho no aparelho: esperar, senão o campo de nome ainda não existe
  await expect(page.getByRole('dialog')).toBeVisible()
  await context.setOffline(false)
})
