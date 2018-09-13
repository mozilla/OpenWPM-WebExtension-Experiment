/* eslint-env commonjs */
/* eslint no-logger: off */
/* global ExtensionAPI */

import logger from "./logger";
import { Monitor } from "./Monitor";

logger.debug("Loading WebExtension Experiment");

ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
ChromeUtils.import("resource://gre/modules/ExtensionUtils.jsm");
ChromeUtils.import("resource://gre/modules/Services.jsm");

/* eslint-disable no-undef */
const { EventManager } = ExtensionCommon;
const { ExtensionError } = ExtensionUtils;
const EventEmitter =
  ExtensionCommon.EventEmitter || ExtensionUtils.EventEmitter;

class ApiEventEmitter extends EventEmitter {
  emitStarted(openwpmStatus) {
    logger.debug("Emitting 'started' event", openwpmStatus);
    this.emit("started", openwpmStatus);
  }

  emitStopped(ending) {
    logger.debug("Emitting 'stopped' event", ending);
    this.emit("stopped", ending);
  }
}

this.openwpm = class extends ExtensionAPI {
  /**
   * @param {object} context the add-on context
   * @returns {object} api with openwpm, openwpmDebug keys
   */
  getAPI(context) {
    const { extension } = this;
    const { tabManager } = extension;
    const apiEventEmitter = new ApiEventEmitter();
    const api = this;
    api.state = {
      started: false,
      stopped: null,
    };
    const monitor = new Monitor();
    const generalEventObserver = function(a, topic, c) {
      logger.log("event: a,topic,c", a, topic, c);
    };
    return {
      openwpm: {
        /* Start OpenWPM instrumentation. Fires onStarted if successful. */
        start: async function start(openwpmSetup) {
          logger.debug("Called start openwpmSetup", openwpmSetup);
          const openwpmStatus = await this.status();

          await monitor.startMonitoringNewTabs(tabManager);

          Services.obs.addObserver(generalEventObserver, "toplevel-window-ready");
          Services.obs.addObserver(generalEventObserver, "sessionstore-windows-restored");

          Services.obs.addObserver(generalEventObserver, "dom-window-destroyed");
          Services.obs.addObserver(generalEventObserver, "inner-window-destroyed");
          Services.obs.addObserver(generalEventObserver, "outer-window-destroyed");
          Services.obs.addObserver(generalEventObserver, "xul-window-destroyed");
          Services.obs.addObserver(generalEventObserver, "xul-window-registered");
          Services.obs.addObserver(generalEventObserver, "xul-window-visible");

          Services.obs.addObserver(generalEventObserver, "chrome-document-global-created");
          Services.obs.addObserver(generalEventObserver, "content-document-global-created");
          Services.obs.addObserver(generalEventObserver, "document-element-inserted");

          logger.debug("Set up observers");

          apiEventEmitter.emitStarted(openwpmStatus);
          return openwpmStatus;
        },

        /* Stop OpenWPM instrumentation. */
        stop: async function stop(stopReason) {
          logger.debug("Called stop stopReason", stopReason);
          const ending = { reason: stopReason };

          await monitor.stopMonitoringNewTabs(tabManager);

          Services.obs.removeObserver(generalEventObserver, "toplevel-window-ready");
          Services.obs.removeObserver(generalEventObserver, "sessionstore-windows-restored");

          Services.obs.removeObserver(generalEventObserver, "dom-window-destroyed");
          Services.obs.removeObserver(generalEventObserver, "inner-window-destroyed");
          Services.obs.removeObserver(generalEventObserver, "outer-window-destroyed");
          Services.obs.removeObserver(generalEventObserver, "xul-window-destroyed");
          Services.obs.removeObserver(generalEventObserver, "xul-window-registered");
          Services.obs.removeObserver(generalEventObserver, "xul-window-visible");

          Services.obs.removeObserver(generalEventObserver, "chrome-document-global-created");
          Services.obs.removeObserver(generalEventObserver, "content-document-global-created");
          Services.obs.removeObserver(generalEventObserver, "document-element-inserted");

          logger.debug("Tore down up observers");

          apiEventEmitter.emitStopped(ending);
          return ending;
        },

        /* Return current OpenWPM status. */
        status: async function status() {
          logger.debug("Called status()");
          return {
            foo: "bar",
          };
        },

        /* Enables network monitoring for a specific tab. */
        enableNetworkMonitorForTab: async function enableNetworkMonitorForTab(
          tabId,
        ) {
          logger.debug("Called enableNetworkMonitorForTab(tabId)", tabId);
          (async function() {
            // Setup a tab-specific monitor
            const tabBase = tabManager.get(tabId);
            await monitor.enableMonitoringForTab(tabBase);
            logger.debug(
              `Started tab monitoring for tab with id ${tabId}`,
              monitor,
            );
          })().catch(error => {
            logger.error("Exception in enableNetworkMonitorForTab", error);
          });
        },

        /* Disables network monitoring for a specific tab. */
        disableNetworkMonitorForTab: async function disableNetworkMonitorForTab(
          tabId,
        ) {
          logger.debug("Called disableNetworkMonitorForTab(tabId)", tabId);
          (async function() {
            // Setup a tab-specific monitor
            const tabBase = tabManager.get(tabId);
            await monitor.disableMonitoringForTab(tabBase);
            logger.debug(
              `Stopped tab monitoring for tab with id ${tabId}`,
              monitor,
            );
          })().catch(error => {
            logger.error("Exception in disableNetworkMonitorForTab", error);
          });
        },

        /* Returns the HAR for a specific tab. */
        getHarForTab: async function getHarForTab(tabId) {
          logger.debug("Called getHarForTab(tabId)", tabId);
          logger.debug("monitor", monitor);
          if (!monitor) {
            return null;
          }
          return (async function() {
            const tabBase = tabManager.get(tabId);
            const har = await monitor.getHarForTab(tabBase);
            logger.debug("har in getHarForTab", har);
            return har;
          })().catch(error => {
            logger.error("Exception in getHarForTab", error);
          });
        },

        // https://firefox-source-docs.mozilla.org/toolkit/components/extensions/webextensions/events.html
        /* Fires when the OpenWPM instrumentation has started. */
        onStarted: new EventManager(context, "openwpm:onStarted", fire => {
          const listener = (eventReference, openwpmStatus) => {
            fire.async(openwpmStatus);
          };
          apiEventEmitter.on("started", listener);
          return () => {
            apiEventEmitter.off("started", listener);
          };
        }).api(),

        // https://firefox-source-docs.mozilla.org/toolkit/components/extensions/webextensions/events.html
        /* Fires when the OpenWPM instrumentation has stopped, either in the event of some errors that forces OpenWPM to stop, or upon `browser.openwpm.stop`. */
        onStopped: new EventManager(context, "openwpm:onStopped", fire => {
          const listener = (eventReference, ending) => {
            fire.async(ending);
          };
          apiEventEmitter.on("stopped", listener);
          return () => {
            apiEventEmitter.off("stopped", listener);
          };
        }).api(),
      },

      openwpmDebug: {
        /* Throws an exception from a privileged sync function - for tests making sure that we can catch these in our web extension */
        throwAnExceptionSync(message) {
          throw new ExtensionError(message);
        },

        /* Throws an exception from a privileged async function - for tests making sure that we can catch these in our web extension */
        throwAnExceptionAsync: async function throwAnExceptionAsync(message) {
          throw new ExtensionError(message);
        },

        /* Return `api.state`. Used for debugging. */
        dumpInternalState: async function dumpInternalState() {
          return api.state;
        },
      },
    };
  }
};
