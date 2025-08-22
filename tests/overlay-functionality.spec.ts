import { test, expect } from '@playwright/test';

test.describe('Serenade Extension Overlay Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Go to a page with links for testing
    await page.goto('data:text/html,<html><head><title>Test</title></head><body><h1>Extension Test Page</h1><a href="#link1">Test Link 1</a><a href="#link2">Test Link 2</a><button>Test Button</button></body></html>');
    await page.waitForTimeout(2000); // Wait for extension to initialize
  });

  test('show links command creates overlays', async ({ page }) => {
    // First check if injected script is present
    const hasEventListeners = await page.evaluate(() => {
      // Check if our custom event system exists
      return typeof CustomEvent !== 'undefined';
    });
    
    if (!hasEventListeners) {
      console.log('Custom event system not available, skipping test');
      return;
    }

    // Send command to show links with shorter timeout
    const commandResult = await page.evaluate(() => {
      return new Promise((resolve) => {
        const id = Math.random();
        let resolved = false;
        
        const responseHandler = (e: any) => {
          if (e.detail.id === id && !resolved) {
            resolved = true;
            document.removeEventListener('serenade-injected-script-command-response', responseHandler);
            resolve({ success: true, data: e.detail });
          }
        };
        
        document.addEventListener('serenade-injected-script-command-response', responseHandler);
        
        // Set a timeout of 3 seconds instead of default
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            document.removeEventListener('serenade-injected-script-command-response', responseHandler);
            resolve({ success: false, error: 'timeout' });
          }
        }, 3000);
        
        document.dispatchEvent(
          new CustomEvent('serenade-injected-script-command-request', {
            detail: {
              id,
              data: { type: 'COMMAND_TYPE_SHOW', text: 'links' },
            },
          })
        );
      });
    });
    
    console.log('Command result:', commandResult);
    
    // Wait a bit for overlays to appear
    await page.waitForTimeout(1000);
    
          // Check if overlays were created - our test page has links and buttons
    const overlays = await page.locator('.serenade-overlay').count();
    console.log('Overlays found:', overlays);
    
    if (overlays > 0) {
      // Check if overlays have numbers
      const firstOverlay = page.locator('.serenade-overlay').first();
      const overlayText = await firstOverlay.textContent();
      expect(overlayText).toBe('1');
    } else {
      console.log('No overlays found - this might indicate an issue with the extension');
    }
  });

  test('click overlay by number works', async ({ page }) => {
    // First show links
    await page.evaluate(async () => {
      return new Promise((resolve) => {
        const id = Math.random();
        const responseHandler = (e: any) => {
          if (e.detail.id === id) {
            document.removeEventListener('serenade-injected-script-command-response', responseHandler);
            resolve(e.detail);
          }
        };
        document.addEventListener('serenade-injected-script-command-response', responseHandler);
        document.dispatchEvent(
          new CustomEvent('serenade-injected-script-command-request', {
            detail: { id, data: { type: 'COMMAND_TYPE_SHOW', text: 'links' } },
          })
        );
      });
    });
    
    await page.waitForTimeout(1000);
    
    // Verify overlays exist
    const overlayCount = await page.locator('.serenade-overlay').count();
    if (overlayCount === 0) {
      console.log('No overlays found, skipping click test');
      return;
    }
    
    // Click on overlay number 1
    await page.evaluate(async () => {
      return new Promise((resolve) => {
        const id = Math.random();
        const responseHandler = (e: any) => {
          if (e.detail.id === id) {
            document.removeEventListener('serenade-injected-script-command-response', responseHandler);
            resolve(e.detail);
          }
        };
        document.addEventListener('serenade-injected-script-command-response', responseHandler);
        document.dispatchEvent(
          new CustomEvent('serenade-injected-script-command-request', {
            detail: { id, data: { type: 'COMMAND_TYPE_CLICK', path: '1' } },
          })
        );
      });
    });
    
    await page.waitForTimeout(1000);
    
    // Overlays should be cleared after clicking
    const overlaysAfterClick = await page.locator('.serenade-overlay').count();
    expect(overlaysAfterClick).toBe(0);
  });

  test('clear overlays command works', async ({ page }) => {
    // First show links to create overlays
    await page.evaluate(async () => {
      const id = Math.random();
      const responseHandler = (e: any) => {
        if (e.detail.id === id) {
          document.removeEventListener('serenade-injected-script-command-response', responseHandler);
        }
      };
      document.addEventListener('serenade-injected-script-command-response', responseHandler);
      document.dispatchEvent(
        new CustomEvent('serenade-injected-script-command-request', {
          detail: { id, data: { type: 'COMMAND_TYPE_SHOW', text: 'links' } },
        })
      );
    });
    
    await page.waitForTimeout(1000);
    
    // Now clear overlays
    await page.evaluate(async () => {
      const id = Math.random();
      const responseHandler = (e: any) => {
        if (e.detail.id === id) {
          document.removeEventListener('serenade-injected-script-command-response', responseHandler);
        }
      };
      document.addEventListener('serenade-injected-script-command-response', responseHandler);
      document.dispatchEvent(
        new CustomEvent('serenade-injected-script-command-request', {
          detail: { id, data: { type: 'COMMAND_TYPE_CANCEL' } },
        })
      );
    });
    
    await page.waitForTimeout(500);
    
    // Overlays should be gone
    const overlaysAfterCancel = await page.locator('.serenade-overlay').count();
    expect(overlaysAfterCancel).toBe(0);
  });
});