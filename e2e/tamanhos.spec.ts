import { expect } from '@playwright/test'
import { test } from './fixtures'
import { carregarDemo, ROTAS } from './ajuda'

/** Telas-chave em todos os tamanhos do plano (+ paisagem): nada pode estourar a largura nem esconder texto para fora da tela. */
const TAMANHOS = [[360, 640], [390, 844], [412, 915], [768, 1024], [1280, 800], [640, 360]] as const

for (const [largura, altura] of TAMANHOS) {
  test.describe(`${largura}×${altura}`, () => {
    test.use({ viewport: { width: largura, height: altura } })
    for (const rota of ROTAS) {
      test(`${rota} não estoura a largura`, async ({ page }) => {
        test.slow() // mapas renderizam por software
        await carregarDemo(page)
        await page.goto(`/#${rota}`)
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(500)
        const r = await page.evaluate(() => {
          const de = document.documentElement
          const larguraTela = de.clientWidth
          // elementos visíveis cuja borda direita passa da tela, fora de áreas que rolam de propósito e do mapa
          const fora: string[] = []
          for (const el of document.querySelectorAll<HTMLElement>('body *')) {
            if (el.closest('.maplibregl-map, [role="region"][tabindex="0"], .overflow-x-auto, [data-testid="faixa-rolavel"], dialog:not([open]), .sr-only, svg')) continue
            const b = el.getBoundingClientRect()
            if (b.width === 0 || b.height === 0) continue
            const cs = getComputedStyle(el)
            if (cs.position === 'fixed' && b.right <= larguraTela + 1) continue
            if (b.right > larguraTela + 1 && cs.visibility !== 'hidden' && cs.display !== 'none') fora.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ').slice(0, 3).join('.')} (${Math.round(b.right)}px)`)
          }
          return { estoura: de.scrollWidth > larguraTela, fora: fora.slice(0, 5) }
        })
        expect(r.estoura, 'a página rola para o lado').toBe(false)
        expect(r.fora, 'elementos passando da borda direita').toEqual([])
      })
    }
  })
}
