import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  // Underscore-prefixed specs are asset-generation utilities (screenshots,
  // banner). Run them explicitly with `npx playwright test _screenshots` or
  // `_banner`; keep them out of the CI pass.
  testIgnore: /\/_.*\.spec\.ts$/,
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
});
