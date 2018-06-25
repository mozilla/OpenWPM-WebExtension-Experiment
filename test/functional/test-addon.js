/* eslint-env node, mocha */
/* global browser */

/** Tests for
 *
 * - selenium/webdriver
 * - test-addon works as a platform
 *
 */

const assert = require("assert");
const utils = require("./utils");

describe("Tests verifying that the test add-on works as expected", function() {
  // This gives Firefox time to start, and us a bit longer during some of the tests.
  this.timeout(15000);

  let driver;

  before(async () => {
    driver = await utils.setupWebdriver.promiseSetupDriver(
      utils.FIREFOX_PREFERENCES,
    );
    await utils.setupWebdriver.installAddon(driver);
    await utils.ui.openBrowserConsole(driver);
  });

  // hint: skipping driver.quit() may be useful when debugging failed tests,
  // leaving the browser open allowing inspection of the ui and browser logs
  after(() => driver.quit());

  it("should be able to access window.browser from the extension page for tests", async () => {
    const hasAccessToWebExtensionApi = await utils.executeJs.executeAsyncScriptInExtensionPageForTests(
      driver,
      async callback => {
        callback(typeof browser === "object");
      },
    );
    assert(hasAccessToWebExtensionApi);
  });

  it("should be able to access openwpm WebExtensions API from the extension page for tests", async () => {
    const hasAccessToShieldUtilsWebExtensionApi = await utils.executeJs.executeAsyncScriptInExtensionPageForTests(
      driver,
      async callback => {
        callback(browser && typeof browser.openwpm === "object");
      },
    );
    assert(hasAccessToShieldUtilsWebExtensionApi);
  });

  describe('test the test add-on\'s "onEveryExtensionLoad" process', function() {
    /**
     * Before running the tests in this group, trigger onEveryExtensionLoad and wait for the OpenWPM instrumentation to be running
     */
    before(async () => {
      await utils.executeJs.executeAsyncScriptInExtensionPageForTests(
        driver,
        async callback => {
          // Let the test add-on know it is time to load the background logic
          await browser.runtime
            .sendMessage("test:onEveryExtensionLoad")
            .catch(console.error);

          // Wait for the feature to be enabled before continuing with the test assertions
          browser.runtime.onMessage.addListener(request => {
            console.log("test:onFeatureEnabled listener - request:", request);
            if (request === "test:onFeatureEnabled") {
              callback();
            }
          });
        },
      );
    });
  });
});
