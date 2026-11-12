import type { Page } from '@playwright/test'

/** Carrega a demonstração pelo Perfil (caminho do usuário) e espera os dados aparecerem. */
export async function carregarDemo(page: Page) {
  await page.goto('/#/perfil')
  await page.getByRole('button', { name: 'Carregar demonstração' }).click()
  await page.getByText('Demonstração carregada').waitFor()
}

export const ROTAS = ['/', '/talhoes', '/talhoes/novo', '/talhoes/T-01', '/talhoes/T-01/relatorio', '/coleta', '/alertas', '/diagnostico', '/diagnostico/tecnico', '/biblioteca', '/perfil'] as const

/** Gera um PNG real no navegador (a compressão de fotos do app exige uma imagem decodificável). */
export async function pngBase64(page: Page): Promise<Buffer> {
  const b64 = await page.evaluate(() => {
    const c = document.createElement('canvas')
    c.width = 64
    c.height = 48
    const g = c.getContext('2d')!
    g.fillStyle = '#3a7d44'
    g.fillRect(0, 0, 64, 48)
    return c.toDataURL('image/png').split(',')[1]!
  })
  return Buffer.from(b64, 'base64')
}

export async function anexarFoto(page: Page) {
  const buffer = await pngBase64(page)
  await page.locator('input[type=file]:not([capture])').setInputFiles({ name: 'folha.png', mimeType: 'image/png', buffer })
  await page.getByRole('button', { name: 'Remover foto' }).first().waitFor()
}

/**
 * Espera as animações e transições terminarem (a gaveta, por exemplo, surge em 0,2 s). Medir contraste no meio delas
 * dá falso positivo, principalmente em máquina lenta como a do CI.
 */
export async function esperarAnimacoes(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const finita = (a: Animation) => Number.isFinite(a.effect?.getComputedTiming().endTime as number)
    for (let i = 0; i < 3; i++) await Promise.all(document.getAnimations().filter(finita).map((a) => a.finished.catch(() => undefined))) // transições novas podem nascer enquanto outras terminam
  })
}
