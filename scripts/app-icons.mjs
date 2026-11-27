// Draws the app's icons (public/icons/*.png) from public/favicon.svg, in
// OSR's bone on black: rounded for browsers and desktops, full-bleed for
// the systems that cut their own shape (iOS; Android's maskable one, the
// emblem inside its safe zone).
// Usage: node scripts/app-icons.mjs (rerun if the emblem changes)
import { readFileSync } from "node:fs";
import sharp from "sharp";

const root = new URL("../", import.meta.url);
const favicon = readFileSync(new URL("public/favicon.svg", root), "utf8");
const emblem = favicon.match(/<g[^>]*>([\s\S]*)<\/g>/)[1];
const square = (scale, radius = 0) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><rect width="512" height="512" rx="${radius}" fill="#000000"/><g transform="translate(${256 - 12 * scale} ${256 - 12 * scale}) scale(${scale})">${emblem}</g></svg>`;

const save = (svg, size, name, opaque) => {
  const image = sharp(Buffer.from(svg), { density: 144 }).resize(size, size);
  return (opaque ? image.removeAlpha() : image)
    .png()
    .toFile(new URL(`public/icons/${name}.png`, root).pathname);
};
await save(square(17.04, 112), 192, "icon-192");
await save(square(17.04, 112), 512, "icon-512");
await save(square(15.2), 180, "apple-touch-icon", true);
await save(square(12.75), 512, "icon-maskable-512", true);
