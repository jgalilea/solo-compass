// Draws public/og-image.png, the card shown when the app's link is
// shared (Open Graph, see index.html): the emblem, the name, a line in
// each language and a real screenshot of the oracle on a phone.
// Usage: npm run build && npx vite preview --port 4180 &
//        node scripts/og-image.mjs http://localhost:4180/solo-compass/
import { readFileSync } from "node:fs";
import { chromium, devices } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:4180/solo-compass/";
const root = new URL("../", import.meta.url);
const browser = await chromium.launch();

// The oracle, just answered, as a player sees it on a phone.
const phone = await browser.newContext({ ...devices["Pixel 7"], locale: "es-ES" });
const app = await phone.newPage();
await app.goto(base);
await app.getByLabel("Pregunta para el oráculo").fill("¿Me ha visto el guardia?");
await app.getByRole("button", { name: "Lanzar los dados" }).click();
await app.waitForTimeout(1200);
await app.evaluate(() => window.scrollTo(0, 0));
const shot = (await app.screenshot()).toString("base64");
await phone.close();

const logo = readFileSync(new URL("public/favicon.svg", root), "utf8");
// Inline: a page made with setContent can't load local files.
const font = (file) => `data:font/woff2;base64,${readFileSync(new URL(`public/fonts/${file}`, root)).toString("base64")}`;
const card = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await card.setContent(`<!doctype html><html><head><style>
  @font-face { font-family: Cinzel; font-weight: 700; src: url(${font("cinzel-700.woff2")}); }
  @font-face { font-family: Cinzel; font-weight: 400; src: url(${font("cinzel-400.woff2")}); }
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; overflow: hidden; display: flex; align-items: center; gap: 56px; padding: 0 72px;
    background: radial-gradient(ellipse at 30% 20%, #1d1a14 0%, #0b0c10 60%); color: #f4efe6; font-family: system-ui, sans-serif; }
  .text { flex: 1; }
  .logo { width: 96px; height: 96px; color: #d7b26d; }
  .logo svg { width: 100%; height: 100%; }
  h1 { font-family: Cinzel; font-weight: 700; font-size: 76px; letter-spacing: 2px; margin-top: 18px; line-height: 1; }
  .es { font-size: 32px; margin-top: 26px; line-height: 1.3; }
  .en { font-size: 24px; margin-top: 12px; color: #cfc9bc; line-height: 1.3; }
  .tags { margin-top: 30px; font-family: Cinzel; font-size: 20px; color: #d7b26d; letter-spacing: 1px; }
  .phone { width: 300px; height: 560px; border-radius: 36px; border: 3px solid #3a3528; overflow: hidden; flex: none;
    box-shadow: 0 30px 80px rgba(0,0,0,.6), 0 0 0 10px #14161c; }
  .phone img { width: 100%; }
</style></head><body>
  <div class="text">
    <div class="logo">${logo}</div>
    <h1>Solo Compass</h1>
    <p class="es">Oráculo, tablas y diario para rol en solitario.</p>
    <p class="en">Oracle, tables and journal for solo role-playing.</p>
    <p class="tags">Gratis · Sin conexión · Lonelog</p>
  </div>
  <div class="phone"><img src="data:image/png;base64,${shot}"></div>
</body></html>`);
await card.evaluate(() => document.fonts.ready);
await card.screenshot({ path: new URL("public/og-image.png", root).pathname });
await browser.close();
console.log("public/og-image.png written");
