#!/usr/bin/env node

const path = require("path");
const fs = require("fs-extra");

const files = ["api.js", "schema.json"];

function correctOutputDir(privilegedDirname) {
  if (path.isAbsolute(privilegedDirname)) return privilegedDirname;
  return path.join(process.cwd(), privilegedDirname);
}

function copyOpenwpmUtilsToWebExtension(privilegedDirname, options) {
  // copy the files, overwriting if necessary
  // NO fancy removal.
  const outputDir = correctOutputDir(privilegedDirname);
  fs.ensureDirSync(privilegedDirname);
  for (const fn of files) {
    const fullSrc = path.join(__dirname, "..", "dist");
    const fullTarget = path.join(outputDir, "openwpm");
    fs.copySync(path.join(fullSrc, fn), path.join(fullTarget, fn), {
      overwrite: true,
    });
  }
  if (options.example) {
    printTemplate(privilegedDirname);
  }
}

function printTemplate(dirname) {
  const template = `
  // For your add-on's manifest.json:

  "experiment_apis": {
    "openwpm": {
      "schema": "${dirname}/openwpm/schema.json",
      "parent": {
        "scopes": ["addon_parent"],
        "script": "${dirname}/openwpm/api.js",
        "paths": [["openwpm", "openwpmDebug"]]
      }
    },
  },
`;
  process.stdout.write(template);
}

const program = require("commander");

program
  .arguments(
    "<privilegedDirname>",
    "root directory in your add-on for privileged code",
  )
  .option(
    "--example",
    "print example `experiment_apis to stdout, to augment your `manifest.json`",
  )
  .action(copyOpenwpmUtilsToWebExtension);
program.parse(process.argv);
