import { expect, test, type Page } from '@playwright/test'
import { carregarDemo } from './ajuda'

async function abrirT04(page: Page) {
  await carregarDemo(page)
  await page.goto('/#/coleta')
  await page.getByLabel('Talhão', { exact: true }).selectOption({ label: 'T-04 Cabeceira' })
  await expect(page.getByText('Ponto 1 de 10')).toBeVisible()
}

async function registrarPercevejo(page: Page, quantidade: number) {
  await page.getByRole('button', { name: 'Registrar achado' }).click()
  const d = page.getByRole('dialog')
  const nome = d.getByPlaceholder('Nome e sobrenome')
  if (await nome.isVisible()) await nome.fill('Ana Teste')
  await d.getByRole('radio', { name: 'Adulto' }).click()
  if (quantidade > 0) await d.getByRole('button', { name: 'Aumentar' }).click({ clickCount: quantidade })
  else await d.getByRole('button', { name: 'Nenhuma ocorrência (registrar zero)' }).click()
  await d.getByRole('button', { name: 'Salvar registro' }).click()
  await expect(d).toBeHidden()
}

test.describe('registro dos achados', () => {
  test('depois de salvar, mostra o que foi gravado com data, hora e nível, e fica no mesmo ponto', async ({ page }) => {
    await abrirT04(page)
    await registrarPercevejo(page, 1)
    const conf = page.getByRole('region', { name: 'Registro salvo' })
    await expect(conf).toContainText(/Percevejo-marrom · 1 por metro · \d{2}\/\d{2}\/\d{4} \d{2}:\d{2} · /)
    await expect(page.getByText('Ponto 1 de 10')).toBeVisible()
    await expect(conf.getByRole('button', { name: /Desfazer/ })).toBeVisible()
  })

  test('vários achados no mesmo ponto: "Outro achado aqui" mantém o ponto e a ficha lista todos', async ({ page }) => {
    await abrirT04(page)
    await registrarPercevejo(page, 1)
    await page.getByRole('region', { name: 'Registro salvo' }).getByRole('button', { name: 'Outro achado aqui' }).click()
    const d = page.getByRole('dialog')
    await expect(d.getByRole('heading', { name: 'Registrar achado' })).toBeVisible()
    await d.getByRole('radio', { name: 'Ferrugem-asiática' }).click()
    await d.getByRole('radio', { name: 'Pontuações iniciais' }).click()
    await d.getByRole('button', { name: 'Nenhuma ocorrência (registrar zero)' }).click() // ausência de doença também é um dado (V05)
    await d.getByRole('button', { name: 'Salvar registro' }).click()
    await expect(d).toBeHidden()
    await page.getByRole('region', { name: 'Registro salvo' }).getByRole('button', { name: 'Ver ficha' }).click()
    const ficha = page.getByRole('dialog', { name: /Ficha do ponto 1/ })
    await expect(ficha.getByRole('list', { name: 'Histórico do ponto 1' }).getByRole('listitem')).toHaveCount(2)
    await expect(ficha.getByText('Percevejo-marrom').first()).toBeVisible()
    await expect(ficha.getByText('Ferrugem-asiática').first()).toBeVisible()
  })

  test('a ficha mostra método, amostra, condições, responsável, posição e hora local', async ({ page }) => {
    await abrirT04(page)
    await page.getByRole('button', { name: 'Registrar achado' }).click()
    const d = page.getByRole('dialog')
    const nome = d.getByPlaceholder('Nome e sobrenome')
    if (await nome.isVisible()) await nome.fill('Ana Teste')
    await d.getByRole('radio', { name: 'Adulto' }).click()
    await d.getByRole('button', { name: 'Aumentar' }).click()
    await d.getByLabel('Batidas / repetições').fill('5')
    await d.getByText('Condições do dia (opcional)').click()
    await d.getByRole('radio', { name: 'Nublado' }).click()
    await d.getByRole('radio', { name: 'Calmo' }).click()
    await d.getByRole('radio', { name: 'Molhada' }).click()
    await d.getByRole('button', { name: 'Salvar registro' }).click()
    await page.getByRole('region', { name: 'Registro salvo' }).getByRole('button', { name: 'Ver ficha' }).click()
    const ficha = page.getByRole('dialog', { name: /Ficha do ponto 1/ })
    await expect(ficha.getByText(/Pano de batida/)).toBeVisible() // método do protocolo
    await expect(ficha.getByText('5 batidas de 1 m')).toBeVisible()
    await expect(ficha.getByText('nublado · vento calmo · folha molhada')).toBeVisible()
    await expect(ficha.getByText('Ana Teste')).toBeVisible()
    await expect(ficha.getByText('Posição simulada (demonstração)')).toBeVisible()
    await expect(ficha.getByText(/\d{2}\/\d{2}\/2026 \d{2}:\d{2}/).first()).toBeVisible()
  })

  test('desfazer logo depois de salvar tira da análise, mas o registro continua guardado na ficha', async ({ page }) => {
    await abrirT04(page)
    await registrarPercevejo(page, 0)
    await expect(page.getByText('1 de 10 pontos coletados')).toBeVisible()
    await page.getByRole('region', { name: 'Registro salvo' }).getByRole('button', { name: /Desfazer/ }).click()
    await expect(page.getByText('0 de 10 pontos coletados')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Registro salvo' })).toHaveCount(0)
    // Continua guardado, marcado como desfeito.
    await page.getByRole('button', { name: 'Ver ficha completa' }).or(page.getByText('Ponto 1 de 10')).first().waitFor()
    const total = await page.evaluate(() => new Promise<{ n: number; anulados: number }>((ok) => {
      const a = indexedDB.open('sentinela')
      a.onsuccess = () => {
        const r = a.result.transaction('registros').objectStore('registros').getAll()
        r.onsuccess = () => ok({ n: r.result.filter((x: { talhaoId: string }) => x.talhaoId === 'T-04').length, anulados: r.result.filter((x: { anuladoEm?: string }) => x.anuladoEm).length })
      }
    }))
    expect(total).toEqual({ n: 1, anulados: 1 })
  })

  test('corrigir cria a versão 2, guarda a 1 como substituída e registra quem, quando e por quê', async ({ page }) => {
    await abrirT04(page)
    await registrarPercevejo(page, 1)
    await page.getByRole('region', { name: 'Registro salvo' }).getByRole('button', { name: 'Ver ficha' }).click()
    const ficha = page.getByRole('dialog', { name: /Ficha do ponto 1/ })
    await ficha.getByRole('button', { name: 'Corrigir' }).click()
    await ficha.getByLabel('Quantidade').fill('2')
    await expect(ficha.getByRole('button', { name: 'Salvar correção' })).toBeDisabled() // falta o motivo
    await ficha.getByLabel('Motivo da correção').fill('Contei de novo no pano')
    await ficha.getByRole('button', { name: 'Salvar correção' }).click()
    const itens = ficha.getByRole('list', { name: 'Histórico do ponto 1' }).getByRole('listitem')
    await expect(itens).toHaveCount(2)
    await expect(ficha.getByText(/versão 2/)).toBeVisible()
    await expect(ficha.locator('[data-estado="corrigida"]')).toContainText('Substituída')
    await expect(ficha.getByText(/Corrigido por Ana Teste em \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}: Contei de novo no pano/)).toBeVisible()
    // A versão ativa vale na análise: só uma continua ativa.
    await expect(ficha.locator('[data-estado="ativa"]')).toHaveCount(1)
    await expect(ficha.locator('[data-estado="ativa"]')).toContainText('2 por metro')
  })
})

