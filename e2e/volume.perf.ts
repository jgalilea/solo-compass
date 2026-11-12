import { expect, test, type Page } from "@playwright/test";

/**
 * Synthetic performance check: years of play (thousands of journal
 * entries and rolls) restored from a backup, then the usual screens
 * timed on a phone with the CPU slowed down like a modest one. Not
 * part of the deploy: run it by hand with `npm run test:perf` after
 * touching how the journal or the history load and render.
 *
 * Budgets are generous on purpose: they catch something going badly
 * wrong (a screen that takes seconds), not small regressions. Each
 * timing is printed so it can be compared between runs.
 */

/** Chromium's CPU throttling: 4x is roughly a mid-range Android phone. */
const CPU_SLOWDOWN = 4;

const BIG_ADVENTURE_ENTRIES = 5000;
const OTHER_ADVENTURES = 20;
const OTHER_ADVENTURE_ENTRIES = 200;
const HISTORY_ROLLS = 10000;
/** An imported journal with no session markers: one long block. */
const UNSPLIT_ENTRIES = 2000;

const DAY = 24 * 60 * 60 * 1000;

const NPCS = ["Odile", "Tobías", "Capa Gris", "Bram", "Ysolde", "Merek", "la Viuda", "Hal"];
const PLACES = ["Posada del cruce", "Torre vieja", "Bosque de ceniza", "Puerto gris", "Cripta"];
const WORDS =
  "la lluvia golpea los postigos mientras el fuego se apaga y alguien sube por la escalera con una carta sellada que nadie debería haber abierto".split(" ");

function sentence(i: number, length = 14): string {
  const words: string[] = [];
  for (let w = 0; w < length; w++) words.push(WORDS[(i * 7 + w * 3) % WORDS.length]);
  return words.join(" ");
}

/** A backup payload (schema 4, see src/lib/backup.ts) with years of play. */
function buildVolumeBackup() {
  const start = Date.now() - 3 * 365 * DAY;
  let clock = start;
  const tick = () => (clock += 60_000);

  const history: object[] = [];
  const adventures: object[] = [];
  const entries: object[] = [];

  function addAdventure(id: string, name: string, count: number, sessions = true) {
    adventures.push({ id, name, createdAt: clock, updatedAt: clock, favorite: false, status: "ongoing" });
    for (let i = 0; i < count; i++) {
      const timestamp = tick();
      const entry = (kind: string, text: string, extra: object = {}) =>
        entries.push({ id: `${id}-e${i}`, adventureId: id, timestamp, kind, text, ...extra });
      const step = i % 10;
      if (i === 0 && !sessions) entry("note", "Primera página del diario importado");
      else if (sessions && i % 100 === 0) entry("session", `Sesión ${i / 100 + 1} · ${sentence(i, 3)}`);
      else if (step === 1) entry("action", `Busco a [N:${NPCS[i % NPCS.length]}] en [L:${PLACES[i % PLACES.length]}]`);
      else if (step === 2) entry("question", `¿${sentence(i, 6)}?`);
      else if (step === 3) {
        const rollId = `${id}-r${i}`;
        const [white, black] = [1 + (i % 6), 1 + ((i * 5) % 6)];
        history.push({
          kind: "oraculo",
          id: rollId,
          timestamp,
          question: sentence(i, 6),
          likelihood: "equilibrado",
          white: { color: "blanco", rolls: [white], kept: white },
          black: { color: "negro", rolls: [black], kept: black },
          answer: white === black ? "contradiccion" : white > black ? "si" : "no",
          qualifier: null,
          favorite: false,
        });
        entry("roll", `Recluse ${white}/${black} -> ${white > black ? "Sí" : "No"}`, { linkedRollId: rollId });
      } else if (step === 4) entry("consequence", sentence(i));
      else if (step === 7) entry("note", `[Clock:Alarma ${i % 6}/6] ${sentence(i, 8)}`);
      else entry("note", `${sentence(i, 30)}\n${sentence(i + 1, 20)}`);
    }
  }

  addAdventure("big", "La gran campaña", BIG_ADVENTURE_ENTRIES);
  addAdventure("unsplit", "Diario importado sin sesiones", UNSPLIT_ENTRIES, false);
  for (let a = 0; a < OTHER_ADVENTURES; a++) addAdventure(`adv${a}`, `Aventura ${a + 1}`, OTHER_ADVENTURE_ENTRIES);

  // Loose rolls (oracle screen, tables) up to the history's size.
  while (history.length < HISTORY_ROLLS) {
    const i = history.length;
    history.push({
      kind: "tabla",
      id: `t${i}`,
      timestamp: tick(),
      tableId: "accion",
      tableName: "Acción",
      rolls: [1 + (i % 6)],
      total: 1 + (i % 6),
      resultText: sentence(i, 2),
      favorite: false,
    });
  }

  return {
    app: "solo-compass",
    schemaVersion: 4,
    exportedAt: new Date().toISOString(),
    history,
    journal: { adventures, entries, deleted: [] },
    customTables: [],
    settings: {
      theme: "fantasia",
      mode: "dark",
      locale: "es",
      oracleId: "recluse",
      activeAdventureId: "big",
      favoriteTableIds: [],
    },
  };
}

