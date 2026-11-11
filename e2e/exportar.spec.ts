import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { carregarDemo } from './ajuda'

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
    await expect(page.getByRole('heading', { name: `Registros (${total})` })).toBeVisible()
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
    await expect(page.getByRole('button', { name: 'Imprimir / Salvar como PDF' })).toBeHidden()
    await expect(page.getByRole('heading', { level: 1, name: 'T-01 Mirante' })).toBeVisible()
  })
})
