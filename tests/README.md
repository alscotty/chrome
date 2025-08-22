# Serenade Extension Testing with Playwright

This directory contains Playwright tests for the Serenade Chrome extension.

## Setup

1. Install dependencies:
   ```bash
   npm install
   npx playwright install chromium
   ```

2. Build the extension:
   ```bash
   npm run build
   ```

## Running Tests

### One-time test run
```bash
npm run test:playwright
```

### Watch mode (auto-rebuild and test on changes)
```bash
npm run test:watch
```

### Interactive UI mode
```bash
npm run test:ui
```

### Debug mode
```bash
npm run test:debug
```

## Test Structure

- `extension-basic.spec.ts` - Basic extension loading and script injection tests
- `overlay-functionality.spec.ts` - Tests for the overlay numbering system (links, click numbers)
- `extension-integration.spec.ts` - Integration tests for service worker and popup

## How It Works

The tests automatically:
1. Build your extension
2. Load Chrome with your extension installed
3. Navigate to test pages
4. Simulate user interactions and extension commands
5. Verify expected behavior

## Benefits

- 🚀 **No manual reload** - Tests automatically rebuild and reload the extension
- 🔍 **Real browser testing** - Uses actual Chrome with your extension loaded
- ⚡ **Watch mode** - Automatically runs tests when you change code
- 🎯 **Isolated testing** - Each test gets a fresh browser context
- 📊 **Rich reporting** - HTML reports with screenshots on failure

## Writing New Tests

To add new tests, create `.spec.ts` files in this directory. Each test will automatically have access to a Chrome browser with your extension loaded.

Example:
```typescript
import { test, expect } from '@playwright/test';

test('my extension feature', async ({ page }) => {
  await page.goto('https://example.com');
  
  // Test your extension functionality here
  const result = await page.evaluate(() => {
    // Interact with your injected script
    return 'test result';
  });
  
  expect(result).toBe('expected value');
});
```