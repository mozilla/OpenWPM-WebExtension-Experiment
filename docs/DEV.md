# Development on the Utils

## Build process overview: `npm run build`

Goal: create the `study/api.js` and `study/schema.json` files that implement the `browser.openwpm` WEE interface, for use by WebExtension Add-ons.

1.  **Format** `eslint`, `prettier` all javascript code in all directories
2.  **Bundle** `webExtensionApis/study/api.js`, the `browser.openwpm` WEE interface.

* `webpack` `study/src/*` into `study/api.js`

  * `study/src/index.js` contains the `getApi` call, as seen by webExtension add-ons.
  * `study/src/studyUtils` is a conversion of the 'studyUtils.jsm' from v4, and contains most of the privileged code
  * Tools for well-formatted Telemetry:

    * includes `ajv` for schema validation (for sending Telemetry)
    * includes the Telemetry Parquet Shield Schemas from `shield-study-schemas/schemas-client/*`

3.  **Derive** `webExtensionApis/study/schema.json`, the `browser.openwpm` WEE interface.

* `webExtensionApis/study/schema.yaml` is the canonical source. Using Yaml allows easily multiline comments
* `npm run build:schema`

      - converts `schema.yaml => schema.json`
      - validates that schema is probably a valid WEE schema.
      - creates API docs `schema.yaml => docs/api.md`

## Testing overview: `npm run test`

(If you are looking for ideas about QA for your study addon, see the FAQ.)

Goal: Use `webdriver` to exercise the `browser.openwpm` API to prove correctness.

1.  Builds and formats the API using `npm run build`
2.  Copies the created WEE interface files into `test-addon/src/privileged/`
3.  Build the `test-addon/` using `web-ext build`. This add-on creates a **detached panel**. Inside this panel is a context where `browser.openwpm` will be useable.
4.  Do tests:

    1.  `mocha` test runner uses files in `testUtils/` to
    2.  install the addon (using `webdriver`)
    3.  switch context to the panel, so that we can exercise `browser.openwpm`. The function that does this: `setupWebDriver`
    4.  Run all tests. Most API tests are at: `test/functional/browser.openwpm.api.js`
    5.  Most tests are of this `Selenium`/`WebDriver`/`GeckoDriver` form:

        * run some async code in the panel context using `addonExec`
        * in that code, exercise the `browser.openwpm` api.
        * callback with the results, `browser.openwpm.status()`, and/or `browser.openwpmDebug.dumpInternalState()` as necessary.
        * use `assert` to check the called back result.

**Note**: `browser.openwpmDebug.dumpInternalState()` gets internals of the `studyUtils` singleton as needful. `browser.openwpmDebug` also allows other manipulation of the studyUtils singleton, for use by tests, and to induce states and reactions.

## FAQ

* What's the deal with Webpack?

  * we want `api.js` to be one file, for ease of use by add-on authors
  * we want the source to be broken up into logical pieces

## File structure

```
├── .circleci
│   └── config.yml
├── .eslintignore
├── .eslintrc.js
├── .gitignore
├── LICENSE
├── README.md
├── bin
│   ├── .eslintrc.js
│   └── installOpenWPM.js
├── dist
│   ├── .gitignore
│   ├── .npmignore
│   ├── api.js          # Built by webpack from the contents of the src/ directory
│   ├── api.md          # The WebExtension API schema, built from src/schema.yaml
│   └── schema.json
├── docs
│   ├── DEV.md
│   └── TREE.md
├── package-lock.json
├── package.json
├── src                 # The browser.openwpm.* WebExtension API - see ./README.md for more information
│   ├── .gitignore
│   ├── api.js          # Source code that gets bundled by webpack into api.js
│   │   ├── index.js    # Exposes the WE API
│   │   └── logger.js
│   ├── schema.yaml     # The WebExtension API schema
│   ├── stubApi.js
│   └── webpack.config.js   # Webpack configuration for bundling/building the API's api.js file
├── test
│   ├── .eslintrc.js
│   └── functional
│       ├── browser.openwpm.api.js
│       ├── test-addon.js
│       └── utils.js
├── test-addon
│   ├── dist
│   │   ├── .gitignore
│   │   └── openwpm_webextension_experiment_test_add-on-1.0.0.zip
│   ├── src
│   │   ├── .eslintrc.js
│   │   ├── background.js
│   │   ├── extension-page-for-tests
│   │   │   ├── index.html
│   │   │   └── page.js
│   │   ├── icons
│   │   │   ├── LICENSE
│   │   │   └── shield-icon.svg
│   │   ├── manifest.json
│   │   ├── openwpmSetup.js
│   │   └── privileged
│   │       ├── .gitignore
│   │       └── openwpm
│   │           ├── api.js
│   │           └── schema.json
│   └── web-ext-config.js
└── testUtils               # Test utils (helper classes to write functional/unit tests for your study add-on)
    ├── .eslintrc.js
    ├── executeJs.js
    ├── nav.js
    ├── setupWebdriver.js
    └── ui.js

>> tree -a -I 'node_modules|.git|.DS_Store'
```

# Continuous Integration

[Circle CI](https://circleci.com/) is used for continuous integration. Configured via `./.circleci/config.yml`.

Full docs available at https://circleci.com/docs/2.0/local-cli/

## Install cli to test Circle CI locally

```shell
curl -o /usr/local/bin/circleci https://circle-downloads.s3.amazonaws.com/releases/build_agent_wrapper/circleci && chmod +x /usr/local/bin/circleci
```

## Validate Circle CI configuration

```shell
circleci config validate -c .circleci/config.yml
```

## Run Circle CI locally (requires Docker)

To prevent re-use of the local `node_modules` directory (which may contain locally compiled binaries which will cause troubles inside the Docker environment), clone your repository into a clean directory then run CircleCI inside that directory:

```shell
git clone . /tmp/$(basename $PWD)
cd /tmp/$(basename $PWD)
circleci build
```

Note: Steps related to caching and uploading/storing artifacts will report as failed locally. This is not necessarily a problem, they are designed to fail since the operations are not supported locally by the CircleCI build agent.
