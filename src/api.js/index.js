/* eslint-env commonjs */
/* eslint no-logger: off */
/* global ExtensionAPI */

import logger from "./logger";
import { Monitor } from "./Monitor";

logger.debug("Loading WebExtension Experiment");

ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
ChromeUtils.import("resource://gre/modules/ExtensionUtils.jsm");

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
    /**
     * Find the TabBase object with the given tabId
     */
    const tabIdToTabBase = tabId => {
      const allTabBases = Array.from(tabManager.query(), tabBase => {
        return tabBase;
      });
      return allTabBases.find($tabBase => $tabBase.id === tabId);
    };
    const apiEventEmitter = new ApiEventEmitter();
    const api = this;
    api.state = {
      started: false,
      stopped: null,
    };
    const monitor = new Monitor();
    return {
      openwpm: {
        /* Start OpenWPM instrumentation. Fires onStarted if successful. */
        start: async function start(openwpmSetup) {
          logger.debug("Called start openwpmSetup", openwpmSetup);
          const openwpmStatus = await this.status();
          apiEventEmitter.emitStarted(openwpmStatus);
          return openwpmStatus;
        },

        /* Stop OpenWPM instrumentation. */
        stop: async function stop(stopReason) {
          logger.debug("Called stop stopReason", stopReason);
          const ending = { reason: stopReason };
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
            const tabBase = tabIdToTabBase(tabId);
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
            const tabBase = tabIdToTabBase(tabId);
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
            const tabBase = tabIdToTabBase(tabId);
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
