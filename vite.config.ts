import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
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

/**
 * The home-screen shortcuts (long press on the icon): the four tabs, in
 * the nav's order. Icons drawn by scripts/shortcut-icons.mjs.
 */
const SHORTCUT_ROUTES = { oraculo: "", tablas: "tablas", dados: "dados", diario: "diario" };

function shortcuts(names: Record<keyof typeof SHORTCUT_ROUTES, string>): ManifestOptions["shortcuts"] {
  return Object.entries(names).map(([icon, name]) => ({
    name,
    url: `${base}#/${SHORTCUT_ROUTES[icon as keyof typeof SHORTCUT_ROUTES]}`,
    icons: [
      { src: `icons/shortcuts/${icon}.png`, sizes: "192x192", type: "image/png" },
      { src: `icons/shortcuts/${icon}-maskable.png`, sizes: "192x192", type: "image/png", purpose: "maskable" },
    ],
  }));
}

// Lets a browser tab ask whether the app is installed
// (navigator.getInstalledRelatedApps, src/lib/install.ts): it's the
// manifest the app was installed with, in either language.
const relatedApplications: ManifestOptions["related_applications"] = [
  "manifest.webmanifest",
  "manifest.en.webmanifest",
].map((file) => ({ platform: "webapp", url: `https://jgalilea.github.io${base}${file}` }));

/**
 * The files the installed app opens: a Lonelog journal, tables of one's
 * own or a backup. Everything it's handed is looked at before anything
 * is kept (src/lib/fileImport.ts).
 */
const OPENED_FILES: Record<string, string[]> = {
  "text/markdown": [".md", ".markdown"],
  "text/plain": [".txt"],
  "application/json": [".json"],
};

const manifest: Partial<ManifestOptions> = {
  id: base,
  name: "Solo Compass",
  short_name: "Solo Compass",
  description:
    "Oráculo de sí o no, más de 750 tablas, dados, cartas y un diario en Lonelog para jugar rol en solitario. Sin cuenta, sin conexión y todo en tu dispositivo.",
  start_url: base,
  scope: base,
  display: "standalone",
  background_color: "#000000",
  theme_color: "#000000",
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
  shortcuts: shortcuts({ oraculo: "Oráculo", tablas: "Tablas", dados: "Dados", diario: "Diario" }),
  related_applications: relatedApplications,
  // "Open with Solo Compass" (Chromium on a computer): the files come
  // through window.launchQueue (src/lib/incomingFiles.ts).
  file_handlers: [{ action: base, accept: OPENED_FILES }],
  // In the share sheet (Android): the system posts the files to the
  // service worker (public/share-target.js), which keeps them for the app.
  share_target: {
    action: `${base}share-target`,
    method: "POST",
    enctype: "multipart/form-data",
    params: {
      files: [{ name: "file", accept: [...Object.keys(OPENED_FILES), ...Object.values(OPENED_FILES).flat()] }],
    },
  },
};

const englishManifest: Partial<ManifestOptions> = {
  ...manifest,
  description:
    "A yes/no oracle, 750+ tables, dice, cards and a Lonelog journal for solo role-playing. No account, works offline, everything stays on your device.",
  lang: "en",
  shortcuts: shortcuts({ oraculo: "Oracle", tablas: "Tables", dados: "Dice", diario: "Journal" }),
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

/**
 * Each language's dictionary is its own chunk (src/lib/i18n/index.ts),
 * which main.tsx waits for before the first render. Discovered only
 * once the main bundle runs, it would cost a round trip of its own on
 * a first visit: instead a small script in <head> picks the language
 * the way loadLocale does and preloads that chunk next to the main one.
 */
function localeModulePreloadPlugin(): Plugin {
  return {
    name: "solo-compass:locale-modulepreload",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(_html, ctx) {
        const files: Record<string, string> = {};
        for (const chunk of Object.values(ctx.bundle ?? {})) {
          const match = chunk.type === "chunk" && chunk.facadeModuleId?.match(/i18n\/locales\/(\w+)\.ts$/);
          if (match) files[match[1]] = base + chunk.fileName;
        }
        if (!files.es || !files.en) throw new Error("Locale chunks not found for the modulepreload hint");
        return [
          {
            tag: "script",
            injectTo: "head-prepend",
            children:
              "try{var l=localStorage.getItem(\"solo-compass:locale\");" +
              "if(l!==\"es\"&&l!==\"en\")l=(navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language])" +
              ".some(function(x){return x&&x.toLowerCase().indexOf(\"es\")===0})?\"es\":\"en\";" +
              "var p=document.createElement(\"link\");p.rel=\"modulepreload\";p.crossOrigin=\"\";" +
              `p.href=l==="es"?${JSON.stringify(files.es)}:${JSON.stringify(files.en)};` +
              "document.head.appendChild(p)}catch(e){}",
          },
        ];
      },
    },
  };
}

/** package.json's version: the app's, shown in Settings → About and in the changelog. */
const version: string = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")).version;

/** The commit being built, to tell two builds of the same version apart ("" outside git). */
function gitCommit(): string {
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
}

// https://vite.dev/config/
export default defineConfig({
  base,
  // Read through src/lib/appVersion.ts.
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __APP_COMMIT__: JSON.stringify(gitCommit()),
  },
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
        // Receives the files shared to the installed app (share_target above).
        importScripts: ["share-target.js"],
        // Only for link previews (index.html): players never need it offline.
        globIgnores: ["og-image.png", "404.html"],
      },
      // The manifest always comes from the network: Chrome reads it through
      // the service worker to build and update the installed app (WebAPK),
      // and with "prompt" an old worker would keep handing it a stale one
      // (its shortcuts never showed up on Android). The plugin adds it to
      // the precache itself, so it's taken out here.
      integration: {
        beforeBuildServiceWorker(options) {
          options.workbox.additionalManifestEntries = options.workbox.additionalManifestEntries?.filter(
            (entry) => typeof entry === "string" || !entry.url.endsWith(".webmanifest"),
          );
        },
      },
    }),
    englishManifestPlugin(),
    localeModulePreloadPlugin(),
  ],
  build: {
    // Each game's tables are their own chunk, loaded only when needed
    // (src/lib/tableGames.ts); the biggest, Starsmith, is ~650 kB. The
    // main bundle must stay well below this: keep an eye on its size.
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      output: {
        codeSplitting: {
          // What the first screen needs ($initial) in two chunks instead
          // of a dozen crumbs shared with the lazy screens: the libraries
          // (unchanged between versions, so an update doesn't download
          // them again) and the app's own code.
          groups: [
            { name: "vendor", test: /node_modules[\\/]/, tags: ["$initial"], priority: 2 },
            { name: "app", tags: ["$initial"], priority: 1 },
          ],
        },
      },
    },
  },
});