test('mapa inteligente: a ficha completa do ponto abre a partir do ponto e mostra o histórico', async ({ page }) => {
  await carregarDemo(page)
  await page.goto('/#/talhoes/T-01')
  await page.getByRole('button', { name: /^Ponto 1,/ }).first().click()
  await page.getByRole('button', { name: 'Ficha completa do ponto' }).click()
  const ficha = page.getByRole('dialog', { name: /Ficha do ponto 1/ })
  await expect(ficha.getByRole('list', { name: 'Histórico do ponto 1' })).toBeVisible()
  await expect(ficha.getByText('Método não informado').first().or(ficha.getByText(/Pano de batida/).first())).toBeVisible()
})

test.describe('rascunho do registro (app fechado no meio)', () => {
  const lerRascunho = (page: Page) => page.evaluate(() => new Promise<unknown>((ok) => {
    const a = indexedDB.open('sentinela')
    a.onsuccess = () => { const r = a.result.transaction('config').objectStore('config').getAll(); r.onsuccess = () => ok(r.result.find((x: { chave: string }) => x.chave.startsWith('rascunho:registro:'))?.valor ?? null) }
  }))

  async function preencher(page: Page) {
    await page.getByRole('button', { name: 'Registrar achado' }).click()
    const d = page.getByRole('dialog')
    const nome = d.getByPlaceholder('Nome e sobrenome')
    if (await nome.isVisible()) await nome.fill('Ana Teste')
    await d.getByRole('radio', { name: 'Adulto' }).click()
    await d.getByRole('button', { name: 'Aumentar' }).click()
    await d.getByLabel('Observação técnica (opcional)').fill('manchas na face de baixo')
    await expect.poll(() => lerRascunho(page), { timeout: 8000 }).not.toBeNull() // gravou no aparelho
  }

  test('se a página fechar no meio, o rascunho volta ao reabrir o ponto', async ({ page }) => {
    await abrirT04(page)
    await preencher(page)
    await page.reload() // como se o celular travasse ou a aba fosse fechada
    await page.getByLabel('Talhão', { exact: true }).selectOption({ label: 'T-04 Cabeceira' })
    await expect(page.getByText('Ponto 1 de 10')).toBeVisible()
    await page.getByRole('button', { name: 'Registrar achado' }).click()
    const d = page.getByRole('dialog')
    await expect(d.getByText('Rascunho recuperado')).toBeVisible()
    await expect(d.getByRole('radio', { name: 'Adulto' })).toHaveAttribute('aria-checked', 'true')
    await expect(d.getByRole('textbox', { name: 'Quantidade' })).toHaveValue('1')
    await expect(d.getByLabel('Observação técnica (opcional)')).toHaveValue('manchas na face de baixo')
  })

  test('salvar apaga o rascunho: na próxima vez o formulário abre limpo', async ({ page }) => {
    await abrirT04(page)
    await preencher(page)
    const d = page.getByRole('dialog')
    await d.getByRole('button', { name: 'Salvar registro' }).click()
    await expect(d).toBeHidden()
    await expect.poll(() => lerRascunho(page)).toBeNull()
    await page.getByRole('region', { name: 'Registro salvo' }).getByRole('button', { name: 'Outro achado aqui' }).click()
    await expect(page.getByRole('dialog').getByText('Rascunho recuperado')).toHaveCount(0)
    await expect(page.getByRole('dialog').getByLabel('Observação técnica (opcional)')).toHaveValue('')
  })

  test('Descartar apaga o rascunho e limpa o formulário', async ({ page }) => {
    await abrirT04(page)
    await preencher(page)
    await page.reload()
    await page.getByLabel('Talhão', { exact: true }).selectOption({ label: 'T-04 Cabeceira' })
    await page.getByRole('button', { name: 'Registrar achado' }).click()
    const d = page.getByRole('dialog')
    await d.getByRole('button', { name: 'Descartar' }).click()
    await expect(d.getByText('Rascunho recuperado')).toHaveCount(0)
    await expect(d.getByLabel('Observação técnica (opcional)')).toHaveValue('')
    await expect.poll(() => lerRascunho(page)).toBeNull()
  })

  test('um formulário aberto e parado não gera rascunho', async ({ page }) => {
    await abrirT04(page)
    await page.getByRole('button', { name: 'Registrar achado' }).click()
    await page.waitForTimeout(1200)
    expect(await lerRascunho(page)).toBeNull()
  })
})
