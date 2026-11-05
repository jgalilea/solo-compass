import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// GitHub Pages repository name: https://<user>.github.io/solo-compass/
const base = "/solo-compass/";

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // "prompt": the new version waits until the person presses "Update"
      // in the app's banner (UpdatePrompt), instead of reloading by itself
      // and risking losing something half-typed. Registration is done by
      // UpdatePrompt (virtual:pwa-register/react), which also checks for
      // updates when coming back to the app: once installed, it hardly ever
      // navigates again, which is when the browser checks.
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["favicon.svg"],
      manifest: {
        id: base,
        name: "Solo Compass",
        short_name: "Solo Compass",
        description:
          "Oráculo Recluse y tablas de significado para guiar partidas de rol en solitario.",
        start_url: base,
        scope: base,
        display: "standalone",
        background_color: "#0b0c10",
        theme_color: "#0b0c10",
        lang: "es",
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
      },
    }),
  ],
  build: {
    // Each game's tables are their own chunk, loaded only when needed
    // (src/lib/tableGames.ts); the biggest, Starsmith, is ~650 kB. The
    // main bundle must stay well below this: keep an eye on its size.
    chunkSizeWarningLimit: 700,
  },
});
