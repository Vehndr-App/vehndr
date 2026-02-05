#!/usr/bin/env node
/**
 * Runs a dev mobile build: temporarily hides .env.production, uses only
 * .env.local, runs next build + cap sync, then restores .env.production.
 * Restore runs even if the build fails.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const envProduction = path.join(root, ".env.production");
const envProductionHide = path.join(root, ".env.production.hide");
const envLocal = path.join(root, ".env.local");
const envProductionLocal = path.join(root, ".env.production.local");

function restore() {
  if (fs.existsSync(envProductionHide)) {
    fs.renameSync(envProductionHide, envProduction);
    console.log("Restored .env.production.");
  }
  if (fs.existsSync(envProductionLocal)) {
    fs.unlinkSync(envProductionLocal);
    console.log("Removed .env.production.local.");
  }
}

if (!fs.existsSync(envLocal)) {
  console.warn("run-mobile-dev-build: .env.local not found. Create .env.local for a dev mobile build.");
  process.exit(0);
}

// Prepare: hide .env.production, copy .env.local → .env.production.local
if (fs.existsSync(envProduction)) {
  fs.renameSync(envProduction, envProductionHide);
  console.log("Temporarily hid .env.production.");
}
fs.copyFileSync(envLocal, envProductionLocal);
console.log("Using .env.local for this build ( .env.production not loaded).\n");

try {
  execSync("IS_MOBILE=true next build && npx cap sync", {
    stdio: "inherit",
    cwd: root,
    shell: true,
  });
} finally {
  restore();
}
