import { defineConfig } from "vite";

export default defineConfig({
  base: "/working-vehicle-games/",
  server: {
    host: true,
    port: 5173,
  },
});