// Installs dependencies automatically when node_modules is missing or stale,
// so `npm run build|dev|test|e2e` work straight after unzipping.
import { spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";

const stamp = "node_modules/.package-lock.json";
const stale =
  !existsSync(stamp) ||
  statSync("package-lock.json").mtimeMs > statSync(stamp).mtimeMs + 1000;

if (stale) {
  console.log("[deps] Installing dependencies (npm ci)...");
  const r = spawnSync("npm", ["ci", "--no-audit", "--no-fund"], {
    stdio: "inherit",
    shell: true,
  });
  if (r.status !== 0) {
    console.error("[ERROR] npm ci failed. Check your network / Node.js 20+.");
    process.exit(r.status ?? 1);
  }
} else {
  console.log("[deps] Dependencies up to date.");
}
