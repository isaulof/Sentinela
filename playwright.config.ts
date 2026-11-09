import { defineConfig, devices } from '@playwright/test'

/** E2E contra o build de produção (o mesmo que vai para o GitHub Pages). */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://localhost:4173/', trace: 'retain-on-failure', locale: 'pt-BR', timezoneId: 'America/Cuiaba' },
  webServer: { command: 'npm run build && npx vite preview --port 4173 --strictPort', url: 'http://localhost:4173/', reuseExistingServer: !process.env.CI, timeout: 120_000 },
  projects: [
    { name: 'celular', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { viewport: { width: 1360, height: 860 } } },
  ],
})
