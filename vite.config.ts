import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// Nombre del repositorio de GitHub Pages: https://<user>.github.io/solo-compass/
const base = "/solo-compass/";

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
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
});
