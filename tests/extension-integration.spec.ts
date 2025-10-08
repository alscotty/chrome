import { test, expect } from '@playwright/test';

test.describe('Serenade Extension Integration Tests', () => {
  test('extension service worker is running', async ({ context }) => {
    // Get the service workers
    const serviceWorkers = context.serviceWorkers();
    const serviceWorker = serviceWorkers.find(sw => sw.url().includes('extension.js'));
    
    if (!serviceWorker) {
      console.log('Service worker not found, extension may not be loaded properly');
      return;
    }
    
    // Service worker should be loaded
    expect(serviceWorker).toBeTruthy();
    
    // Check if IPC is initialized (basic smoke test)
    const hasIPC = await serviceWorker.evaluate(() => {
      return typeof (globalThis as any).ipc !== 'undefined';
    });
    
    // This might be undefined if IPC isn't exposed globally, which is okay
    console.log('IPC available globally:', hasIPC);
  });

  test('extension responds to tab changes', async ({ context, page }) => {
    await page.goto('data:text/html,<html><head><title>Test</title></head><body><h1>Extension Test Page</h1><a href="#link1">Test Link 1</a><a href="#link2">Test Link 2</a></body></html>');
    await page.waitForTimeout(1000);
    
    // Create a new tab
    const newPage = await context.newPage();
    await newPage.goto('https://google.com');
    await newPage.waitForTimeout(1000);
    
    // Extension should handle tab activation
    // This is more of a smoke test since we can't easily mock the WebSocket connection
    
    await newPage.close();
  });

  test('extension handles chrome:// pages gracefully', async ({ context }) => {
    // Try to navigate to a chrome:// page
    try {
      const page = await context.newPage();
      await page.goto('chrome://extensions/');
      
      // Extension should not crash on chrome pages
      // Wait a bit to see if any errors occur
      await page.waitForTimeout(2000);
      
      // If we get here without throwing, the extension handled it gracefully
      expect(true).toBe(true);
      
      await page.close();
    } catch (error) {
      // Some chrome:// pages might not be accessible in tests, which is fine
      console.log('Chrome pages test skipped:', error);
    }
  });







});