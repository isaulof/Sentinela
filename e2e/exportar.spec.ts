import { readFileSync } from 'node:fs'
import { expect, type Page } from '@playwright/test'
import { test } from './fixtures'
import { carregarDemo, informarPlantas } from './ajuda'

async function baixar(page: Page, nomeBotao: string): Promise<{ nome: string; texto: string }> {
  const [d] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: nomeBotao }).click()])
  return { nome: d.suggestedFilename(), texto: readFileSync((await d.path())!, 'utf8') }
}
/** Leitor de CSV como o de uma planilha: ";" separa, aspas protegem ";" e quebras de linha, "" é uma aspa. */
function linhasCsv(texto: string): string[][] {
  const t = texto.replace(/^\uFEFF/, '')
  const linhas: string[][] = []
  let linha: string[] = []
  let cel = ''
  let aspas = false
  for (let k = 0; k < t.length; k++) {
    const c = t[k]!
    if (aspas) {
      if (c === '"' && t[k + 1] === '"') { cel += '"'; k++ } else if (c === '"') aspas = false
      else cel += c
    } else if (c === '"') aspas = true
    else if (c === ';') { linha.push(cel); cel = '' }
    else if (c === '\r' && t[k + 1] === '\n') { linha.push(cel); linhas.push(linha); linha = []; cel = ''; k++ }
    else cel += c
  }
  if (cel || linha.length) { linha.push(cel); linhas.push(linha) }
  return linhas
}
const num = (s: string) => Number(s.replace(',', '.'))

