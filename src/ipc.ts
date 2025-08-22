import { v4 as uuidv4 } from "uuid";
import ExtensionCommandHandler from "./extension-command-handler";

export default class IPC {
  private app: string;
  private extensionCommandHandler: ExtensionCommandHandler;
  private connected: boolean = false;
  private id: string = "";
  private websocket?: WebSocket;
  private url: string = "ws://localhost:17373/";

  constructor(app: string, extensionCommandHandler: ExtensionCommandHandler) {
    this.app = app;
    this.extensionCommandHandler = extensionCommandHandler;
    this.id = app; // Two instances of chrome share the same service worker.
  }

  private onClose() {
    this.connected = false;
    this.setIcon();
  }

  private async onMessage(message: any) {
    if (typeof message == "string") {
      let request;
      try {
        request = JSON.parse(message);
      } catch (e) {
        return;
      }

      if (request.message == "response") {
        const result = await this.handle(request.data.response);
        if (result) {
          this.send("callback", {
            callback: request.data.callback,
            data: result,
          });
        }
      }
    }
  }

  private onOpen() {
    this.connected = true;
    this.sendActive();
    this.setIcon();
  }

  async ensureConnection(): Promise<void> {
    if (this.connected) {
      return;
    }

    return new Promise((resolve) => {
      try {
        this.websocket = new WebSocket(this.url);

        this.websocket.addEventListener("open", () => {
          this.onOpen();
          resolve();
        });

        this.websocket.addEventListener("close", () => {
          this.onClose();
        });

        this.websocket.addEventListener("message", (event) => {
          this.onMessage(event.data);
        });
      } catch (e) {
        console.error(e);
        this.connected = false;
        this.setIcon();
      }
    });
  }

  private async tab(): Promise<any> {
    const [result] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    return result;
  }

  private async sendMessageToContentScript(message: any): Promise<any> {
    let tab = await this.tab();
    if (!tab?.id) {
      return null;
    }

    if (tab.url?.startsWith("chrome://") || 
        tab.url?.startsWith("chrome-extension://") || 
        tab.url?.startsWith("moz-extension://") || 
        tab.url?.startsWith("edge://") ||
        tab.url?.startsWith("about:")) {
      console.warn('Cannot execute scripts on internal browser pages');
      return null;
    }

    try {
      console.log("IPC sending message to content script:", message);
      const result = await chrome.tabs.sendMessage(tab.id, message);
      console.log("Content script responded:", result);
      return result;
    } catch (error) {
      if (chrome.runtime.lastError) {
        console.warn(`Content script message failed: ${chrome.runtime.lastError.message}`);
      } else {
        console.warn("Content script message failed:", error);
      }
      return null;
    }
  }

  async handle(response: any): Promise<any> {
    let handlerResponse = null;
    if (response.execute) {
      for (const command of response.execute.commandsList) {
        if (command.type in (this.extensionCommandHandler as any)) {
          handlerResponse = await (this.extensionCommandHandler as any)[command.type](command);
        } else {
          handlerResponse = await this.sendMessageToContentScript({
            type: "injected-script-command-request",
            data: command,
          });
        }
      }
    }

    let result = {
      message: "completed",
      data: {},
    };

    if (handlerResponse) {
      result = { ...handlerResponse };
    }

    return result;
  }

  isConnected() {
    return this.connected;
  }

  sendActive() {
    this.send("active", {
      app: this.app,
      id: this.id,
    });
    this.setIcon();
  }

  sendHeartbeat() {
    this.send("heartbeat", {
      app: this.app,
      id: this.id,
    });
    this.setIcon();
  }

  send(message: string, data: any) {
    if (!this.connected || !this.websocket || this.websocket!.readyState != 1) {
      return false;
    }

    try {
      this.websocket!.send(JSON.stringify({ message, data }));
      return true;
    } catch (e) {
      this.connected = false;
      return false;
    }
  }

  setIcon() {
    const iconDir = this.isConnected() ? "icon_default" : "icon_disconnected";
    chrome.action.setIcon({
      path: {
        "16": `../img/${iconDir}/16x16.png`,
        "32": `../img/${iconDir}/32x32.png`,
        "48": `../img/${iconDir}/48x48.png`,
        "128": `../img/${iconDir}/128x128.png`,
      },
    });
  }
}
