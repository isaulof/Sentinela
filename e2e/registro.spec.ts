import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { anexarFoto, carregarDemo } from './ajuda'

async function abrirT04(page: Page) {
  await carregarDemo(page)
  await page.goto('/#/coleta')
  await page.getByLabel('Talhão', { exact: true }).selectOption({ label: 'T-04 Cabeceira' })
  await expect(page.getByText('Ponto 1 de 10')).toBeVisible()
}

async function registrarPercevejo(page: Page, quantidade: number) {
  await page.getByRole('button', { name: 'Registrar achado' }).click()
  await page.getByRole('dialog').getByLabel('Estádio fenológico').waitFor() // o formulário só monta depois de ler o rascunho no aparelho: esperar, senão o campo de nome ainda não existe
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
    await page.getByRole('dialog').getByLabel('Estádio fenológico').waitFor() // o formulário só monta depois de ler o rascunho no aparelho: esperar, senão o campo de nome ainda não existe
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
    await page.getByRole('dialog').getByLabel('Estádio fenológico').waitFor() // o formulário só monta depois de ler o rascunho no aparelho: esperar, senão o campo de nome ainda não existe
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
    await page.getByRole('dialog').getByLabel('Estádio fenológico').waitFor() // o formulário só monta depois de ler o rascunho no aparelho: esperar, senão o campo de nome ainda não existe
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
    await page.getByRole('dialog').getByLabel('Estádio fenológico').waitFor() // o formulário só monta depois de ler o rascunho no aparelho: esperar, senão o campo de nome ainda não existe
    const d = page.getByRole('dialog')
    await d.getByRole('button', { name: 'Descartar' }).click()
    await expect(d.getByText('Rascunho recuperado')).toHaveCount(0)
    await expect(d.getByLabel('Observação técnica (opcional)')).toHaveValue('')
    await expect.poll(() => lerRascunho(page)).toBeNull()
  })

  test('um formulário aberto e parado não gera rascunho', async ({ page }) => {
    await abrirT04(page)
    await page.getByRole('button', { name: 'Registrar achado' }).click()
    await page.getByRole('dialog').getByLabel('Estádio fenológico').waitFor() // o formulário só monta depois de ler o rascunho no aparelho: esperar, senão o campo de nome ainda não existe
    await page.waitForTimeout(1200)
    expect(await lerRascunho(page)).toBeNull()
  })
})

