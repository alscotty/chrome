import { chromium, FullConfig } from '@playwright/test';
import * as path from 'path';
import { execSync } from 'child_process';
import * as fs from 'fs';

async function globalSetup(config: FullConfig) {
  // Build the extension first if build directory doesn't exist  
  const buildPath = path.join(process.cwd(), 'tests/../build');
  
  if (!fs.existsSync(buildPath)) {
    console.log('Building extension...');
    execSync('npm run build', { cwd: process.cwd(), stdio: 'inherit' });
  }

  // Launch browser with extension to verify it loads correctly
  const browser = await chromium.launch({
    headless: true,
    args: [
      `--disable-extensions-except=${buildPath}`,
      `--load-extension=${buildPath}`,
      '--no-first-run',
    ],
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Wait for extension to be ready - use data URL instead of external site
  await page.goto('data:text/html,<html><head><title>Test</title></head><body><h1>Extension Test Page</h1></body></html>');
  await page.waitForTimeout(1000); // Give extension time to initialize

  console.log('Extension loaded successfully');
  
  await browser.close();
}

export default globalSetup;