import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end configuration.
 *
 * This file used to import `lovable-agent-playwright-config`, a package that
 * appears in neither `package.json` nor `node_modules` — so the config could
 * never load and the suite could never run, which is one reason there were no
 * tests to run. It now stands on `@playwright/test` alone, which is already a
 * devDependency; nothing new was added.
 *
 * The dev server is started by Playwright, and reused if one is already up, so
 * `npx playwright test` is the whole command.
 */

const PORT = 5173;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  // These walk whole flows; a step that needs a second is normal.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Paula is a Polish product; the tests read what a Polish user reads.
    locale: 'pl-PL',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- --port ${PORT} --host 127.0.0.1`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
