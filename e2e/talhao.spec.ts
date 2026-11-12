import AxeBuilder from '@axe-core/playwright'
import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { carregarDemo, esperarAnimacoes } from './ajuda'

/** Contagens direto do banco do aparelho, para provar o que foi (e o que não foi) apagado. */
const contar = (page: Page) => page.evaluate(() => new Promise<{ talhoes: string[]; registros: Record<string, number>; fotos: number; planos: string[] }>((ok) => {
  const a = indexedDB.open('sentinela')
  a.onsuccess = () => {
    const tx = a.result.transaction(['talhoes', 'registros', 'fotos', 'planos'])
    const t = tx.objectStore('talhoes').getAll(); const r = tx.objectStore('registros').getAll(); const f = tx.objectStore('fotos').count(); const p = tx.objectStore('planos').getAllKeys()
    tx.oncomplete = () => {
      const registros: Record<string, number> = {}
      for (const x of r.result as { talhaoId: string }[]) registros[x.talhaoId] = (registros[x.talhaoId] ?? 0) + 1
      ok({ talhoes: (t.result as { nome: string }[]).map((x) => x.nome).sort(), registros, fotos: f.result, planos: (p.result as string[]).sort() })
    }
  }
}))

async function abrirEdicao(page: Page, talhao: string) {
  await carregarDemo(page)
  await page.goto(`/#/talhoes/${talhao}`)
  await page.getByRole('button', { name: 'Editar talhão' }).click()
  const d = page.getByRole('dialog', { name: 'Editar talhão' })
  await d.getByLabel('Nome do talhão').waitFor()
  return d
}

test.describe('editar talhão', () => {
  test('abre com os dados atuais e só deixa salvar depois de mudar algo', async ({ page }) => {
    const d = await abrirEdicao(page, 'T-04')
    await expect(d.getByLabel('Nome do talhão')).toHaveValue('T-04 Cabeceira')
    await expect(d.getByLabel('Cultivar')).toHaveValue('Cultivar tardia')
    await expect(d.getByLabel('Data de plantio')).toHaveValue('2026-10-05')
    await expect(d.getByLabel('Estádio atual')).toHaveValue('V5')
    await expect(d.getByRole('radio', { name: 'Grãos' })).toHaveAttribute('aria-checked', 'true')
    await expect(d.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled()
    await expect(d.getByRole('alert')).toHaveCount(0) // abrir não "grita" erro
    await d.getByLabel('Cultivar').fill('Cultivar tardia 2')
    await expect(d.getByRole('button', { name: 'Salvar alterações' })).toBeEnabled()
  })

  test('salvar atualiza o cabeçalho e a lista de talhões, sem mexer nos pontos nem nos registros', async ({ page }) => {
    const d = await abrirEdicao(page, 'T-01')
    const antes = await contar(page)
    await d.getByLabel('Nome do talhão').fill('T-01 Mirante Norte')
    await d.getByLabel('Cultivar').fill('Média')
    await d.getByLabel('Data de plantio').fill('2026-09-10')
    await d.getByLabel('Estádio atual').selectOption('R4')
    await d.getByRole('radio', { name: 'Sementes' }).click()
    await d.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page.getByText('Talhão atualizado')).toBeVisible()
    await expect(d).toBeHidden()
    await expect(page.getByRole('heading', { level: 1, name: 'T-01 Mirante Norte' })).toBeVisible()
    await expect(page.getByText(/Média · R4/)).toBeVisible()
    await page.goto('/#/talhoes')
    await expect(page.getByText('T-01 Mirante Norte')).toBeVisible()
    await expect(page.getByText('T-01 Mirante', { exact: true })).toHaveCount(0)
    const depois = await contar(page)
    expect(depois.registros).toEqual(antes.registros) // os registros continuam ligados ao talhão
    expect(depois.planos).toEqual(antes.planos)
    expect(depois.fotos).toBe(antes.fotos)
  })

  test('recusa nome vazio, nome repetido e plantio no futuro, com a mensagem ao lado do campo', async ({ page }) => {
    const d = await abrirEdicao(page, 'T-04')
    const salvar = d.getByRole('button', { name: 'Salvar alterações' })
    await d.getByLabel('Nome do talhão').fill('')
    await expect(d.getByText(/pelo menos 2 letras/)).toBeVisible()
    await expect(salvar).toBeDisabled()
    await d.getByLabel('Nome do talhão').fill('  t-01   MIRANTE ')
    await expect(d.getByText('Já existe outro talhão com esse nome.')).toBeVisible()
    await expect(salvar).toBeDisabled()
    await d.getByLabel('Nome do talhão').fill('T-04 Cabeceira')
    await d.getByLabel('Data de plantio').fill('2035-01-01')
    await expect(d.getByText(/não pode ser em uma data futura/)).toBeVisible()
    await expect(salvar).toBeDisabled()
  })

  test('cancelar não muda nada', async ({ page }) => {
    const d = await abrirEdicao(page, 'T-04')
    await d.getByLabel('Nome do talhão').fill('Nome que não vai valer')
    await d.getByRole('button', { name: 'Cancelar' }).click()
    await expect(d).toBeHidden()
    await expect(page.getByRole('heading', { level: 1, name: 'T-04 Cabeceira' })).toBeVisible()
  })
})

