"use strict";

const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const packageDirectory = path.resolve(__dirname, "../packages/bangladeshi-parcel-tracker");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const cacheDirectory = path.join(os.tmpdir(), "bangladeshi-parcel-tracker-npm-cache");

const result = spawnSync(
  npmCommand,
  ["--cache", cacheDirectory, "pack", "--dry-run"],
  { cwd: packageDirectory, stdio: "inherit", shell: process.platform === "win32" }
);

if (result.error) {
  console.error(`Could not run npm pack: ${result.error.message}`);
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
