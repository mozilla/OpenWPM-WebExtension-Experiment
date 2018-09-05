"use strict";

const { require } = ChromeUtils.import(
  "resource://devtools/shared/Loader.jsm",
  {},
);
const {
  DevToolsShim,
} = require("chrome://devtools-startup/content/DevToolsShim.jsm");
const Services = require("Services");
const { NetMonitorAPI } = require("devtools/client/netmonitor/src/api");
const {
  buildHarLog,
} = require("devtools/client/netmonitor/src/har/har-builder-utils");

export class Monitor {
  constructor() {
    this.tabSpecificMonitors = {};
  }

  /**
   * @param tabBase TabBase
   * @returns {Promise<void>}
   */
  async enableMonitoringForTab(tabBase) {
    const tabSpecificMonitor = this.getTabSpecificMonitorByTabBase(tabBase);
    return tabSpecificMonitor.start();
  }

  /**
   * @param tabBase TabBase
   * @returns {Promise<void>}
   */
  async disableMonitoringForTab(tabBase) {
    const existingTabSpecificMonitor = this.tabSpecificMonitors[tabBase.id];
    if (existingTabSpecificMonitor) {
      await existingTabSpecificMonitor.stop();
      delete this.tabSpecificMonitors[tabBase.id];
    }
  }

  async getHarForTab(tabBase) {
    const tabSpecificMonitor = this.getTabSpecificMonitorByTabBase(tabBase);
    return tabSpecificMonitor.getHAR();
  }

  getTabSpecificMonitorByTabBase(tabBase) {
    const existingTabSpecificMonitor = this.tabSpecificMonitors[tabBase.id];
    if (existingTabSpecificMonitor) {
      return existingTabSpecificMonitor;
    }
    const tabSpecificMonitor = new TabSpecificMonitor(tabBase);
    this.tabSpecificMonitors[tabBase.id] = tabSpecificMonitor;
    return tabSpecificMonitor;
  }
}

export class TabSpecificMonitor {
  /**
   * @param tabBase TabBase
   */
  constructor(tabBase) {
    this.tabBase = tabBase;
  }

  /**
   * Initialize NetMonitorAPI object and connect to the
   * Firefox backend for a specific tab
   * @returns {Promise<void>}
   */
  async start() {
    const netMonitor = this.getNetMonitorAPI();
    if (netMonitor.toolbox) {
      console.log("NetMonitor already connected to a Mock toolbox");
    }
    const { tabBase } = this;
    const { nativeTab } = tabBase;
    const target = DevToolsShim.createTargetForTab(nativeTab);
    const MockToolbox = {
      target,
      getPanel: () => {},
    };
    // Debug
    target.on("close", () => {
      console.log("target close", arguments);
    });
    target.on("will-navigate", () => {
      console.log("target will-navigate", arguments);
    });
    target.on("navigate", () => {
      console.log("target navigate", arguments);
    });
    target.on("tabNavigated", () => {
      console.log("target tabNavigated", arguments);
    });
    target.on("tabDetached", () => {
      console.log("target tabDetached", arguments);
    });
    console.log(
      "netMonitor.toolbox before connect",
      netMonitor.toolbox,
      tabBase.id,
    );
    await target.makeRemote();
    await target.activeConsole.startListeners(["NetworkActivity"]);
    await netMonitor.connect(MockToolbox);
  }

  /**
   * @returns {Promise<void>}
   */
  async stop() {
    await this.getNetMonitorAPI().destroy();
  }

  /**
   * The monitor is considered connected
   * if its NetMonitorAPI instance has its
   * connector, connector.connector and toolbox properties set
   * @returns {boolean}
   */
  connected(netMonitor) {
    return !!(
      netMonitor.connector &&
      netMonitor.connector.connector &&
      netMonitor.toolbox
    );
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

    const netMonitor = this.getNetMonitorAPI();
    if (!this.connected(netMonitor)) {
      console.log(
        "getHAR from NetMonitor skipped since not yet connected to a tab",
      );
    } else {
      const state = netMonitor.store.getState();
      console.log("netMonitor.store.getState() just before HAR export", state);
      /*
      In order to supply options.includeResponseBodies to HAR exporter,
      we have imported and modified code from NetMonitor.getHar() here:
      const {
        HarExporter,
      } = require("devtools/client/netmonitor/src/har/har-exporter");
      const {
        getSortedRequests,
      } = require("devtools/client/netmonitor/src/selectors/index");
      const options = {
        connector: netMonitor.connector,
        items: getSortedRequests(state),
      };
      har = await HarExporter.getHar(options);
      */

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
