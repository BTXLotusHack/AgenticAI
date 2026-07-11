import { defineConfig } from '@playwright/test';

export default defineConfig({
  expect: {
    timeout: 7_500,
  },
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: true,
  outputDir: 'test-results',
  projects: [
    {
      name: 'desktop-chromium',
      use: { viewport: { height: 900, width: 1440 } },
    },
    {
      name: 'mobile-chromium',
      use: {
        hasTouch: true,
        isMobile: true,
        viewport: { height: 844, width: 390 },
      },
    },
    {
      name: 'reduced-motion-chromium',
      use: {
        contextOptions: { reducedMotion: 'reduce' },
        viewport: { height: 800, width: 1280 },
      },
    },
  ],
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  retries: process.env.CI ? 2 : 0,
  testDir: './e2e',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm.cmd run dev -- --host 127.0.0.1 --port 4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: 'http://127.0.0.1:4173',
  },
  workers: 2,
});
