function injectScript(path: string) {
  const script = document.createElement("script");
  script.setAttribute("type", "text/javascript");
  script.setAttribute("src", path);

  script.onerror = (error) => console.error("Script failed to load:", path, error);

  // Try head first, then body, then documentElement as fallback
  const target = document.head || document.body || document.documentElement;
  target.appendChild(script);
}

function injectCSS(path: string) {
  const css = document.createElement("link");
  css.setAttribute("rel", "stylesheet");
  css.setAttribute("type", "text/css");
  css.setAttribute("href", path);

  css.onerror = (error) => console.error("CSS failed to load:", path, error);

  const target = document.head || document.documentElement;
    target.appendChild(css);
}

function ensureInjection() {
  const scriptUrl = chrome.runtime.getURL("build/injected.js");
  const cssUrl = chrome.runtime.getURL("build/injected.css");

  injectScript(scriptUrl);
  injectCSS(cssUrl);
}

// Wait for DOM to be ready before injecting
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ensureInjection);
} else {
  ensureInjection();
}

let resolvers: { [k: number]: any } = {};
let injectedScriptReady = false;

document.addEventListener('serenade-injected-script-ready', () => {
  injectedScriptReady = true;
});

document.addEventListener(`serenade-injected-script-command-response`, (e: any) => {
  if (resolvers[e.detail.id]) {
    resolvers[e.detail.id](e.detail);
    delete resolvers[e.detail.id];
  }
});

async function waitForInjectedScript(timeout = 10000): Promise<void> {
  if (injectedScriptReady) return;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Injected script ready timeout'));
    }, timeout);

    const handler = () => {
      clearTimeout(timer);
      document.removeEventListener('serenade-injected-script-ready', handler);
      resolve();
    };

    document.addEventListener('serenade-injected-script-ready', handler);
  });
}

async function sendMessageToInjectedScript(data: any): Promise<any> {
  try {
    await waitForInjectedScript();
  } catch (error) {
    return { error: 'Injected script not ready' };
  }

  return new Promise((resolve) => {
    const id = Math.random();

    const timeout = setTimeout(() => {
      if (resolvers[id]) {
        delete resolvers[id];
        resolve({ error: 'Injected script timeout' });
      }
    }, 5000);

    const originalResolve = resolve;
    resolvers[id] = (responseData: any) => {
      clearTimeout(timeout);
      originalResolve(responseData);
    };

    document.dispatchEvent(
      new CustomEvent('serenade-injected-script-command-request', {
        detail: { id, data },
      })
    );
  });
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === "injected-script-command-request") {
    // Return a promise to handle async operations properly in MV3
    (async () => {
      try {
        const response = await sendMessageToInjectedScript(request.data);
        sendResponse(response);
      } catch (error) {
        sendResponse({ error: "Injected script communication failed" });
      }
    })();
    return true; // Indicate we will send response asynchronously
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const settings = await chrome.storage.sync.get(["alwaysShowClickables"]);

    // Wait a bit more for injected script to fully initialize
    await new Promise(resolve => setTimeout(resolve, 1000));

    await sendMessageToInjectedScript({
      type: "clearOverlays",
    });

    await sendMessageToInjectedScript({
      type: "updateSettings",
      ...settings,
    });
  } catch (error) {
    console.warn("Failed to initialize injected script:", error);
  }
});
