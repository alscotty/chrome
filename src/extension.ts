import ExtensionCommandHandler from "./extension-command-handler";
import IPC from "./ipc";
import scriptInjector from "./script-injector";

const ensureConnection = async () => {
  await ipc.ensureConnection();
  ipc.sendActive();
  ipc.sendHeartbeat();
};

const extensionCommandHandler = new ExtensionCommandHandler();
const ipc = new IPC(
  navigator.userAgent.includes("Brave")
    ? "brave"
    : navigator.userAgent.includes("Edg")
    ? "edge"
    : "chrome",
  extensionCommandHandler
);

chrome.runtime.onStartup.addListener(async () => {
  await ensureConnection();
});

chrome.alarms.create("keepAlive", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name == "keepAlive") {
    await ensureConnection();
  }
});

chrome.tabs.onActivated.addListener(async () => {
  await ensureConnection();
});

chrome.windows.onFocusChanged.addListener(async () => {
  await ensureConnection();
});

chrome.idle.onStateChanged.addListener(async (state) => {
  if (state == "active") {
    await ensureConnection();
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type == "reconnect") {
    // Handle async operations properly in MV3 service worker
    (async () => {
      await ensureConnection();
      if (sendResponse) sendResponse({ success: true });
    })();
    return true; // Indicate we will send response asynchronously
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab) {
    console.error('No tab provided to action click handler');
    return;
  }

  console.log(`Action clicked for tab: ${tab.id} - ${tab.url}`);

  const success = await scriptInjector.injectScript(tab, 'build/injected.js', {
    preventDuplicates: true,
    world: 'MAIN',
    allFrames: false
  });

  if (!success) {
    console.error('Failed to inject script via action click');
    chrome.action.setBadgeText({ text: '!', tabId: tab.id });
    chrome.action.setBadgeBackgroundColor({ color: '#ff0000', tabId: tab.id });
  } else {
    chrome.action.setBadgeText({ text: '✓', tabId: tab.id });
    chrome.action.setBadgeBackgroundColor({ color: '#00ff00', tabId: tab.id });
    
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '', tabId: tab.id });
    }, 3000);
  }
});

// The rest of this is adapted from the solution here:
// https://stackoverflow.com/questions/66618136/persistent-service-worker-in-chrome-extension/66618269
let lifeline: any = undefined;
keepAlive();

chrome.runtime.onConnect.addListener(port => {
  if (port.name === 'keepAlive') {
    lifeline = port;
    createKeepAliveAlarm();
    port.onDisconnect.addListener(createKeepAliveAlarm);
  }
});

function createKeepAliveAlarm() {
  chrome.alarms.create('keepAliveForced', { delayInMinutes: 4 });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepAliveForced') {
    lifeline?.disconnect();
    lifeline = null;
    keepAlive();
  }
});

async function keepAlive() {
  if (lifeline) {
    return;
  }
  for (const tab of await chrome.tabs.query({
    url: '*://*/*'
  })) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab!.id! },
        func: () => chrome.runtime.connect({ name: 'keepAlive' }),
      });
      chrome.tabs.onUpdated.removeListener(retryOnTabUpdate);
      return;
    } catch (e) {}
  }
  chrome.tabs.onUpdated.addListener(retryOnTabUpdate);
}

async function retryOnTabUpdate(tabId: any, info: any, tab: any) {
  if (info.url && /^(file|https?):/.test(info.url)) {
    keepAlive();
  }
}
