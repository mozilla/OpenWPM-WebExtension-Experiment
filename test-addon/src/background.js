/* global getOpenwpmSetup */

class OpenwpmLifeCycleHandler {
  /**
   * Listen to onStopped, onStarted
   * `browser.openwpm.start` fires onStarted if successful
   * onStopped is fired in the event of some errors that forces OpenWPM to stop, or upon `browser.openwpm.stop`
   */
  constructor() {
    browser.openwpm.onStopped.addListener(this.onStopped.bind(this));
    browser.openwpm.onStarted.addListener(this.onStarted.bind(this));
  }

  /**
   * @param {object} openwpmInfo browser.openwpm.openwpmInfo object
   *
   * @returns {undefined}
   */
  async onStarted(openwpmInfo) {
    console.log("OpenWPM has started", openwpmInfo);
    feature.configure(openwpmInfo);
  }

  /**
   * @param {object} ending An ending result
   *
   * @returns {undefined}
   */
  async onStopped(ending) {
    console.log(`OpenWPM has stopped`, ending);
    await this.cleanup();
  }

  /**
   * @returns {undefined}
   */
  async cleanup() {
    // do whatever work your add-on needs to clean up
  }
}

class FooFeature {
  constructor() {}

  async configure(/* openwpmInfo*/) {
    console.log(
      "Feature is now enabled, sending 'test:onFeatureEnabled' event (for the tests)",
    );
    browser.runtime.sendMessage("test:onFeatureEnabled").catch(console.error);
  }
}

// construct. will be configured after setup.
const feature = new FooFeature();

/**
 * Run every startup to get config and instantiate the feature
 *
 * @returns {undefined}
 */
async function onEveryExtensionLoad() {
  new OpenwpmLifeCycleHandler();

  const openwpmSetup = await getOpenwpmSetup();
  console.log("OpenWPM setup: ", openwpmSetup);
  try {
    await browser.openwpm.start(openwpmSetup);
  } catch (e) {
    console.error("OpenWPM error: ", e);
  }
}

// Since this is a test-addon, we don't initiate any code directly, but wait
// for events sent by tests. This allows us to control and test the execution
// properly.
// Note: Since this is the first onMessage listener, it will be able to send
// a response to the sending party
// onEveryExtensionLoad();
const onEveryExtensionLoadTestListener = request => {
  console.log("onEveryExtensionLoad listener - request", request);
  if (request === "test:onEveryExtensionLoad") {
    console.log("Removing onEveryExtensionLoadTestListener");
    browser.runtime.onMessage.removeListener(onEveryExtensionLoadTestListener);
    console.log("Running onEveryExtensionLoad()");
    onEveryExtensionLoad();
  }
};
browser.runtime.onMessage.addListener(onEveryExtensionLoadTestListener);

// The tests that probe the web extensions APIs directly rely on an extension
// page opening up in a new window/tab.
// For more information, see shield-studies-addon-utils/testUtils/executeJs.js
const createData = {
  type: "detached_panel",
  url: "extension-page-for-tests/index.html",
  width: 500,
  height: 500,
};
browser.windows.create(createData);

// Testing that the web extension events works properly with our bundled APIs requires the below code

/**
 * Fired when the extension is first installed, when the extension is updated
 * to a new version, and when the browser is updated to a new version.
 *
 * See:  https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/runtime/onInstalled
 *
 * @param {object} details webExtension details object
 * @returns {undefined} Nothing
 */
function handleInstalled(details) {
  console.log(
    "The 'handleInstalled' event was fired.",
    details.reason,
    details,
  );
}

/**
 * Fired when a profile that has this extension installed first starts up.
 * This event is not fired when a private browsing/incognito profile is started.
 * @returns {undefined} Nothing
 */
async function handleStartup() {
  console.log("The 'handleStartup' event was fired.", arguments);
}

browser.runtime.onStartup.addListener(handleStartup);
browser.runtime.onInstalled.addListener(handleInstalled);
