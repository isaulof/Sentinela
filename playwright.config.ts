import { defineConfig, devices } from '@playwright/test'

/** E2E contra o build de produção (o mesmo que vai para o GitHub Pages). */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // O computador do CI é compartilhado e tem poucos processadores; o mapa é desenhado por software. Prazos maiores lá evitam falso alarme.
  timeout: process.env.CI ? 90_000 : 30_000,
  expect: { timeout: process.env.CI ? 15_000 : 5_000 },
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://localhost:4173/', trace: 'retain-on-failure', locale: 'pt-BR', timezoneId: 'America/Cuiaba', actionTimeout: process.env.CI ? 20_000 : 10_000 },
  webServer: { command: 'npm run build && npx vite preview --port 4173 --strictPort', url: 'http://localhost:4173/', reuseExistingServer: !process.env.CI, timeout: 120_000 },
  projects: [
    // Densidade 1: o layout (px CSS) é o mesmo e o mapa por software desenha ~7x menos pixels.
    { name: 'celular', use: { ...devices['Pixel 7'], deviceScaleFactor: 1 } },
    { name: 'desktop', use: { viewport: { width: 1360, height: 860 } } },
  ],
})
