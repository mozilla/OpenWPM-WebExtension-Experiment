/* eslint-env node, mocha */
/* global browser */

const KEEPOPEN = process.env.KEEPOPEN;
/** Complete list of tests for testing
 *
 * - the public api for `browser.openwpm`
 */

/** About webdriver extension based tests
 *
 * `addonExec`:  Created in the one-time "before" function for each suite.
 *
 * Webdriver
 * - `driver` created:  uses the fx profile, sets up connenction
 *    and translation to Marionette
 * - installs the `test-addon` extension
 * - waits for UI as a signal that the extension page is ready.
 * - now can `await addonExec`, as short-named bound version of
 *   "executeAsyncScriptInExtensionPageForTests",
 *   which runs in the exentension page contenxt and promises values we
 *   can use in tests in this file (node / mocha context).
 *
 *  ## Creating a new test
 *
 *  1.  Goal, call back from the webExtension with the data you need to test
 *  2.  Do the test in the script using node's `assert`
 *
 *  ## Tips for `addonExec`
 *
 *  1. If something breaks / test fails, fx will stay open (`--bail`).
 *     Look in the BrowserConsole
 *  2. Callback with a complex object if you need a lot of return values
 *  3. Recall that `openwpmDebug` exists for doing resets, getting internalState, etc
 */

// TODO create new profile per test?

const assert = require("assert");
const utils = require("./utils");

// node's util, for printing a deeply nested object to node console
const { inspect } = require("util");
// eslint-disable-next-line no-unused-vars
function full(myObject) {
  return inspect(myObject, { showHidden: false, depth: null });
}

// eslint-disable-next-line no-unused-vars
const delay = ms => new Promise(res => setTimeout(res, ms));

// simple merge all by top level keys, right-most wins
function merge(...sources) {
  return Object.assign({}, ...sources);
}

/** return a openwpmSetup, shallow merged from overrides
 *
 * @return {object} mergedOpenwpmSetup
 */
function openwpmSetupForTests(...overrides) {
  // Minimal configuration to pass schema validation
  const openwpmSetup = {
    cookie_instrument: false,
    js_instrument: false,
    cp_instrument: false,
    http_instrument: false,
    save_javascript: false,
    save_all_content: false,
  };

  return merge(openwpmSetup, ...overrides);
}