test.describe('exportação e relatório', () => {
  test('CSV e GeoJSON saem com todos os campos e o relatório mostra os mesmos números', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/talhoes/T-01')
    await expect(page.getByRole('heading', { name: 'Exportar para avaliação' })).toBeVisible()

    // CSV
    const csv = await baixar(page, 'Baixar CSV')
    expect(csv.nome).toMatch(/^sentinela_t-01-mirante_\d{4}-\d{2}-\d{2}\.csv$/)
    expect(csv.texto.startsWith('\uFEFF')).toBe(true)
    const [cab, ...linhas] = linhasCsv(csv.texto)
    for (const c of ['id', 'versao', 'estado', 'data_local', 'hora_local', 'metodo', 'coletado_por', 'responsavel_tecnico', 'lat', 'lon', 'precisao_gps_m', 'posicao_simulada', 'decisao']) expect(cab).toContain(c)
    const total = linhas.length
    expect(total).toBeGreaterThanOrEqual(20) // 2 visitas por ponto na demonstração
    expect(total % 2).toBe(0)
    expect(linhas.every((l) => l.length === cab!.length)).toBe(true)
    const i = (c: string) => cab!.indexOf(c)
    expect(linhas.every((l) => /^\d{4}-\d{2}-\d{2}$/.test(l[i('data_local')]!) && /^\d{2}:\d{2}$/.test(l[i('hora_local')]!))).toBe(true)
    expect(linhas.every((l) => l[i('metodo')]!.length > 5)).toBe(true) // a demonstração já sai com o método

    // GeoJSON
    const geo = await baixar(page, 'Baixar GeoJSON')
    expect(geo.nome).toMatch(/\.geojson$/)
    const fc = JSON.parse(geo.texto) as { type: string; features: { geometry: { type: string }; properties: Record<string, unknown> }[] }
    expect(fc.type).toBe('FeatureCollection')
    expect(fc.features).toHaveLength(total + 1) // contorno + um ponto por registro
    expect(fc.features[0]!.geometry.type).toBe('Polygon')
    expect(fc.features[1]!.properties).toHaveProperty('metodo')

    // Relatório: mesmos números do CSV.
    await page.getByRole('link', { name: 'Relatório (PDF)' }).click()
    await expect(page).toHaveURL(/#\/talhoes\/T-01\/relatorio/)
    await expect(page.getByRole('heading', { level: 1, name: 'T-01 Mirante' })).toBeVisible()
    // Todos os registros aparecem nas fichas dos pontos (o CSV também traz cada versão): mesma contagem.
    await expect(page.locator('[data-registro]')).toHaveCount(total)
    // última leitura de percevejo em cada ponto, a partir do CSV
    const ult = new Map<string, number>()
    for (const l of linhas.filter((x) => x[i('alvo')] === 'Percevejo-marrom').sort((a, b) => a[i('criado_em_utc')]!.localeCompare(b[i('criado_em_utc')]!))) ult.set(l[i('ponto_id')]!, num(l[i('quantidade')]!))
    const v = [...ult.values()]
    const media = v.reduce((a, b) => a + b, 0) / v.length
    const esperado = Number.isInteger(media) ? String(media) : media.toFixed(1).replace('.', ',')
    const linhaAlvo = page.getByRole('row', { name: /Percevejo-marrom/ }).first()
    await expect(linhaAlvo).toContainText(`${esperado} perc./m`)
    await expect(linhaAlvo).toContainText(String(v.length))
    await expect(linhaAlvo).toContainText(`${Math.max(...v)}`)
  })

  test('o relatório não tem recomendação de defensivo e mostra fontes e método', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/talhoes/T-01/relatorio')
    await expect(page.getByRole('heading', { name: 'Método de coleta' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Fontes' })).toBeVisible()
    await expect(page.getByText(/não recomenda a aplicação de defensivos/)).toBeVisible()
    await expect(page.getByText(/Embrapa/).first()).toBeVisible()
  })

  test('ao imprimir, a navegação do app some e só o relatório fica', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/talhoes/T-01/relatorio')
    await expect(page.getByRole('heading', { level: 1, name: 'T-01 Mirante' })).toBeVisible()
    await page.emulateMedia({ media: 'print' })
    await expect(page.getByRole('navigation', { name: 'Principal' }).first()).toBeHidden()
    await expect(page.getByRole('button', { name: 'Gerar PDF' })).toBeHidden()
    await expect(page.getByRole('heading', { level: 1, name: 'T-01 Mirante' })).toBeVisible()
  })

  test('o relatório completo traz capa, croqui numerado, tabela dos pontos e uma ficha por ponto com todos os dados', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/talhoes/T-01/relatorio')
    await expect(page.getByRole('heading', { level: 1, name: 'T-01 Mirante' })).toBeVisible()
    // Capa: fazenda fixa do projeto, data e hora de geração com o fuso.
    await expect(page.getByText(/Fazenda Santa Aurora · Lucas do Rio Verde · MT · Safra \d{2}\/\d{2}/)).toBeVisible()
    await expect(page.getByText(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2} \(horário local, fuso America\/Cuiaba\)/)).toBeVisible()
    // Croqui com o número de cada ponto.
    const pontos = page.locator('article[data-ponto]')
    const n = await pontos.count()
    expect(n).toBeGreaterThanOrEqual(10)
    await expect(page.getByRole('img', { name: /Contorno do talhão/ }).locator('text')).toHaveCount(n)
    // Tabela dos pontos: uma linha por ponto, com coordenada planejada e última leitura com data e hora.
    const tabela = page.getByRole('region', { name: /Tabela dos pontos/ })
    await expect(tabela.getByRole('row')).toHaveCount(n + 1)
    await expect(tabela.getByText(/-13,\d{6} \/ -55,\d{6}/).first()).toBeVisible()
    await expect(tabela.getByText(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/).first()).toBeVisible()
    // Cada ficha tem pelo menos um registro com todos os campos pedidos.
    const ficha = page.locator('article[data-ponto="1"]')
    await expect(ficha.getByRole('heading', { name: 'Ponto 1' })).toBeVisible()
    const reg = ficha.locator('[data-registro]').first()
    for (const rotulo of ['Método', 'Onde olhar', 'Coletado por', 'Responsável técnico', 'Posição', 'Coordenadas (lat / lon)', 'Amostragem', 'Estádio da soja', 'Protocolo', 'Fonte da decisão']) {
      await expect(reg.getByText(rotulo, { exact: true }), rotulo).toBeVisible()
    }
    await expect(reg).toContainText(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/) // data e hora do registro
    // Na demonstração a posição é simulada (igual à planejada): o ponto planejado não é repetido. A duração vem junto do horário.
    await expect(reg.getByText('Ponto planejado (lat / lon)', { exact: true })).toHaveCount(0)
    await expect(reg.getByText('Duração', { exact: true })).toHaveCount(0)
    await expect(reg.getByText(/\d{2}:\d{2} às \d{2}:\d{2} \(/)).toBeVisible()
    await expect(reg).toContainText(/Pano de batida/) // método de coleta
    await expect(page.getByRole('heading', { name: 'Fichas dos pontos' })).toBeVisible()
  })

  test('as fotos dos registros saem no relatório', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/talhoes/T-01/relatorio')
    await expect(page.getByRole('heading', { level: 1, name: 'T-01 Mirante' })).toBeVisible()
    const fotos = page.getByRole('img', { name: 'Foto de evidência do ponto' })
    await expect(fotos.first()).toBeVisible()
    // Todas carregadas de verdade (não ficam quebradas no PDF).
    await expect.poll(() => fotos.evaluateAll((els) => els.every((e) => (e as HTMLImageElement).complete && (e as HTMLImageElement).naturalWidth > 0))).toBe(true)
  })

  test('correção e registro desfeito aparecem no relatório com autor, data e motivo, sem sumir', async ({ page }) => {
    await carregarDemo(page)
    await page.goto('/#/coleta')
    await page.getByLabel('Talhão', { exact: true }).selectOption({ label: 'T-04 Cabeceira' })
    await expect(page.getByText('Ponto 1 de 10')).toBeVisible()
    await informarPlantas(page)
    await page.getByRole('button', { name: 'Registrar achado' }).click()
    await page.getByRole('dialog').getByLabel('Estádio fenológico').waitFor()
    const d = page.getByRole('dialog')
    const nome = d.getByPlaceholder('Nome e sobrenome')
    if (await nome.isVisible()) await nome.fill('Ana Teste')
    await d.getByRole('radio', { name: 'Adulto' }).click()
    await d.getByRole('button', { name: 'Aumentar' }).click()
    await d.getByRole('button', { name: 'Salvar registro' }).click()
    await expect(d).toBeHidden()
    await page.getByRole('region', { name: 'Registro salvo' }).getByRole('button', { name: 'Ver ficha' }).click()
    const fichaTela = page.getByRole('dialog', { name: /Ficha do ponto 1/ })
    await fichaTela.getByRole('button', { name: 'Corrigir' }).click()
    await fichaTela.getByLabel('Observação').fill('contagem refeita')
    await fichaTela.getByLabel('Motivo da correção').fill('Contei de novo no pano')
    await fichaTela.getByRole('button', { name: 'Salvar correção' }).click()
    await expect(fichaTela.locator('[data-estado="corrigida"]')).toBeVisible()

    await page.goto('/#/talhoes/T-04/relatorio')
    const ponto1 = page.locator('article[data-ponto="1"]')
    await expect(ponto1.locator('[data-registro]')).toHaveCount(2) // a versão 1 e a 2
    await expect(ponto1.locator('[data-estado="corrigida"]')).toContainText('substituída por correção')
    await expect(ponto1.locator('[data-registro]').last()).toContainText('· versão 2') // o título da versão (o protocolo "versão 2026-11" não tem o "· ")
    await expect(ponto1.getByText(/Corrigido por Ana Teste em \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}: Contei de novo no pano/)).toBeVisible()
  })

  test('o PDF sai em tema claro mesmo com o app no escuro, e o título vira o nome do arquivo', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await carregarDemo(page)
    await page.goto('/#/talhoes/T-01/relatorio')
    await expect(page.getByRole('heading', { level: 1, name: 'T-01 Mirante' })).toBeVisible()
    await page.emulateMedia({ colorScheme: 'dark', media: 'print' })
    const cores = await page.evaluate(() => {
      const luz = (css: string) => { const m = css.match(/\d+(\.\d+)?/g)!.map(Number); return (0.2126 * m[0]! + 0.7152 * m[1]! + 0.0722 * m[2]!) / 255 }
      return { texto: luz(getComputedStyle(document.querySelector('article h1')!).color), fundo: luz(getComputedStyle(document.body).backgroundColor) }
    })
    expect(cores.fundo).toBeGreaterThan(0.9) // papel branco
    expect(cores.texto).toBeLessThan(0.3) // texto escuro: legível no papel
    // Ao gerar o PDF, o título da página vira o nome sugerido do arquivo.
    await page.emulateMedia({ colorScheme: 'dark', media: 'screen' })
    await page.evaluate(() => { (window as unknown as { __titulos: string[] }).__titulos = []; window.print = () => { (window as unknown as { __titulos: string[] }).__titulos.push(document.title) } })
    await page.getByRole('button', { name: 'Gerar PDF' }).click()
    await expect.poll(() => page.evaluate(() => (window as unknown as { __titulos: string[] }).__titulos[0] ?? '')).toMatch(/^Relatorio_t-01-mirante_\d{4}-\d{2}-\d{2}$/)
  })
})
