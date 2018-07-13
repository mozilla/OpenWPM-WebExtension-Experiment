/* eslint-env commonjs */

"use strict";

/**
 * Creates a logger for debugging.
 *
 * The pref to control this is "openwpm.logLevel"
 *
 * @param {string} logPrefix - the name of the Console instance
 * @param {string} level - level to use by default
 * @returns {Object} - the Console instance, see gre/modules/Console.jsm
 */
function createLogger(logPrefix, level = "Warn") {
  const prefName = "openwpm.logLevel";
  const ConsoleAPI = ChromeUtils.import(
    "resource://gre/modules/Console.jsm",
    {},
  ).ConsoleAPI;
  return new ConsoleAPI({
    maxLogLevel: level,
    maxLogLevelPref: prefName,
    prefix: logPrefix,
  });
}

const logger = createLogger("openwpm");

export default logger;
