// Draws the home-screen shortcut icons (public/icons/shortcuts/*.png,
// listed under `shortcuts` in vite.config.ts): each tab's Tabler icon,
// as the nav draws it, in gold on the app icon's dark rounded square;
// a full-bleed copy (-maskable) for launchers that cut their own shape
// (Android), the icon well inside the safe zone.
// Usage: node scripts/shortcut-icons.mjs (rerun if a tab's icon changes)
import { readFileSync } from "node:fs";
import sharp from "sharp";

const root = new URL("../", import.meta.url);
// Same icons as IconOracle/IconTable/IconDice/IconJournal in Icons.tsx.
const icons = { oraculo: "crystal-ball", tablas: "list-numbers", dados: "dice-5", diario: "book" };

for (const [name, tabler] of Object.entries(icons)) {
  const svg = readFileSync(new URL(`node_modules/@tabler/icons/icons/outline/${tabler}.svg`, root), "utf8");
  const paths = svg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  for (const maskable of [false, true]) {
    const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="192" height="192">
    <rect width="96" height="96" rx="${maskable ? 0 : 22}" fill="#0b0c10"/>
    <g transform="${maskable ? "translate(24 24) scale(2)" : "translate(16 16) scale(2.667)"}" fill="none" stroke="#d7b26d" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${paths}</g>
</svg>`;
    const file = `public/icons/shortcuts/${name}${maskable ? "-maskable" : ""}.png`;
    await sharp(Buffer.from(icon)).png().toFile(new URL(file, root).pathname);
  }
}
