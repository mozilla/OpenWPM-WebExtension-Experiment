# OpenWPM WebExtension Experiment / API

[![CircleCI badge](https://img.shields.io/circleci/project/github/mozilla/OpenWPM-WebExtension-Experiment/develop.svg?label=CircleCI)](https://circleci.com/gh/mozilla/OpenWPM-WebExtension-Experiment/)

This is the home of the [`openwpm-webext-experiment` npm package](https://www.npmjs.com/package/openwpm-webext-experiment) (TODO), which provides:

* WebExtension Experiment API's

  * [`browser.openwpm`](./dist/api.md)
  * [`browser.openwpmDebug`](./dist/api.md)

* Scripts:

  * `installOpenWPM` shell command copying these files in your study add-on.

* `testUtils/`
  * Test utilities (helper classes to write functional/unit tests for your add-on)

## Goals:

Allows writing add-ons that use one or many of OpenWPM's instrumentation modules.

## Installing OpenWPM WebExtension Experiment / API in your add-on

1.  Install the Package

    ```
    npm install --save mozilla/OpenWPM-WebExtension-Experiment#develop
    ```

2.  Copy the files to your 'privileged' src directory

    ```
    npx installOpenWPM ./src/privileged --example
    ```

    Suggestion: make this part of your `package.json:scripts.postinstall` script.

3.  Add the following to your add-on's manifest.json:

    ```
      "experiment_apis": {
        "study": {
          "schema": "./privileged/study/schema.json",
          "parent": {
            "scopes": ["addon_parent"],
            "script": "./privileged/study/api.js",
            "paths": [["study"]]
          }
        }
      },
    ```

4.  Set logging level to `All` in `about:config`

    ```
    prefName: openwpm.logLevel
    values: All|Trace|Debug|Info|Warn|Error
    ```

    This allows openwpm-related log output in the browser console.

## How to use in your add-on

1.  **Read** [the documentation of the API](./dist/api.md)

    Notice that there are

    * `functions`: async functions in the `browser.openwpm`.
    * `events`: webExtension events in the `browser.openwpm`
    * `types`: jsonschema draft-04 formats.

2.  **Explore** [`test-addon`](./test-addon/):

    * [`manifest.json`](./test-addon/src/manifest.json)

      Notice the `experiment_apis` section. This maps `browser.openwpm` to the privileged api code. (See details below)

    * [`study.js`](./test-addon/src/study.js)

      Construct a `studySetup` usable by `browser.openwpm.setup`

    * [`background.js`](./test-addon/src/background.js)

      Uses the `browser.openwpm` api within a small instrumented feature.

## Contribute

* Open an issue
* Hack and file a PR
* `npm run test` must pass.
* Read [./docs/DEV.md](./docs/DEV.md) for more in-depth development documentation.
* Useful testing helpers:
  * `KEEPOPEN=1 npm run test` keeps Firefox open
  * `npm run test-only` skips build steps.