describe("PUBLIC API `browser.openwpm` (not specific to any add-on background logic)", function() {
  // This gives Firefox time to start, and us a bit longer during some of the tests.
  this.timeout(15000);

  let driver;
  let addonId;
  // run in the extension page
  let addonExec;

  async function createAddonExec() {
    driver = await utils.setupWebdriver.promiseSetupDriver(
      utils.FIREFOX_PREFERENCES,
    );
    addonId = await utils.setupWebdriver.installAddon(driver);
    await utils.ui.openBrowserConsole(driver);

    // make a shorter alias
    addonExec = utils.executeJs.executeAsyncScriptInExtensionPageForTests.bind(
      utils.executeJs,
      driver,
    );
  }

  async function reinstallAddon() {
    await utils.setupWebdriver.uninstallAddon(driver, addonId);
    await utils.setupWebdriver.installAddon(driver);
  }

  before(createAddonExec);

  // hint: skipping driver.quit() may be useful when debugging failed tests,
  // leaving the browser open allowing inspection of the ui and browser logs
  after(() => !KEEPOPEN && driver.quit());

  describe("testing infrastructure works", function() {
    it("should be able to access window.browser from the extension page for tests", async () => {
      const hasAccessToWebExtensionApi = await addonExec(async callback => {
        callback(typeof browser === "object");
      });
      assert(hasAccessToWebExtensionApi);
    });

    it("should be able to access openwpm WebExtensions API from the extension page for tests", async () => {
      const hasAccessToShieldUtilsWebExtensionApi = await addonExec(
        async callback => {
          callback(browser && typeof browser.openwpm === "object");
        },
      );
      assert(hasAccessToShieldUtilsWebExtensionApi);
    });

    it("should be able to access openwpmDebug WebExtensions API from the extension page for tests", async () => {
      const hasAccessToShieldUtilsWebExtensionApi = await addonExec(
        async callback => {
          callback(browser && typeof browser.openwpmDebug === "object");
        },
      );
      assert(hasAccessToShieldUtilsWebExtensionApi);
    });

    it("should be able to catch exceptions thrown in the WebExtension", async () => {
      const caughtError = await addonExec(async callback => {
        let _caughtError = null;

        try {
          throw new Error("Local exception");
        } catch (e) {
          // console.debug("Caught error", e);
          _caughtError = e.toString();
        }

        callback(_caughtError);
      });
      assert(caughtError === "Error: Local exception");
    });

    /*
    TODO: Figure out why if/how/when we can catch this type of exception (currently it stops test execution completely)
    it("should be able to catch exceptions thrown in the WebExtensions API", async() => {
      const caughtError = await utils.executeJs.executeAsyncScriptInExtensionPageForTests(
        driver,
        async callback => {
          let _caughtError = null;

          try {
            browser.openwpmDebug.throwAnExceptionSync("An exception thrown for test purposes");
            callback(false);
          } catch (e) {
            // console.debug("Caught error", e);
            _caughtError = e.toString();
            callback(_caughtError);
          }

        },
      );
      assert(caughtError === "Error: An exception thrown for test purposes");
    });
    */

    it("should be able to catch exceptions thrown in an async WebExtensions API method", async () => {
      const caughtError = await utils.executeJs.executeAsyncScriptInExtensionPageForTests(
        driver,
        async callback => {
          let _caughtError = null;

          try {
            await browser.openwpmDebug.throwAnExceptionAsync(
              "An async exception thrown for test purposes",
            );
            callback(false);
          } catch (e) {
            // console.debug("Caught error", e);
            _caughtError = e.toString();
            callback(_caughtError);
          }
        },
      );
      assert(
        caughtError === "Error: An async exception thrown for test purposes",
      );
    });
  });

  describe("status, internalState under several browser.start() scenarios", function() {
    it("status before starting openwpm instrumentation", async function() {
      const openwpmSetup = openwpmSetupForTests();
      const data = await addonExec(async ($openwpmSetup, cb) => {
        // this is what runs in the webExtension scope.
        console.log("in add-on");
        const openwpmStatus = await browser.openwpm.start($openwpmSetup);
        console.log("openwpmStatus", openwpmStatus);
        const internalState = await browser.openwpmDebug.dumpInternalState();
        console.log("internalState", internalState);
        // call back with all the data we care about to Mocha / node
        cb({ openwpmStatus, internalState });
      }, openwpmSetup);
      // console.debug(full(data));
      const { openwpmStatus, internalState } = data;

      // assertions
      assert(openwpmStatus);
      assert(!internalState.started, "should not be started");
      assert.strictEqual(
        internalState.stopped,
        null,
        "should not have defined the stopped internalState",
      );
    });
  });

  describe("life-cycle tests", function() {
    describe("start, manually invoked stop", function() {
      let openwpmStatus;
      const overrides = {
        js_instrument: true,
      };

      before(async function reinstallSetupDoTelemetryAndWait() {
        await reinstallAddon();
        openwpmStatus = await addonExec(async ($openwpmSetup, callback) => {
          // Ensure we have a configured openwpm and are supposed to run our feature
          browser.openwpm.onStarted.addListener(async $openwpmStatus => {
            callback($openwpmStatus);
          });
          await browser.openwpm.start($openwpmSetup);
        }, openwpmSetupForTests(overrides));
      });

      it("should fire the onStarted event upon successful setup", async () => {
        // console.debug(openwpmStatus);
        assert(openwpmStatus);
        assert.strictEqual(openwpmStatus.foo, "bar");
      });

      describe("browser.openwpm.stop()", function() {
        let ending;
        before(async () => {
          ending = await addonExec(async callback => {
            browser.openwpm.onStopped.addListener(async $endingResult => {
              callback($endingResult);
            });
            await browser.openwpm.stop("finished-testing");
          });
        });

        it("should have fired onStopped event with the ending information", function() {
          // console.debug(full(ending));
          assert(ending);
          assert.strictEqual(ending.reason, "finished-testing");
        });
      });
    });
  });
});