test.describe('apagar talhão', () => {
  async function abrirApagar(page: Page, talhao: string) {
    const d = await abrirEdicao(page, talhao)
    await d.getByRole('button', { name: 'Apagar este talhão…' }).click()
    const a = page.getByRole('dialog', { name: 'Apagar talhão?' })
    await a.getByRole('list', { name: 'O que será apagado' }).waitFor()
    return a
  }

  test('mostra o que será perdido, oferece o CSV e só libera depois de digitar o nome certo', async ({ page }) => {
    const a = await abrirApagar(page, 'T-01')
    await expect(a.getByText('Isto não pode ser desfeito.')).toBeVisible()
    const lista = a.getByRole('list', { name: 'O que será apagado' })
    await expect(lista).toContainText(/\d+ pontos de coleta/)
    await expect(lista).toContainText(/\d+ registros \(incluindo correções e desfeitos\)/)
    await expect(lista).toContainText(/\d+ fotos?/)
    const apagar = a.getByRole('button', { name: 'Apagar definitivamente' })
    await expect(apagar).toBeDisabled()
    await a.getByLabel('Para confirmar, digite o nome do talhão').fill('T-01')
    await expect(apagar).toBeDisabled() // nome incompleto não vale
    await a.getByLabel('Para confirmar, digite o nome do talhão').fill('  t-01  MIRANTE ')
    await expect(apagar).toBeEnabled() // sem diferença de maiúscula ou espaço
    // O CSV baixado antes de apagar traz os registros do talhão.
    const [dl] = await Promise.all([page.waitForEvent('download'), a.getByRole('button', { name: 'Baixar CSV antes de apagar' }).click()])
    expect(dl.suggestedFilename()).toMatch(/^sentinela_t-01-mirante_.*\.csv$/)
    expect(readFileSync((await dl.path())!, 'utf8').split('\r\n').filter(Boolean).length).toBeGreaterThan(10)
  })

  test('nenhum botão passa da borda da tela em celular estreito', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 })
    const a = await abrirApagar(page, 'T-01')
    for (const nome of ['Baixar CSV antes de apagar', 'Apagar definitivamente', 'Cancelar']) {
      const b = (await a.getByRole('button', { name: nome }).boundingBox())!
      expect(b.x, nome).toBeGreaterThanOrEqual(0)
      expect(b.x + b.width, nome).toBeLessThanOrEqual(360 - 16) // respeita a margem do painel
      expect(b.height, nome).toBeGreaterThanOrEqual(43.9)
    }
  })

  test('apagar remove o talhão, os registros e as fotos dele e não toca nos outros', async ({ page }) => {
    const a = await abrirApagar(page, 'T-01')
    const antes = await contar(page)
    expect(antes.registros['T-01']).toBeGreaterThan(0)
    await a.getByLabel('Para confirmar, digite o nome do talhão').fill('T-01 Mirante')
    await a.getByRole('button', { name: 'Apagar definitivamente' }).click()
    await expect(page).toHaveURL(/#\/talhoes$/)
    await expect(page.getByText('T-01 Mirante foi apagado')).toBeVisible()
    await expect(page.getByText('T-01 Mirante', { exact: true })).toHaveCount(0)
    for (const outro of ['T-02 Baixada', 'T-03 Estrada', 'T-04 Cabeceira']) await expect(page.getByText(outro).first()).toBeVisible()
    const depois = await contar(page)
    expect(depois.talhoes).not.toContain('T-01 Mirante')
    expect(depois.registros['T-01']).toBeUndefined()
    expect(depois.planos).not.toContain('T-01')
    // Os outros talhões continuam com os mesmos registros.
    for (const id of ['T-02', 'T-03']) expect(depois.registros[id]).toBe(antes.registros[id])
    expect(depois.fotos).toBeLessThan(antes.fotos) // as fotos do T-01 saíram junto
    expect(depois.fotos).toBeGreaterThan(0) // e as dos outros ficaram
  })

  test('cancelar a exclusão mantém tudo', async ({ page }) => {
    const a = await abrirApagar(page, 'T-01')
    const antes = await contar(page)
    await a.getByRole('button', { name: 'Cancelar' }).click()
    await expect(a).toBeHidden()
    expect(await contar(page)).toEqual(antes)
    await expect(page.getByRole('heading', { level: 1, name: 'T-01 Mirante' })).toBeVisible()
  })

  test('talhão sem registros: não há CSV para baixar, mas apaga do mesmo jeito', async ({ page }) => {
    const a = await abrirApagar(page, 'T-04')
    await expect(a.getByRole('list', { name: 'O que será apagado' })).toContainText('0 registros')
    await expect(a.getByRole('button', { name: 'Baixar CSV antes de apagar' })).toBeDisabled()
    await a.getByLabel('Para confirmar, digite o nome do talhão').fill('T-04 Cabeceira')
    await a.getByRole('button', { name: 'Apagar definitivamente' }).click()
    await expect(page).toHaveURL(/#\/talhoes$/)
    expect((await contar(page)).talhoes).not.toContain('T-04 Cabeceira')
  })

  test('apagar o talhão que estava selecionado na Coleta não quebra a tela', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/coleta')
    await page.getByLabel('Talhão', { exact: true }).selectOption({ label: 'T-04 Cabeceira' })
    await expect(page.getByText('Ponto 1 de 10')).toBeVisible()
    await page.goto('/#/talhoes/T-04')
    await page.getByRole('button', { name: 'Editar talhão' }).click()
    await page.getByRole('dialog', { name: 'Editar talhão' }).getByRole('button', { name: 'Apagar este talhão…' }).click()
    const a = page.getByRole('dialog', { name: 'Apagar talhão?' })
    await a.getByLabel('Para confirmar, digite o nome do talhão').fill('T-04 Cabeceira')
    await a.getByRole('button', { name: 'Apagar definitivamente' }).click()
    await expect(page).toHaveURL(/#\/talhoes$/)
    await page.goto('/#/coleta')
    await expect(page.getByLabel('Talhão', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Talhão', { exact: true }).locator('option', { hasText: 'T-04 Cabeceira' })).toHaveCount(0)
  })
})

test.describe('acessibilidade dos painéis do talhão', () => {
  for (const painel of ['editar', 'apagar'] as const) {
    test(`painel de ${painel} não tem violações WCAG 2.1 AA`, async ({ page }) => {
      const d = await abrirEdicao(page, 'T-01')
      if (painel === 'apagar') { await d.getByRole('button', { name: 'Apagar este talhão…' }).click(); await page.getByRole('list', { name: 'O que será apagado' }).waitFor() }
      await esperarAnimacoes(page)
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).include('dialog[open]').analyze()
      expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`)).toEqual([])
    })
  }
})
