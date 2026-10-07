import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    // Mesmo alias do jsconfig.json ("@/*" → "./src/*").
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // Por enquanto só funções puras (dinheiro, validações, cálculos): sem DOM.
    environment: "node",
    include: ["src/**/*.test.js"],
  },
})
