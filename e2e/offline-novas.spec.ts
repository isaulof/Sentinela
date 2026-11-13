import { readFileSync } from 'node:fs'
import { expect } from '@playwright/test'
import { test } from './fixtures'
import { carregarDemo, informarPlantas } from './ajuda'

test('as telas novas funcionam sem internet: registro com confirmação e ficha, mapa, relatório e exportação', async ({ page, context }) => {
  test.slow()
  await carregarDemo(page)
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await page.waitForFunction(() => !!navigator.serviceWorker.controller)

  await context.setOffline(true)
  try {
    // Registro offline, confirmação e ficha (telas carregadas sob demanda: vêm do cache do app).
    await page.goto('/#/coleta')
    await page.getByLabel('Talhão', { exact: true }).selectOption({ label: 'T-04 Cabeceira' })
    await expect(page.getByText('0 de 10 pontos coletados')).toBeVisible()
    await informarPlantas(page)
    await page.getByRole('button', { name: 'Sem ocorrência', exact: true }).click()
    const nome = page.getByRole('dialog').getByPlaceholder('Nome e sobrenome')
    if (await nome.isVisible()) { await nome.fill('Ana Teste'); await page.getByRole('button', { name: 'Continuar' }).click() }
    const conf = page.getByRole('region', { name: 'Registro salvo' })
    await expect(conf).toContainText('Ponto 1: sem ocorrência')
    await conf.getByRole('button', { name: 'Ver ficha' }).click()
    await expect(page.getByRole('dialog', { name: /Ficha do ponto 1/ }).getByRole('list', { name: 'Histórico do ponto 1' })).toBeVisible()
    await page.keyboard.press('Escape')

    // Mapa inteligente com as camadas novas.
    await page.goto('/#/talhoes/T-01')
    await expect(page.getByRole('heading', { name: 'Leitura do mapa' })).toBeVisible()
    await expect(page.getByText(/Escala de 0 a/)).toBeVisible()
    await page.getByRole('radio', { name: 'Mudança' }).click()
    await expect(page.getByText(/Mudança desde a visita de/)).toBeVisible()

    // Relatório e exportação.
    await page.getByRole('link', { name: 'Relatório (PDF)' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'T-01 Mirante' })).toBeVisible()
    const [d] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Baixar CSV' }).click()])
    expect(readFileSync((await d.path())!, 'utf8').startsWith('﻿')).toBe(true)
  } finally {
    await context.setOffline(false)
  }
})
