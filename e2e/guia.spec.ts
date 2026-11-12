import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { carregarDemo, esperarAnimacoes } from './ajuda'

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
    test.slow() // mapa por software + gravação de 5 registros: sob carga paralela passa dos 30 s
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

  for (const [largura, altura] of [[360, 640], [390, 844], [412, 915]] as const) {
    test(`tela cheia em ${largura}×${altura}: mapa ocupa ≥ 60%, distância numa linha e toques ≥ 44 px`, async ({ page, context }) => {
      await page.setViewportSize({ width: largura, height: altura })
      await abrirColetaDoT04(page)
      const p1 = await posicaoDoPonto(page, 'T-04', 1)
      await context.setGeolocation(metrosAoNorte(p1, 760))
      await page.getByRole('button', { name: 'Ir até o ponto' }).click()
      const distancia = page.getByText(/^(750|760|770) m$/)
      await expect(distancia).toBeVisible()

      // Sem cabeçalho, seletor, barra de progresso nem legenda: só mapa, faixa e ação.
      await expect(page.getByRole('progressbar')).toHaveCount(0)
      await expect(page.getByLabel('Talhão', { exact: true })).toHaveCount(0)
      await expect(page.getByRole('list', { name: 'Legenda do mapa' })).toHaveCount(0)
      // A tela de navegação cobre a viewport inteira (a barra de abas fica por baixo, sem receber toque).
      const tela = (await page.getByRole('region', { name: /Guia até o ponto 1/ }).boundingBox())!
      expect(tela).toMatchObject({ x: 0, y: 0, width: largura, height: altura })

      const mapa = (await page.locator('.maplibregl-map').boundingBox())!
      expect(mapa.height / altura).toBeGreaterThanOrEqual(0.6)

      // A distância e a precisão não quebram em duas linhas.
      for (const alvo of [distancia, page.getByText(/^GPS ±\d+ m$/)]) {
        const linhas = await alvo.evaluate((el) => el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight))
        expect(Math.round(linhas)).toBe(1)
      }

      // Alvos de toque de pelo menos 44 px e nada estourando a tela.
      for (const nome of ['Parar o guia', 'Ponto anterior', 'Próximo ponto', /Cheguei · Registrar/]) {
        const b = (await page.getByRole('button', { name: nome }).boundingBox())!
        expect(b.width, String(nome)).toBeGreaterThanOrEqual(43.9) // 44 px com folga para arredondamento do layout
        expect(b.height, String(nome)).toBeGreaterThanOrEqual(43.9) // 44 px com folga para arredondamento do layout
        expect(b.x + b.width).toBeLessThanOrEqual(largura + 0.5)
      }
      const estoura = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
      expect(estoura).toBe(false)
    })
  }

  test('ao chegar, um toque abre o registro e salvar leva ao próximo ponto, com o GPS real', async ({ page, context }) => {
    test.slow() // mapa por software + gravação de 5 registros: sob carga paralela passa dos 30 s
    await abrirColetaDoT04(page)
    const p1 = await posicaoDoPonto(page, 'T-04', 1)
    await context.setGeolocation(metrosAoNorte(p1, 0))
    await page.getByRole('button', { name: 'Ir até o ponto' }).click()
    await expect(page.getByText('Registre o que encontrou.')).toBeVisible()

    await page.getByRole('button', { name: /Cheguei · Registrar/ }).click()
    const gaveta = page.getByRole('dialog', { name: /Ponto 1: o que você encontrou/ })
    await expect(gaveta.getByRole('button', { name: 'Sem ocorrência' })).toBeVisible()
    await expect(gaveta.getByRole('button', { name: 'Registrar achado' })).toBeVisible()
    await expect(gaveta.getByRole('button', { name: 'Não sei o que é' })).toBeVisible()

    await gaveta.getByRole('button', { name: 'Sem ocorrência' }).click()
    await page.getByLabel('Seu nome').fill('Ana Teste')
    await page.getByRole('button', { name: 'Continuar' }).click()
    // O guia continua ligado e passa a apontar para o próximo ponto (o aviso na tela some sozinho, então o teste olha o estado final).
    await expect(page.getByText(/Ponto 2 · /)).toBeVisible({ timeout: 20_000 })

    // O registro saiu com a posição do GPS (não a planejada) e com os campos da v2.
    const lerRegistros = () => page.evaluate(() => new Promise<Record<string, unknown>[]>((ok, erro) => {
      const abrir = indexedDB.open('sentinela')
      abrir.onerror = () => erro(abrir.error)
      abrir.onsuccess = () => {
        const r = abrir.result.transaction('registros').objectStore('registros').getAll()
        r.onsuccess = () => ok((r.result as Record<string, unknown>[]).filter((x) => x.amostrador === 'Ana Teste'))
      }
    }))
    await expect.poll(async () => (await lerRegistros()).length, { timeout: 15_000 }).toBe(5) // um zero por alvo
    const reg = (await lerRegistros())[0]!
    expect(reg.posicaoSimulada).toBe(false)
    expect(reg.schema).toBe(2)
    expect(reg.fusoHorario).toBe('America/Cuiaba')
    expect(String(reg.metodo).length).toBeGreaterThan(5)
  })

  test('sem o guia, a Coleta mantém cabeçalho, progresso e legenda', async ({ page }) => {
    await abrirColetaDoT04(page)
    await expect(page.getByRole('progressbar', { name: 'Progresso da coleta' })).toBeVisible()
    await expect(page.getByRole('list', { name: 'Legenda do mapa' })).toBeVisible()
  })

  test('faixa do guia não tem violações WCAG 2.1 AA', async ({ page, context }) => {
    await abrirColetaDoT04(page)
    const p1 = await posicaoDoPonto(page, 'T-04', 1)
    await context.setGeolocation(metrosAoNorte(p1, 500))
    await page.getByRole('button', { name: 'Ir até o ponto' }).click()
    await expect(page.getByText(/^(490|500|510) m$/)).toBeVisible()
    await esperarAnimacoes(page)
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

  test('desenhar o talhão andando: "Marcar canto aqui" usa a posição exata do GPS em cada canto', async ({ page, context }) => {
    await context.setGeolocation({ latitude: -15.601, longitude: -56.097, accuracy: 8 })
    await page.goto('/#/talhoes/novo')
    await expect(page.getByText(/GPS ±8 m · bom/)).toBeVisible()
    const cantos = [[-15.601, -56.097], [-15.601, -56.0965], [-15.6015, -56.0965]] as const
    for (const [latitude, longitude] of cantos) {
      await context.setGeolocation({ latitude, longitude, accuracy: 8 })
      await page.waitForTimeout(500) // o aparelho entrega a nova posição
      await page.getByRole('button', { name: 'Marcar canto aqui' }).click()
    }
    await expect(page.getByText(/^3 cantos/)).toBeVisible()
  })

  test('com GPS fraco, não marca o canto e explica o que fazer', async ({ page, context }) => {
    await context.setGeolocation({ latitude: -15.601, longitude: -56.097, accuracy: 120 })
    await page.goto('/#/talhoes/novo')
    await expect(page.getByText(/GPS ±120 m · fraco/)).toBeVisible()
    await page.getByRole('button', { name: 'Marcar canto aqui' }).click()
    await expect(page.getByText(/Precisão do GPS ±120 m/)).toBeVisible()
    await expect(page.getByText('Nenhum canto')).toBeVisible()
  })

  test('a primeira leitura grosseira não fixa o mapa: ele recentraliza quando o GPS melhora', async ({ page, context }) => {
    await context.setGeolocation({ latitude: -14.2, longitude: -55.0, accuracy: 3000 }) // palpite de rede, longe de onde a pessoa está
    await page.goto('/#/talhoes/novo')
    await page.waitForTimeout(900)
    await context.setGeolocation({ latitude: -15.601, longitude: -56.097, accuracy: 9 }) // GPS de verdade
    const eu = page.getByRole('img', { name: 'Sua posição' })
    await expect(eu).toBeVisible()
    await page.waitForTimeout(2200)
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
