import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("monaco-editor")) return "monaco";
          if (id.includes("node_modules")) return "vendor";
          if (id.includes("share.json")) return "share";
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Worker configuration for MOPSA WASM worker
  worker: {
    format: 'es',
  },
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: process.env.NODE_ENV === "development",
      },
      workbox: {
        // Increase limit to handle large WASM files (e.g., dllclang_parser.wasm is 15+ MB)
        maximumFileSizeToCacheInBytes: 20000000,
        // Exclude large WASM files from precaching to speed up initial load
        globPatterns: ['**/*.{js,css,html,svg,png,ico,txt,woff,woff2}'],
        // WASM files will be fetched on demand and cached at runtime
        runtimeCaching: [
          {
            urlPattern: /\.wasm$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'wasm-cache',
              expiration: {
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
      },
      includeAssets: [
        "web-app-manifest-192x192.png",
        "web-app-manifest-512x512.png",
        "screenshot-desktop.png",
        "screenshot-other.png",
      ],
      manifest: {
        name: "MopsaJs",
        short_name: "MopsaJs",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        description: "Modular Open Platform for Static Analysis.",
        icons: [
          {
            src: "/web-app-manifest-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/web-app-manifest-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
        screenshots: [
          {
            src: "/screenshot-desktop.png",
            sizes: "1662x1003",
            type: "image/png",
            form_factor: "wide",
          },
          {
            src: "/screenshot-other.png",
            sizes: "650x863",
            type: "image/png",
          },
        ],
      },
    }),
    react(),
    tailwindcss(),
  ],
});
