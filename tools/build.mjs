import { cpSync, mkdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

// Portal
cpSync(join(root, "index.html"), join(dist, "index.html"));

// Cooking game (static)
cpSync(join(root, "cook"), join(dist, "cook"), { recursive: true });

// Toilet training game (static)
cpSync(join(root, "toilet"), join(dist, "toilet"), { recursive: true });

// Vehicles (Vite)
const build = spawnSync("npx", ["vite", "build", "--config", "vehicles/vite.config.js"], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

console.log("Build complete → dist/");
