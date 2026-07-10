import { defineConfig } from "vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: dir,
  base: "/working-vehicle-games/vehicles/",
  server: {
    host: true,
    port: 5173,
  },
  build: {
    outDir: resolve(dir, "../dist/vehicles"),
    emptyOutDir: true,
  },
});
