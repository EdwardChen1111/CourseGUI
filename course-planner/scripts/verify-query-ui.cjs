/* eslint-disable @typescript-eslint/no-require-imports */
// Compatibility entry point; the maintained suite also runs in CI.
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const result = spawnSync(process.execPath, [require.resolve("@playwright/test/cli"), "test"], { cwd: path.resolve(__dirname, ".."), stdio: "inherit", env: process.env });
process.exitCode = result.status ?? 1;
