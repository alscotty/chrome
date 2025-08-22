import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Extensions can't run in parallel
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Only one worker for extension testing
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium-extension',
      use: {
        ...devices['Desktop Chrome'],
        headless: true, // Run tests headless to avoid popup windows
        channel: 'chrome',
        launchOptions: {
          args: [
            `--disable-extensions-except=${path.join(__dirname, './build')}`,
            `--load-extension=${path.join(__dirname, './build')}`,
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
          ],
        },
        contextOptions: {
          // Grant all permissions to the extension
          permissions: ['background-sync', 'notifications'],
        },
      },
    },
  ],

  // Global setup and teardown
  globalSetup: './tests/global-setup.ts',
});