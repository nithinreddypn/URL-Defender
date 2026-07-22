import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [tsconfigPaths(), tailwindcss(), viteReact()],
  build: {
    outDir: "../public",
    emptyOutDir: false,
    assetsDir: "assets",
    sourcemap: false,
    manifest: true,
  },
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8001",
        changeOrigin: true,
      },
    },
  },
});
