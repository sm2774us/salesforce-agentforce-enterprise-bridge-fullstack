/// <reference types="vitest/config" />
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const API = process.env.VITE_PROXY_TARGET ?? "http://127.0.0.1:8080";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: {
    port: 5173,
    proxy: {
      "/v1": API,
      "/healthz": API,
      "/readyz": API,
    },
  },
  build: { sourcemap: false, chunkSizeWarningLimit: 900 },
  test: {
    globals: true,
    env: { VITE_API_URL: "http://api.test" },
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/test/**", "src/**/*.test.*", "src/main.tsx", "src/vite-env.d.ts"],
      reporter: ["text-summary", "html"],
      thresholds: { statements: 90, branches: 85, functions: 85, lines: 90 },
    },
  },
});
