"use strict";

const { require } = ChromeUtils.import(
  "resource://devtools/shared/Loader.jsm",
  {},
);
const { DebuggerServer } = require("devtools/server/main");
const { DebuggerClient } = require("devtools/shared/client/debugger-client");
const { TargetFactory } = require("devtools/client/framework/target");
const Services = require("Services");
const { NetMonitorAPI } = require("devtools/client/netmonitor/src/api");
const {
  buildHarLog,
} = require("devtools/client/netmonitor/src/har/har-builder-utils");

export class Monitor {
  /**
   * @param tabBase TabBase
   */
  constructor(tabBase) {
    this.tabBase = tabBase;
  }

  /**
   * Create our own debugger client object
   * @returns {Promise<DebuggerClient>}
   */
  async getDebuggerServerClient() {
    if (this.client) {
      return this.client;
    }
    DebuggerServer.init();
    DebuggerServer.registerAllActors();
    const client = new DebuggerClient(DebuggerServer.connectPipe());
    await client.connect();
    this.client = client;
    return this.client;
  }

  /**
   * Initialize NetMonitorAPI object and connect to the
   * Firefox backend for a specific tab
   * @returns {Promise<void>}
   */
  async startTabMonitoring() {
    const client = await this.getDebuggerServerClient();
    const tabBase = this.tabBase;

    // Get the debugger's version of the tab object
    const response = await client.getTab({ tab: tabBase.nativeTab });
    const form = response.tab;

    // Activate NetMonitor for tab
    const target = await TargetFactory.forRemoteTab({
      client,
      form,
      chrome: false,
    });
    const MockToolbox = {
      target,
      getPanel: () => {},
    };
    await this.getNetMonitorAPI().connect(MockToolbox);
  }

  /**
   * The monitor is considered connected
   * if its NetMonitorAPI instance has its toolbox property set
   * @returns {boolean}
   */
  connected() {
    const netMonitor = this.getNetMonitorAPI();
    return !!netMonitor.toolbox;
  }

  /**
   * Return Netmonitor API object. This object offers Network monitor
   * public API that can be consumed by other panels or WE API.
   */
  getNetMonitorAPI() {
    if (this._netMonitorAPI) {
      return this._netMonitorAPI;
    }

    // Create and initialize Network monitor API object.
    // This object is only connected to the backend - not to the UI.
    this._netMonitorAPI = new NetMonitorAPI();

    return this._netMonitorAPI;
  }

  /**
   * Returns data (HAR) collected by the Network monitor.
   */
  async getHAR() {
    console.log("getHAR");
    let har;
    if (!this.connected()) {
      console.log(
        "getHAR from NetMonitor skipped since not yet connected to a tab",
      );
    } else {
      const netMonitor = this.getNetMonitorAPI();
      har = await netMonitor.getHar();
      console.log("getHAR har from NetMonitor", har);
    }

    // Return default empty HAR file if needed.
    har = har || buildHarLog(Services.appinfo);

    // Return the log directly to be compatible with
    // Chrome WebExtension API.
    return har.log;
  }
}