test.describe('outras pragas e doenças e método opcional', () => {
  async function abrirForm(page: Page) {
    await abrirT04(page)
    await page.getByRole('button', { name: 'Registrar achado' }).click()
    const d = page.getByRole('dialog')
    await d.getByLabel('Estádio fenológico').waitFor()
    const nome = d.getByPlaceholder('Nome e sobrenome')
    if (await nome.isVisible()) await nome.fill('Ana Teste')
    return d
  }

  test('os 5 alvos de rotina continuam em botões e as outras 15 pragas e doenças vêm num seletor agrupado', async ({ page }) => {
    const d = await abrirForm(page)
    const alvos = d.getByRole('radiogroup', { name: 'Alvo' }).getByRole('radio')
    await expect(alvos).toHaveText(['Percevejo-marrom', 'Lagarta-falsa-medideira', 'Ferrugem-asiática', 'Mofo-branco', 'Mancha-alvo'])
    const outros = d.getByLabel('Outras pragas e doenças')
    await expect(outros.locator('optgroup[label="Pragas"] option')).toHaveCount(9)
    await expect(outros.locator('optgroup[label="Doenças"] option')).toHaveCount(6)
    await expect(outros.locator('optgroup[label="Pragas"] option')).toContainText(['Lagarta-da-soja', 'Lagartas das vagens', 'Mosca-branca', 'Vaquinhas e besouros pequenos', 'Ácaros', 'Pulgões', 'Tamanduá-da-soja', 'Lagarta-elasmo', 'Corós (larvas no solo)'])
    await expect(outros.locator('optgroup[label="Doenças"] option')).toContainText(['Oídio', 'Doenças de final de ciclo', 'Antracnose', 'Pústula e crestamento bacteriano', 'Mancha olho-de-rã', 'Podridões de raiz e haste'])
  })

  test('escolher outra praga troca as fases, a unidade e o protocolo, e avisa que não há nível de ação numérico', async ({ page }) => {
    const d = await abrirForm(page)
    await d.getByLabel('Outras pragas e doenças').selectOption({ label: 'Mosca-branca' })
    await expect(d.getByRole('radiogroup', { name: 'Alvo' }).getByRole('radio', { checked: true })).toHaveCount(0) // nenhum dos 5 fica marcado
    await expect(d.getByRole('radiogroup', { name: 'Fase' }).getByRole('radio')).toHaveText(['Ninfa', 'Adulto'])
    await expect(d.getByText('Quantidade (adultos por folha)')).toBeVisible()
    await expect(d.getByText(/Contagem de adultos na face inferior das folhas/)).toBeVisible()
    await expect(d.getByText(/Praga fora da rotina: protocolo é decisão de projeto da equipe/)).toBeVisible()
    // Voltar para um de rotina limpa o seletor.
    await d.getByRole('radio', { name: 'Percevejo-marrom' }).click()
    await expect(d.getByLabel('Outras pragas e doenças')).toHaveValue('')
  })

  test('registrar uma praga nova: sem foto bloqueia (é detecção), com foto salva e mostra "Detecção"', async ({ page }) => {
    const d = await abrirForm(page)
    await d.getByLabel('Outras pragas e doenças').selectOption({ label: 'Lagartas das vagens' })
    await d.getByRole('radio', { name: 'Lagarta grande' }).click()
    await d.getByRole('button', { name: 'Aumentar' }).click({ clickCount: 3 })
    const salvar = d.getByRole('button', { name: 'Salvar registro' })
    await expect(salvar).toBeDisabled()
    await expect(d.getByRole('alert').filter({ hasText: /foto/i })).toBeVisible()
    await expect(d.getByText('Detecção: Lagartas das vagens').first()).toBeVisible()
    await anexarFoto(page)
    await expect(salvar).toBeEnabled()
    await salvar.click()
    await expect(d).toBeHidden()
    const conf = page.getByRole('region', { name: 'Registro salvo' })
    await expect(conf).toContainText('Lagartas das vagens · 3 por metro')
    await expect(conf).toContainText('Detecção: Lagartas das vagens')
  })

  test('a unidade de cada praga aparece certa na confirmação (mosca-branca é por folha)', async ({ page }) => {
    const d = await abrirForm(page)
    await d.getByLabel('Outras pragas e doenças').selectOption({ label: 'Mosca-branca' })
    await d.getByRole('radio', { name: 'Adulto' }).click()
    await d.getByRole('button', { name: 'Aumentar' }).click({ clickCount: 2 })
    await anexarFoto(page)
    await d.getByRole('button', { name: 'Salvar registro' }).click()
    await expect(page.getByRole('region', { name: 'Registro salvo' })).toContainText('Mosca-branca · 2 por folha')
  })

  test('registrar uma doença nova: presença e severidade, com foto, vira detecção', async ({ page }) => {
    const d = await abrirForm(page)
    await d.getByLabel('Outras pragas e doenças').selectOption({ label: 'Oídio' })
    await d.getByRole('radio', { name: 'Cobertura de pó branco' }).click()
    await d.getByRole('radio', { name: 'Sim, encontrei' }).click()
    await d.getByLabel('Severidade (% da área foliar)').fill('6')
    await anexarFoto(page)
    await d.getByRole('button', { name: 'Salvar registro' }).click()
    await expect(d).toBeHidden()
    await expect(page.getByRole('region', { name: 'Registro salvo' })).toContainText('Oídio · presente · 6%')
  })

  test('lagarta-da-soja tem o mesmo nível de ação da falsa-medideira: 20 por metro atinge, e pede a desfolha', async ({ page }) => {
    const d = await abrirForm(page)
    await d.getByLabel('Outras pragas e doenças').selectOption({ label: 'Lagarta-da-soja' })
    await d.getByRole('radio', { name: 'Lagarta grande' }).click()
    await expect(d.getByLabel('Desfolha (%)')).toBeVisible()
    await d.getByRole('textbox', { name: 'Quantidade' }).fill('20')
    await expect(d.getByText('Nível de ação atingido').first()).toBeVisible()
  })

  test('o método é opcional: em branco salva normalmente e vale o do protocolo', async ({ page }) => {
    const d = await abrirForm(page)
    await expect(d.getByLabel('Como você coletou? (opcional)')).toHaveValue('')
    await expect(d.getByText('Deixe em branco para seguir o método do protocolo acima.')).toBeVisible()
    await d.getByRole('radio', { name: 'Adulto' }).click()
    await d.getByRole('button', { name: 'Aumentar' }).click()
    await d.getByRole('button', { name: 'Salvar registro' }).click()
    await expect(d).toBeHidden()
    await page.getByRole('region', { name: 'Registro salvo' }).getByRole('button', { name: 'Ver ficha' }).click()
    const ficha = page.getByRole('dialog', { name: /Ficha do ponto 1/ })
    await expect(ficha.getByText('Método', { exact: true })).toBeVisible()
    await expect(ficha.getByText(/Pano de batida branco/)).toBeVisible()
    await expect(ficha.getByText('Método usado', { exact: true })).toHaveCount(0)
  })

  test('informar o método fica gravado e aparece na ficha como "Método usado"; as opções mudam para doença', async ({ page }) => {
    const d = await abrirForm(page)
    const metodo = d.getByLabel('Como você coletou? (opcional)')
    await expect(metodo.locator('option')).toContainText(['Seguir o método do protocolo', 'Pano de batida', 'Rede de varredura', 'Armadilha adesiva amarela'])
    await metodo.selectOption({ label: 'Rede de varredura' })
    await d.getByRole('radio', { name: 'Adulto' }).click()
    await d.getByRole('button', { name: 'Aumentar' }).click()
    await d.getByRole('button', { name: 'Salvar registro' }).click()
    await page.getByRole('region', { name: 'Registro salvo' }).getByRole('button', { name: 'Ver ficha' }).click()
    const ficha = page.getByRole('dialog', { name: /Ficha do ponto 1/ })
    await expect(ficha.getByText('Método usado', { exact: true })).toBeVisible()
    await expect(ficha.getByText('Rede de varredura', { exact: true })).toBeVisible()
    // Trocar para doença oferece outros métodos e zera a escolha anterior.
    await page.keyboard.press('Escape')
    await page.getByRole('region', { name: 'Registro salvo' }).getByRole('button', { name: 'Outro achado aqui' }).click()
    const d2 = page.getByRole('dialog')
    await d2.getByLabel('Estádio fenológico').waitFor()
    await d2.getByRole('radio', { name: 'Ferrugem-asiática' }).click()
    const metodo2 = d2.getByLabel('Como você coletou? (opcional)')
    await expect(metodo2).toHaveValue('')
    await expect(metodo2.locator('option')).toContainText(['Arranque de plantas e corte da haste'])
    await expect(metodo2.locator('option', { hasText: 'Pano de batida' })).toHaveCount(0)
  })

  test('o método usado sai no relatório e no CSV', async ({ page }) => {
    const d = await abrirForm(page)
    await d.getByLabel('Como você coletou? (opcional)').selectOption({ label: 'Inspeção visual das plantas' })
    await d.getByRole('radio', { name: 'Adulto' }).click()
    await d.getByRole('button', { name: 'Aumentar' }).click()
    await d.getByRole('button', { name: 'Salvar registro' }).click()
    await expect(d).toBeHidden()
    await page.goto('/#/talhoes/T-04/relatorio')
    const ponto1 = page.locator('article[data-ponto="1"]')
    await expect(ponto1.getByText('Método usado', { exact: true })).toBeVisible()
    await expect(ponto1.getByText('Inspeção visual das plantas', { exact: true })).toBeVisible()
    await expect(ponto1.getByText('Método do protocolo', { exact: true })).toBeVisible() // o do protocolo fica ao lado, para comparar
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Baixar CSV' }).click()])
    const csv = readFileSync((await dl.path())!, 'utf8')
    const cab = csv.replace(/^\uFEFF/, '').split('\r\n')[0]!.split(';')
    expect(cab).toContain('metodo_usado')
    expect(csv).toContain('Inspeção visual das plantas')
  })

  test('o rascunho guarda a praga e o método escolhidos se a página fechar', async ({ page }) => {
    const d = await abrirForm(page)
    await d.getByLabel('Outras pragas e doenças').selectOption({ label: 'Pulgões' })
    await d.getByLabel('Como você coletou? (opcional)').selectOption({ label: 'Inspeção visual das plantas' })
    await d.getByRole('radio', { name: 'Colônia sem asas' }).click()
    await expect.poll(() => page.evaluate(() => new Promise<unknown>((ok) => { const a = indexedDB.open('sentinela'); a.onsuccess = () => { const r = a.result.transaction('config').objectStore('config').getAll(); r.onsuccess = () => ok((r.result as { chave: string; valor: unknown }[]).find((x) => x.chave.startsWith('rascunho:registro:'))?.valor ?? null) } })), { timeout: 8000 }).not.toBeNull()
    await page.reload()
    await page.getByLabel('Talhão', { exact: true }).selectOption({ label: 'T-04 Cabeceira' })
    await expect(page.getByText('Ponto 1 de 10')).toBeVisible()
    await page.getByRole('button', { name: 'Registrar achado' }).click()
    const d2 = page.getByRole('dialog')
    await expect(d2.getByText('Rascunho recuperado')).toBeVisible()
    await expect(d2.getByLabel('Outras pragas e doenças')).toHaveValue('pulgao')
    await expect(d2.getByLabel('Como você coletou? (opcional)')).toHaveValue('Inspeção visual das plantas')
    await expect(d2.getByRole('radio', { name: 'Colônia sem asas' })).toHaveAttribute('aria-checked', 'true')
  })

  test('no mapa inteligente o novo alvo só aparece depois de ter registro no talhão', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/talhoes/T-01')
    await expect(page.getByRole('button', { name: 'Percevejo-marrom', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Mosca-branca', exact: true })).toHaveCount(0) // sem registro: não polui os botões
    await page.goto('/#/coleta')
    await page.getByLabel('Talhão', { exact: true }).selectOption({ label: 'T-01 Mirante' })
    await expect(page.getByText(/Ponto \d+ de \d+/).first()).toBeVisible()
    await page.getByRole('button', { name: 'Registrar achado' }).click()
    const d = page.getByRole('dialog')
    await d.getByLabel('Estádio fenológico').waitFor()
    const nome = d.getByPlaceholder('Nome e sobrenome')
    if (await nome.isVisible()) await nome.fill('Ana Teste')
    await d.getByLabel('Outras pragas e doenças').selectOption({ label: 'Mosca-branca' })
    await d.getByRole('radio', { name: 'Adulto' }).click()
    await d.getByRole('button', { name: 'Aumentar' }).click()
    await anexarFoto(page)
    await d.getByRole('button', { name: 'Salvar registro' }).click()
    await expect(d).toBeHidden()
    await page.goto('/#/talhoes/T-01')
    await expect(page.getByRole('button', { name: 'Mosca-branca', exact: true })).toBeVisible()
  })

  test('"Sem ocorrência" continua registrando zero só para os 5 alvos de rotina', async ({ page }) => {
    await abrirT04(page)
    await page.getByRole('button', { name: 'Sem ocorrência', exact: true }).click()
    const nome = page.getByRole('dialog').getByPlaceholder('Nome e sobrenome')
    if (await nome.isVisible()) { await nome.fill('Ana Teste'); await page.getByRole('button', { name: 'Continuar' }).click() }
    await expect(page.getByRole('region', { name: 'Registro salvo' })).toContainText('5 alvos com zero')
  })
})
