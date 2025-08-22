interface InjectionState {
  [tabId: number]: Set<string>;
}

class ScriptInjector {
  private injectedScripts: InjectionState = {};
  
  private async validateTab(tab: chrome.tabs.Tab): Promise<boolean> {
    if (!tab?.id || !tab.url) {
      console.warn('Invalid tab provided for script injection');
      return false;
    }

    if (tab.url.startsWith('chrome://') || 
        tab.url.startsWith('chrome-extension://') || 
        tab.url.startsWith('moz-extension://') ||
        tab.url.startsWith('edge://')) {
      console.warn('Cannot inject scripts into browser internal pages');
      return false;
    }

    return true;
  }

  private async checkScriptingPermission(tab: chrome.tabs.Tab): Promise<boolean> {
    if (!tab.url) return false;
    
    try {
      const url = new URL(tab.url);
      
      if (url.protocol === 'file:' || url.protocol === 'data:' || url.protocol === 'blob:') {
        console.warn(`Cannot inject scripts into ${url.protocol} URLs`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error validating URL:', error);
      return false;
    }
  }

  private hasScriptBeenInjected(tabId: number, scriptPath: string): boolean {
    return this.injectedScripts[tabId]?.has(scriptPath) || false;
  }

  private markScriptAsInjected(tabId: number, scriptPath: string): void {
    if (!this.injectedScripts[tabId]) {
      this.injectedScripts[tabId] = new Set();
    }
    this.injectedScripts[tabId].add(scriptPath);
  }

  private cleanupTabState(tabId: number): void {
    delete this.injectedScripts[tabId];
  }

  async injectScript(
    tab: chrome.tabs.Tab, 
    scriptPath: string, 
    options: {
      preventDuplicates?: boolean;
      world?: chrome.scripting.ExecutionWorld;
      allFrames?: boolean;
    } = {}
  ): Promise<boolean> {
    const { preventDuplicates = true, world = 'ISOLATED', allFrames = false } = options;

    if (!(await this.validateTab(tab))) {
      return false;
    }

    if (!(await this.checkScriptingPermission(tab))) {
      return false;
    }

    if (preventDuplicates && this.hasScriptBeenInjected(tab.id!, scriptPath)) {
      console.log(`Script ${scriptPath} already injected in tab ${tab.id}`);
      return true;
    }

    try {
      const fullScriptPath = chrome.runtime.getURL(scriptPath);
      
      await chrome.scripting.executeScript({
        target: { 
          tabId: tab.id!,
          allFrames
        },
        files: [scriptPath],
        world
      });

      this.markScriptAsInjected(tab.id!, scriptPath);
      console.log(`Successfully injected script: ${scriptPath} into tab ${tab.id}`);
      
      return true;
    } catch (error) {
      console.error(`Failed to inject script ${scriptPath}:`, error);
      return false;
    }
  }

  async injectFunction<T extends any[]>(
    tab: chrome.tabs.Tab,
    func: (...args: T) => any,
    args?: T,
    options: {
      world?: chrome.scripting.ExecutionWorld;
      allFrames?: boolean;
    } = {}
  ): Promise<any[]> {
    const { world = 'ISOLATED', allFrames = false } = options;

    if (!(await this.validateTab(tab))) {
      throw new Error('Invalid tab for function injection');
    }

    if (!(await this.checkScriptingPermission(tab))) {
      throw new Error('No permission to inject function');
    }

    try {
      const injection: any = {
        target: { 
          tabId: tab.id!,
          allFrames
        },
        func,
        world
      };
      
      if (args !== undefined) {
        injection.args = args;
      }
      
      const results = await chrome.scripting.executeScript(injection);

      console.log(`Successfully executed function in tab ${tab.id}`);
      return results;
    } catch (error) {
      console.error('Failed to execute function:', error);
      throw error;
    }
  }

  setupTabCleanup(): void {
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.cleanupTabState(tabId);
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
      if (changeInfo.status === 'loading' && changeInfo.url) {
        this.cleanupTabState(tabId);
      }
    });
  }
}

const scriptInjector = new ScriptInjector();
scriptInjector.setupTabCleanup();

export default scriptInjector;