async function timed(label: string, action: () => Promise<void>, budgetMs: number) {
  const startedAt = Date.now();
  await action();
  const ms = Date.now() - startedAt;
  console.log(`${label.padEnd(36)} ${String(ms).padStart(6)} ms  (budget ${budgetMs} ms)`);
  test.info().annotations.push({ type: label, description: `${ms} ms` });
  expect(ms, label).toBeLessThan(budgetMs);
}

async function slowDownCpu(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_SLOWDOWN });
}

test("stays usable with years of play on a modest phone", async ({ page }) => {
  test.setTimeout(5 * 60_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  const backup = buildVolumeBackup();
  console.log(
    `Volume: ${backup.journal.entries.length} entries in ${backup.journal.adventures.length} adventures, ` +
      `${backup.history.length} rolls, CPU ${CPU_SLOWDOWN}x slower`,
  );

  // Restore it as a player would (Settings → restore → replace).
  await page.goto("./#/diario");
  await page.getByRole("button", { name: /^Ajustes/ }).click();
  await page.locator('input[type=file][accept*="json"]').setInputFiles({
    name: "solo-compass-volumen.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await page.getByRole("button", { name: /Sustituir todo/ }).click();
  await expect(page.getByText("La gran campaña").first()).toBeVisible({ timeout: 60_000 });

  await slowDownCpu(page);

  await timed("Cold start to the journal list", async () => {
    await page.reload();
    await expect(page.getByText("La gran campaña").first()).toBeVisible({ timeout: 30_000 });
  }, 4000);

  await timed("Search across every journal", async () => {
    await page.getByLabel("Buscar aventuras y entradas del diario").fill("carta sellada postigos");
    await expect(page.getByText("En los diarios").first()).toBeVisible({ timeout: 30_000 });
  }, 3000);
  await page.getByLabel("Buscar aventuras y entradas del diario").fill("");

  await timed("Open the 5,000-entry adventure", async () => {
    await page.getByText("La gran campaña").first().click();
    await expect(page.locator("[data-composer] textarea")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("[id^=entry-]").last()).toBeVisible({ timeout: 30_000 });
  }, 4000);

  await timed("Write an entry in it", async () => {
    await page.locator("[data-composer] textarea").fill("Una entrada más al final de todo.");
    await page.getByRole("button", { name: "Añadir al diario" }).click();
    await expect(page.locator("[id^=entry-]").getByText("Una entrada más al final de todo.")).toBeVisible({
      timeout: 30_000,
    });
  }, 1500);

  await timed("Open a 2,000-entry single session", async () => {
    await page.getByRole("link", { name: "Volver al diario" }).click();
    await page.getByText("Diario importado sin sesiones").first().click();
    await expect(page.locator("[id^=entry-]").last()).toBeVisible({ timeout: 30_000 });
  }, 4000);

  await timed("Write an entry in that session", async () => {
    await page.locator("[data-composer] textarea").fill("Otra entrada en el bloque largo.");
    await page.getByRole("button", { name: "Añadir al diario" }).click();
    await expect(page.locator("[id^=entry-]").getByText("Otra entrada en el bloque largo.")).toBeVisible({
      timeout: 30_000,
    });
  }, 1500);

  await timed("Type 40 characters in that session", async () => {
    await page.locator("[data-composer] textarea").pressSequentially("La puerta del sótano cruje al abrirse.", { delay: 0 });
  }, 1500);

  // Its first entry is far above what's drawn: the search still gets
  // there, drawing a stretch around it rather than all 2,000 below.
  await page.locator("[data-composer] textarea").fill("");
  await page.getByRole("button", { name: "Buscar en el diario" }).click();
  await page.getByRole("textbox", { name: "Buscar en el diario" }).fill("primera página");
  await timed("Jump from the search to that session's first entry", async () => {
    await page.getByRole("textbox", { name: "Buscar en el diario" }).press("Enter");
    await expect(page.locator("#entry-unsplit-e0")).toBeInViewport({ timeout: 10_000 });
  }, 1500);
  await expect(page.getByRole("button", { name: /Ver entradas posteriores/ })).toBeVisible();

  // Writing from there goes back to the end, where the entry lands.
  await timed("Write an entry after jumping back", async () => {
    await page.locator("[data-composer] textarea").fill("De vuelta al final.");
    await page.getByRole("button", { name: "Añadir al diario" }).click();
    await expect(page.locator("[id^=entry-]").getByText("De vuelta al final.")).toBeInViewport({ timeout: 30_000 });
  }, 1500);

  await page.goto("./#/");
  await timed("Ask the oracle (10,000 rolls behind)", async () => {
    await page.getByLabel("Pregunta para el oráculo").fill("¿Sigue en pie la torre?");
    await page.getByRole("button", { name: "Lanzar los dados" }).click();
    await expect(page.getByText("¿Sigue en pie la torre?").first()).toBeVisible({ timeout: 30_000 });
  }, 1500);

  await timed("Open the roll history", async () => {
    await page.goto("./#/historial");
    await expect(page.getByText("¿Sigue en pie la torre?").first()).toBeVisible({ timeout: 30_000 });
  }, 3000);

  expect(errors).toEqual([]);
});
