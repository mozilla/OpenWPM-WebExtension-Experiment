/* eslint-env commonjs */
/* eslint no-logger: off */
/* global ExtensionAPI */

import logger from "./logger";

logger.debug("Loading WebExtension Experiment");

ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
ChromeUtils.import("resource://gre/modules/ExtensionUtils.jsm");

// eslint-disable-next-line no-undef
const { EventManager } = ExtensionCommon;
// eslint-disable-next-line no-undef
const { EventEmitter, ExtensionError } = ExtensionUtils;

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
    // const { extension } = this;
    const apiEventEmitter = new ApiEventEmitter();
    const api = this;
    api.state = {
      started: false,
      stopped: null,
    };
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
