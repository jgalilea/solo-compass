import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA, type ManifestOptions } from "vite-plugin-pwa";

// GitHub Pages repository name: https://<user>.github.io/solo-compass/
const base = "/solo-compass/";

// The app's manifest, in Spanish (the default language). The English
// copy (manifest.en.webmanifest) differs only in description and lang:
// LocaleProvider points <link rel="manifest"> at the one matching the
// language picked, so installing shows it in that language. Same `id`,
// so both are the same installed app.
const manifest: Partial<ManifestOptions> = {
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
};

const englishManifest: Partial<ManifestOptions> = {
  ...manifest,
  description: "Recluse oracle and meaning tables to guide solo role-playing games.",
  lang: "en",
};

/** Writes the English manifest next to the one vite-plugin-pwa builds. */
function englishManifestPlugin(): Plugin {
  return {
    name: "solo-compass:english-manifest",
    apply: "build",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "manifest.en.webmanifest",
        source: JSON.stringify(englishManifest),
      });
    },
  };
}

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
      manifest,
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
      },
    }),
    englishManifestPlugin(),
  ],
  build: {
    // Each game's tables are their own chunk, loaded only when needed
    // (src/lib/tableGames.ts); the biggest, Starsmith, is ~650 kB. The
    // main bundle must stay well below this: keep an eye on its size.
    chunkSizeWarningLimit: 700,
  },
});
