import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: "happy-dom",
    setupFiles: ["./src/test/setup.ts"],
    server: { deps: { inline: [/@snort/] } },
  },
});
