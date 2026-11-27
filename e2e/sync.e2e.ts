import AxeBuilder from "@axe-core/playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { chromium, expect, test, type Page, type TestInfo } from "@playwright/test";
import { encode } from "uqr";
import { fakeRelay, LIVE_RELAY } from "./fakeRelay.ts";

/**
 * Two devices (two browsers with nothing in common) syncing through a
 * fake relay: the relay's own code (relay/src/box.ts) behind Playwright's
 * routing, so nothing leaves the machine. Only for a build with a relay
 * (VITE_SYNC_RELAY_URL in .env): without one, Settings has no sync and
 * the test is skipped. Fails on any console error, except the relay's
 * answers that are failures on purpose (the browser logs those).
 *
 * With SYNC_E2E_LIVE=1 the requests go to the build's real relay
 * instead (`npm run dev` in relay/, and the app built with
 * VITE_SYNC_RELAY_URL=http://localhost:8787): only the failures on
 * purpose are faked (fakeRelay.ts).
 */

function watchErrors(page: Page, allowed?: RegExp): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !allowed?.test(message.text())) errors.push(message.text());
  });
  return errors;
}

/** The sync card against axe (WCAG 2.1 A and AA), like a11y.e2e.ts does the screens. */
async function expectAccessible(page: Page, where: string, within = "#settings-sync") {
  const results = await new AxeBuilder({ page })
    .include(within)
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const found = results.violations.map(
    (v) => `${where}: ${v.id} ${v.help} ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
  );
  expect(found, found.join("\n")).toEqual([]);
}

async function openSettings(page: Page) {
  await page.goto("./#/");
  await page.getByRole("button", { name: /^Ajustes/ }).click();
  // A build with a relay allows its origin in the Content Security Policy.
  const policy = await page
    .locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute("content");
  if (!/connect-src 'self' \S/.test(policy ?? ""))
    test.skip(true, "This build has no device sync (VITE_SYNC_RELAY_URL is empty).");
  const card = page.locator("#settings-sync");
  await expect(card).toBeVisible();
  await card.scrollIntoViewIfNeeded();
  return card;
}

async function closeSettings(page: Page) {
  await page.keyboard.press("Escape");
  // Closing takes its history entry off a moment later: navigating before would be undone by it.
  await expect.poll(() => page.evaluate("history.state?.modalDepth ?? 0")).toBe(0);
}

async function newAdventure(page: Page, name: string) {
  await page.goto("./#/diario");
  await page.getByRole("button", { name: "Nueva aventura" }).click();
  await page.getByPlaceholder("Nombre de la aventura").fill(name);
  await page.getByRole("button", { name: "Crear" }).click();
}

async function write(page: Page, text: string) {
  const composer = page.locator("[data-composer] textarea");
  await composer.pressSequentially(text);
  await page.getByRole("button", { name: "Añadir al diario" }).click();
}

/** "Sync now", from Settings, until it says it's done. */
async function syncNow(page: Page) {
  const card = await openSettings(page);
  await card.getByRole("button", { name: "Sincronizar ahora" }).click();
  await expect(card.getByText(/^Sincronizado/)).toBeVisible();
  await closeSettings(page);
}

/** The header's sync icon (the adventure's bar has its own, only for trouble). */
function glance(page: Page) {
  return page.locator("[data-sync-glance]").filter({ visible: true });
}

/** The app goes out of view (another app, the screen off) or comes back, as the browser tells it. */
async function setVisible(page: Page, visible: boolean) {
  await page.evaluate(`{
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "${visible ? "visible" : "hidden"}" });
    document.dispatchEvent(new Event("visibilitychange"));
  }`);
}

async function openAdventure(page: Page, name: string) {
  await page.goto("./#/diario");
  await page.getByText(name, { exact: true }).first().click();
  await expect(page.locator("[data-composer] textarea")).toBeVisible();
}

/** Everything the sync carries, from a full backup ("Export everything"), in a stable order. */
async function syncedData(page: Page) {
  await openSettings(page);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar todo" }).click();
  const backup = JSON.parse(readFileSync(await (await download).path(), "utf8"));
  await closeSettings(page);
  type Row = { id: string } & Record<string, unknown>;
  const byId = (list: Row[] = []) => [...list].sort((a, b) => a.id.localeCompare(b.id));
  return {
    history: byId(backup.history),
    adventures: byId(backup.journal.adventures),
    entries: byId(backup.journal.entries),
    deleted: byId(backup.journal.deleted),
    customTables: byId(backup.customTables),
    savedRolls: byId(backup.savedRolls),
    generators: byId(backup.generators),
  };
}

/** A backup with one of each thing the sync carries, to merge in as a player would. */
function smallBackup() {
  const now = Date.now() - 60_000;
  const entry = (id: string, text: string, i: number) => ({
    id,
    adventureId: "cripta",
    timestamp: now + i,
    kind: "note",
    text,
  });
  return {
    app: "solo-compass",
    schemaVersion: 6,
    exportedAt: new Date().toISOString(),
    history: [
      {
        kind: "tabla",
        id: "roll-1",
        timestamp: now,
        tableId: "botin",
        tableName: "Botín del faro",
        rolls: [2],
        total: 2,
        resultText: "Un diario empapado",
        favorite: true,
      },
    ],
    journal: {
      adventures: [
        {
          id: "cripta",
          name: "La cripta",
          createdAt: now,
          updatedAt: now,
          favorite: false,
          status: "ongoing",
          notes: "- [ ] Bajar con luz",
        },
      ],
      entries: [
        entry("c1", "Bajo las escaleras de la cripta.", 1),
        entry("c2", "Huele a cera y a tierra mojada.", 2),
        entry("c3", "Una losa está movida.", 3),
      ],
      deleted: [],
    },
    customTables: [
      {
        id: "botin",
        name: "Botín del faro",
        description: "",
        dice: "d3",
        entries: [
          { range: [1, 1], text: "Una lente rota" },
          { range: [2, 2], text: "Un diario empapado" },
          { range: [3, 3], text: "Aceite para la lámpara" },
        ],
        createdAt: now,
        updatedAt: now,
      },
    ],
    savedRolls: [
      {
        id: "espada",
        name: "Espada",
        formula: "1d8+2",
        favorite: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    generators: [
      { id: "hallazgo", name: "Hallazgo", tableIds: ["botin"], createdAt: now, updatedAt: now },
    ],
    settings: {
      theme: "osr",
      mode: "dark",
      locale: "es",
      oracleId: "recluse",
      activeAdventureId: null,
      favoriteTableIds: [],
    },
  };
}

test("two devices share a journal through the relay, and a pause says so", async ({
  page,
  browser,
}, testInfo) => {
  const relay = fakeRelay();
  await relay.attach(page.context());
  // Still: a colour checked halfway through a fade isn't the colour shown.
  await page.emulateMedia({ reducedMotion: "reduce" });
  // The relay's failures, sent on purpose below, are logged by the browser.
  const errors = watchErrors(page, /status of 503/);

  // The phone: a journal, then sync turned on.
  await newAdventure(page, "El faro");
  await write(page, "La lámpara lleva días apagada.");
  let card = await openSettings(page);
  await card.getByRole("button", { name: "Activar en este dispositivo" }).click();
  await expect(card.getByText("Guarda este código en un sitio seguro")).toBeVisible();
  await expect(
    card.getByRole("img", { name: "Código QR para vincular otro dispositivo" }),
  ).toBeVisible();
  await expectAccessible(page, "new code");
  const code = (await card.locator(".font-mono").first().textContent())!.trim();
  expect(code).toMatch(/^([0-9A-Z]{4}-){6}[0-9A-Z]{3}$/);
  await card.getByRole("button", { name: "Hecho, ya lo he guardado" }).click();
  await expect(card.getByText(/^Sincronizado/)).toBeVisible();
  await closeSettings(page);
  // At a glance, from the header: synced.
  await expect(glance(page)).toHaveAttribute("data-sync-glance", "ok");
  await expect(glance(page)).toHaveAccessibleName(/^Sincronizado ahora/);
  await expectAccessible(page, "header with the sync icon", "header");

  // The computer: nothing yet, then the code typed in.
  const computer = await browser.newContext({ ...testInfo.project.use, locale: "es-ES" });
  await relay.attach(computer);
  const other = await computer.newPage();
  const otherErrors = watchErrors(other);
  card = await openSettings(other);
  await card.getByRole("button", { name: "Ya tengo un código" }).click();
  await card.getByLabel("Código de sincronización").fill("ABCD");
  await card.getByRole("button", { name: "Vincular" }).click();
  await expect(card.getByText("Ese código no es válido")).toBeVisible();
  await card.getByLabel("Código de sincronización").fill(code.toLowerCase().replace(/-/g, " "));
  await card.getByRole("button", { name: "Vincular" }).click();
  await expect(card.getByText(/^Sincronizado/)).toBeVisible();
  await closeSettings(other);

  // The phone's adventure is there, entry and all.
  await other.goto("./#/diario");
  await other.getByText("El faro").first().click();
  await expect(
    other.locator("[id^=entry-]").getByText("La lámpara lleva días apagada."),
  ).toBeVisible();

  // Written on the computer, it reaches the phone (without reloading it).
  await write(other, "Alguien ha dejado huellas en la arena.");
  // At a glance: a change waiting to go (it goes a few minutes later), and a tap opens the sync's card.
  await other.goto("./#/diario");
  await expect(glance(other)).toHaveAttribute("data-sync-glance", "pending");
  await glance(other).click();
  card = other.locator("#settings-sync");
  await expect(card).toBeInViewport();
  await expect(card.getByText(/Hay cambios por enviar/)).toBeVisible();
  await card.getByRole("button", { name: "Sincronizar ahora" }).click();
  await expect(card.getByText(/^Sincronizado/)).toBeVisible();
  await closeSettings(other);
  await expect(glance(other)).toHaveAttribute("data-sync-glance", "ok");

  await page.goto("./#/diario");
  card = await openSettings(page);
  await card.getByRole("button", { name: "Sincronizar ahora" }).click();
  await expect(card.getByText(/^Sincronizado/)).toBeVisible();
  // Both devices, by name (it travels sealed), and this one's name changed.
  await expect(card.getByText("Dispositivos (2)")).toBeVisible();
  await expect(card.getByText(/^visto /)).toBeVisible();
  await card.getByRole("button", { name: "Cambiar nombre" }).click();
  await card.getByLabel("Nombre de este dispositivo").fill("Móvil del faro");
  await card.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(card.getByText("Móvil del faro")).toBeVisible();
  await closeSettings(page);
  await page.getByText("El faro").first().click();
  await expect(
    page.locator("[id^=entry-]").getByText("Alguien ha dejado huellas en la arena."),
  ).toBeVisible();

  // The relay's daily allowance runs out: paused, until when, and what to do meanwhile.
  relay.fail("quota");
  card = await openSettings(page);
  await card.getByRole("button", { name: "Sincronizar ahora" }).click();
  await expect(card.getByText("Sincronización en pausa")).toBeVisible();
  await expect(card.getByText(/como muy tarde a medianoche UTC/)).toBeVisible();
  await expect(card.getByText(/pasar tus cambios a mano/)).toBeVisible();
  await expectAccessible(page, "paused");
  await closeSettings(page);
  await expect(glance(page)).toHaveAttribute("data-sync-glance", "paused");
  card = await openSettings(page);
  // Back: synced again.
  relay.fail(null);
  await card.getByRole("button", { name: "Sincronizar ahora" }).click();
  await expect(card.getByText(/^Sincronizado/)).toBeVisible();

  await computer.close();
  expect(errors).toEqual([]);
  expect(otherErrors).toEqual([]);
});

test("a link with a code asks before linking", async ({ page, browser }, testInfo) => {
  const relay = fakeRelay();
  await relay.attach(page.context());
  // In dark mode this time (the other test runs in light).
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
  const errors = watchErrors(page);
  const card = await openSettings(page);
  await card.getByRole("button", { name: "Activar en este dispositivo" }).click();
  const code = (await card.locator(".font-mono").first().textContent())!.trim();
  await card.getByRole("button", { name: "Hecho, ya lo he guardado" }).click();

  const computer = await browser.newContext({
    ...testInfo.project.use,
    locale: "es-ES",
    colorScheme: "dark",
    reducedMotion: "reduce",
  });
  await relay.attach(computer);
  const other = await computer.newPage();
  const otherErrors = watchErrors(other);
  await other.goto(`./#/?vincular=${code.replace(/-/g, "")}`);
  const asked = other.locator("#settings-sync");
  await expect(asked.getByText("¿Vincular este dispositivo?")).toBeVisible();
  await expect(asked.getByText(/Vincula solo si el código es tuyo/)).toBeVisible();
  await expectAccessible(other, "asked from a link");
  // Nothing linked until it's said yes.
  await expect(asked.getByRole("button", { name: "Sincronizar ahora" })).toHaveCount(0);
  await asked.getByRole("button", { name: "Vincular" }).click();
  await expect(asked.getByText(/^Sincronizado/)).toBeVisible();
  await asked.getByRole("button", { name: "Más opciones" }).click();
  await expectAccessible(other, "synced");
  // The link's code is gone from the address.
  expect(other.url()).not.toContain("vincular");

  await computer.close();
  expect(errors).toEqual([]);
  expect(otherErrors).toEqual([]);
});

test("syncing while playing keeps both devices' data whole and the same", async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  const relay = fakeRelay();
  await relay.attach(page.context());
  const errors = watchErrors(page);

  // The phone syncs, then a backup is merged in (everything the sync carries, in one go).
  let card = await openSettings(page);
  await card.getByRole("button", { name: "Activar en este dispositivo" }).click();
  const code = (await card.locator(".font-mono").first().textContent())!.trim();
  await card.getByRole("button", { name: "Hecho, ya lo he guardado" }).click();
  await expect(card.getByText(/^Sincronizado/)).toBeVisible();
  await page.locator('input[type=file][accept*="json"]').setInputFiles({
    name: "copia.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(smallBackup())),
  });
  // It reloads with the merge in place (wait for it: navigating meanwhile would cut it short).
  const reloaded = page.waitForEvent("framenavigated");
  await page.getByRole("button", { name: /Juntar con lo de este dispositivo/ }).click();
  await reloaded;
  await page.waitForLoadState("load");
  await expect(page.getByRole("button", { name: /^Ajustes/ })).toBeVisible();
  await syncNow(page);

  // The computer links, and gets all of it.
  const computer = await browser.newContext({ ...testInfo.project.use, locale: "es-ES" });
  await relay.attach(computer);
  const other = await computer.newPage();
  const otherErrors = watchErrors(other);
  card = await openSettings(other);
  await card.getByRole("button", { name: "Ya tengo un código" }).click();
  await card.getByLabel("Código de sincronización").fill(code);
  await card.getByRole("button", { name: "Vincular" }).click();
  await expect(card.getByText(/^Sincronizado/)).toBeVisible();
  await closeSettings(other);
  await openAdventure(other, "La cripta");
  await expect(other.locator("[id^=entry-]").getByText("Una losa está movida.")).toBeVisible();
  await other.goto("./#/tablas");
  await other.getByRole("button", { name: /Tus tablas/ }).click();
  await expect(other.getByRole("heading", { name: "Botín del faro" })).toBeVisible();

  // The computer deletes one entry and edits another…
  await openAdventure(other, "La cripta");
  const gone = other.locator("[id^=entry-]").filter({ hasText: "Huele a cera y a tierra mojada." });
  await gone.click();
  await gone.getByRole("button", { name: "Eliminar entrada" }).click();
  await expect(gone).toHaveCount(0);
  const edited = other.locator("[id^=entry-]").filter({ hasText: "Una losa está movida." });
  await edited.click();
  await edited.getByRole("button", { name: "Editar entrada" }).click();
  await other.locator("textarea:focus").fill("Una losa está movida, y debajo hay un hueco.");
  await other.getByRole("button", { name: "Guardar", exact: true }).click();
  await syncNow(other);

  // …while the phone, in two tabs, writes on.
  const secondTab = await page.context().newPage();
  const secondErrors = watchErrors(secondTab);
  await openAdventure(secondTab, "La cripta");
  await write(secondTab, "La antorcha chisporrotea.");
  await syncNow(secondTab);
  await syncNow(page);
  await openAdventure(page, "La cripta");
  await expect(
    page.locator("[id^=entry-]").getByText("Una losa está movida, y debajo hay un hueco."),
  ).toBeVisible();
  await expect(
    page.locator("[id^=entry-]").getByText("Huele a cera y a tierra mojada."),
  ).toHaveCount(0);
  await expect(page.locator("[id^=entry-]").getByText("La antorcha chisporrotea.")).toBeVisible();

  // Once more each way: the deleted entry doesn't come back, and both hold exactly the same.
  await syncNow(other);
  await syncNow(page);
  const phoneData = await syncedData(page);
  const computerData = await syncedData(other);
  expect(computerData).toEqual(phoneData);
  expect(phoneData.entries.map((e) => e.text)).not.toContain("Huele a cera y a tierra mojada.");
  expect(phoneData.deleted.map((d) => d.id)).toContain("c2");
  expect(phoneData.customTables).toHaveLength(1);
  expect(phoneData.savedRolls).toHaveLength(1);
  expect(phoneData.generators).toHaveLength(1);
  expect(phoneData.history.length).toBeGreaterThanOrEqual(1);

  await computer.close();
  expect(errors).toEqual([]);
  expect(secondErrors).toEqual([]);
  expect(otherErrors).toEqual([]);
});

test("something failing on the device is said, with a report, and passes", async ({ page }) => {
  const relay = fakeRelay();
  await relay.attach(page.context());
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = watchErrors(page);
  const card = await openSettings(page);
  await card.getByRole("button", { name: "Activar en este dispositivo" }).click();
  await card.getByRole("button", { name: "Hecho, ya lo he guardado" }).click();
  await expect(card.getByText(/^Sincronizado/)).toBeVisible();

  // The browser's storage refuses the sync's writes (full, say).
  await page.evaluate(`{
    const put = IDBObjectStore.prototype.put;
    window.restorePut = () => { IDBObjectStore.prototype.put = put; };
    IDBObjectStore.prototype.put = function (...args) {
      if (this.transaction.db.name === "solo-compass-sync") throw new DOMException("No room", "QuotaExceededError");
      return put.apply(this, args);
    };
  }`);
  await card.getByRole("button", { name: "Sincronizar ahora" }).click();
  await expect(card.getByText(/Algo ha fallado en este dispositivo/)).toBeVisible();
  await expect(card.getByText(/Lo volverá a intentar sola a las/)).toBeVisible();
  await expect(card.getByRole("button", { name: "Copiar el informe" })).toBeVisible();
  await expectAccessible(page, "failed here");
  // At a glance: paused (it tries again by itself), not yet a problem.
  await closeSettings(page);
  await expect(glance(page)).toHaveAttribute("data-sync-glance", "paused");
  await openSettings(page);
  // The report says what failed, and nothing of the journal.
  const report: string = await page.evaluate(
    `JSON.parse(localStorage.getItem("solo-compass:sync-status")).report`,
  );
  expect(report).toContain("QuotaExceededError");
  expect(report).not.toContain("No room");

  // Storage back: synced again.
  await page.evaluate("window.restorePut()");
  await card.getByRole("button", { name: "Sincronizar ahora" }).click();
  await expect(card.getByText(/^Sincronizado/)).toBeVisible();
  expect(errors).toEqual([]);
});

test("the full explanation opens from the card and from the privacy note", async ({ page }) => {
  const errors = watchErrors(page);
  const card = await openSettings(page);
  await card.getByRole("button", { name: "Cómo funciona, seguridad y privacidad" }).click();
  const help = page.getByRole("dialog", { name: "Cómo funciona, seguridad y privacidad" });
  await expect(
    help.getByRole("heading", { name: "Cómo funciona la sincronización" }),
  ).toBeVisible();
  for (const heading of [
    "Cómo se activa",
    "Qué viaja y qué no",
    "Seguridad",
    "Privacidad y uso de tus datos",
    "No es una copia de seguridad",
  ]) {
    await expect(help.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  }
  await expectAccessible(page, "explanation", "[role=dialog]");
  await page.keyboard.press("Escape");
  await expect(help).toBeHidden();

  await page
    .getByRole("button", { name: "Cómo funciona la sincronización, su seguridad y su privacidad" })
    .click();
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: "Privacidad y uso de tus datos" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

/**
 * A browser whose camera films `text` as a QR code (black on white, like
 * the app draws it): a one-frame Y4M video handed to Chromium as its
 * camera, which plays it in a loop.
 */
async function browserFilming(text: string, testInfo: TestInfo, name: string) {
  const side = 480;
  const y = new Uint8Array(side * side).fill(235);
  if (text) {
    const modules = encode(text, { ecc: "M", border: 2 }).data;
    const scale = Math.floor((side * 0.8) / modules.length);
    const offset = Math.floor((side - modules.length * scale) / 2);
    modules.forEach((row, my) =>
      row.forEach((dark, mx) => {
        if (!dark) return;
        for (let py = 0; py < scale; py++) {
          y.fill(
            16,
            (offset + my * scale + py) * side + offset + mx * scale,
            (offset + my * scale + py) * side + offset + (mx + 1) * scale,
          );
        }
      }),
    );
  }
  const chroma = new Uint8Array((side / 2) * (side / 2) * 2).fill(128);
  const file = testInfo.outputPath(`${name}.y4m`);
  writeFileSync(
    file,
    Buffer.concat([
      Buffer.from(`YUV4MPEG2 W${side} H${side} F10:1 Ip A1:1 C420jpeg\nFRAME\n`),
      Buffer.from(y),
      Buffer.from(chroma),
    ]),
  );
  const browser = await chromium.launch({
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      `--use-file-for-fake-video-capture=${file}`,
    ],
  });
  const context = await browser.newContext({
    ...testInfo.project.use,
    locale: "es-ES",
    permissions: ["camera"],
    reducedMotion: "reduce",
  });
  return { browser, context };
}

test("the other device links by scanning the QR code with its camera", async ({
  page,
}, testInfo) => {
  const relay = fakeRelay();
  await relay.attach(page.context());
  const errors = watchErrors(page);
  // A device that lists its media and has no camera (a microphone only): the card doesn't offer scanning.
  await page.addInitScript(
    `navigator.mediaDevices.enumerateDevices = async () => [{ kind: "audioinput", deviceId: "", groupId: "", label: "" }];`,
  );
  let card = await openSettings(page);
  await expect(card.getByRole("button", { name: "Activar en este dispositivo" })).toBeVisible();
  await expect(card.getByRole("button", { name: "Escanear el QR" })).toHaveCount(0);
  // One that lists nothing before the camera is allowed (Safari): it may well have one, so it's offered.
  const safariLike = await page
    .context()
    .browser()!
    .newContext({ ...testInfo.project.use, locale: "es-ES" });
  await safariLike.addInitScript(`navigator.mediaDevices.enumerateDevices = async () => [];`);
  const safariPage = await safariLike.newPage();
  await expect(
    (await openSettings(safariPage)).getByRole("button", { name: "Escanear el QR" }),
  ).toBeVisible();
  await safariLike.close();
  await card.getByRole("button", { name: "Activar en este dispositivo" }).click();
  const code = (await card.locator(".font-mono").first().textContent())!.trim();
  await card.getByRole("button", { name: "Hecho, ya lo he guardado" }).click();
  await expect(card.getByText(/^Sincronizado/)).toBeVisible();

  // A camera filming some other QR code: it says so, and keeps looking.
  const wrong = await browserFilming("https://example.com/", testInfo, "other-qr");
  let other = await wrong.context.newPage();
  let otherErrors = watchErrors(other);
  card = await openSettings(other);
  await card.getByRole("button", { name: "Escanear el QR" }).click();
  const scanner = other.getByRole("dialog", { name: "Escanea el QR de tu otro dispositivo" });
  await expect(scanner.getByText(/Ese QR no es un código de sincronización/)).toBeVisible({
    timeout: 15_000,
  });
  await expectAccessible(other, "scanning", "[role=dialog]");
  await scanner.getByRole("button", { name: "Cancelar" }).click();
  await expect(scanner).toBeHidden();
  expect(otherErrors).toEqual([]);
  await wrong.browser.close();

  // Filming this device's QR code (its link, as the card draws it): asked, then linked.
  const link = `${new URL(page.url()).origin}/solo-compass/#/?vincular=${code.replace(/-/g, "")}`;
  const right = await browserFilming(link, testInfo, "sync-qr");
  await relay.attach(right.context);
  other = await right.context.newPage();
  otherErrors = watchErrors(other);
  card = await openSettings(other);
  await card.getByRole("button", { name: "Escanear el QR" }).click();
  await expect(card.getByText(/Has escaneado un código de sincronización/)).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    other.getByRole("dialog", { name: "Escanea el QR de tu otro dispositivo" }),
  ).toHaveCount(0);
  await card.getByRole("button", { name: "Vincular" }).click();
  await expect(card.getByText(/^Sincronizado/)).toBeVisible();
  await card.getByRole("button", { name: "Ver el código" }).click();
  await expect(card.locator(".font-mono").first()).toHaveText(code);
  expect(otherErrors).toEqual([]);
  await right.browser.close();
  expect(errors).toEqual([]);
});

test("two hours of play cost a handful of requests", async ({ page }) => {
  test.setTimeout(240_000);
  test.skip(LIVE_RELAY, "Counts the fake relay's requests.");
  const relay = fakeRelay();
  await relay.attach(page.context());
  // The page's clock runs only when told: two hours in a few seconds.
  await page.clock.install();
  const errors = watchErrors(page);
  await newAdventure(page, "El largo viaje");
  const card = await openSettings(page);
  await card.getByRole("button", { name: "Activar en este dispositivo" }).click();
  await card.getByRole("button", { name: "Hecho, ya lo he guardado" }).click();
  await expect(card.getByText(/^Sincronizado/)).toBeVisible();
  await closeSettings(page);
  await openAdventure(page, "El largo viaje");

  // An entry every two minutes for two hours.
  const before = relay.requests();
  const composer = page.locator("[data-composer] textarea");
  for (let i = 0; i < 60; i++) {
    await composer.fill(`Paso ${i + 1} del viaje.`);
    await page.getByRole("button", { name: "Añadir al diario" }).click();
    await expect(page.locator("[id^=entry-]").getByText(`Paso ${i + 1} del viaje.`)).toBeVisible();
    await page.clock.runFor(2 * 60_000);
  }
  await page.clock.runFor(5 * 60_000);
  await expect.poll(() => relay.requests() - before).toBeGreaterThanOrEqual(4);
  // A send every half hour at most while writing on (leaving sends at once): never one per entry.
  console.log(
    `Two hours of play, 60 entries: ${relay.requests() - before} requests, ${relay.rowsWritten()} rows written in all`,
  );
  expect(relay.requests() - before).toBeLessThanOrEqual(6);
  // And on the relay, one row per change sent.
  expect(relay.rowsWritten()).toBeLessThanOrEqual(relay.requests() + 2);

  // Leaving the app with something just written: sent at once.
  await composer.fill("Me voy al otro dispositivo.");
  await page.getByRole("button", { name: "Añadir al diario" }).click();
  await expect(page.locator("[id^=entry-]").getByText("Me voy al otro dispositivo.")).toBeVisible();
  const leaving = relay.requests();
  await page.evaluate(`{
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  }`);
  await expect.poll(() => relay.requests()).toBe(leaving + 1);
  // Back after a few seconds (a glance at another app): nothing asked.
  await page.clock.runFor(10_000);
  await setVisible(page, true);
  await page.clock.runFor(5_000);
  expect(relay.requests()).toBe(leaving + 1);
  // Used alone (nothing has come from another device): a minute and a half away isn't worth a look…
  await setVisible(page, false);
  await page.clock.runFor(90_000);
  await setVisible(page, true);
  await page.clock.runFor(5_000);
  expect(relay.requests()).toBe(leaving + 1);
  // …ten minutes away is: another device may have been taken up meanwhile.
  await setVisible(page, false);
  await page.clock.runFor(11 * 60_000);
  await setVisible(page, true);
  await expect.poll(() => relay.requests()).toBe(leaving + 2);
  expect(errors).toEqual([]);
});

test("opening the app, or coming back to it, brings what another device wrote", async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(120_000);
  const relay = fakeRelay();
  await relay.attach(page.context());
  const errors = watchErrors(page);
  await newAdventure(page, "El paso");
  await write(page, "Primera huella.");
  let card = await openSettings(page);
  await card.getByRole("button", { name: "Activar en este dispositivo" }).click();
  const code = (await card.locator(".font-mono").first().textContent())!.trim();
  await card.getByRole("button", { name: "Hecho, ya lo he guardado" }).click();
  await expect(card.getByText(/^Sincronizado/)).toBeVisible();
  await closeSettings(page);

  // The computer, its clock in the test's hands, linked.
  const computer = await browser.newContext({ ...testInfo.project.use, locale: "es-ES" });
  await relay.attach(computer);
  const other = await computer.newPage();
  const otherErrors = watchErrors(other);
  await other.clock.install();
  card = await openSettings(other);
  await card.getByRole("button", { name: "Ya tengo un código" }).click();
  await card.getByLabel("Código de sincronización").fill(code);
  await card.getByRole("button", { name: "Vincular" }).click();
  await expect(card.getByText(/^Sincronizado/)).toBeVisible();
  await closeSettings(other);
  await openAdventure(other, "El paso");
  await expect(other.locator("[id^=entry-]").getByText("Primera huella.")).toBeVisible();

  // The phone writes on.
  await openAdventure(page, "El paso");
  await write(page, "Segunda huella.");
  await syncNow(page);
  await openAdventure(page, "El paso");

  // The computer's app opened again half a minute later: it looks by itself.
  await other.clock.runFor(30_000);
  await other.reload();
  await other.clock.runFor(5_000);
  await expect(other.locator("[id^=entry-]").getByText("Segunda huella.")).toBeVisible();

  // Away a while (another app), and the phone writes meanwhile: coming back, it looks by itself.
  await setVisible(other, false);
  await write(page, "Tercera huella.");
  await syncNow(page);
  await other.clock.runFor(45_000);
  await setVisible(other, true);
  await expect(other.locator("[id^=entry-]").getByText("Tercera huella.")).toBeVisible();

  await computer.close();
  expect(errors).toEqual([]);
  expect(otherErrors).toEqual([]);
});

test("leaving the app sends what was just written at once, even if it closes right then", async ({
  page,
}) => {
  test.skip(LIVE_RELAY, "Counts the fake relay's requests.");
  const relay = fakeRelay();
  await relay.attach(page.context());
  const errors = watchErrors(page);
  await newAdventure(page, "La salida");
  const card = await openSettings(page);
  await card.getByRole("button", { name: "Activar en este dispositivo" }).click();
  await card.getByRole("button", { name: "Hecho, ya lo he guardado" }).click();
  await expect(card.getByText(/^Sincronizado/)).toBeVisible();
  await closeSettings(page);
  await openAdventure(page, "La salida");
  await write(page, "Escrito justo antes de irme.");
  // A change is prepared and sealed a moment (1.5 s) after it's made.
  await page.waitForTimeout(3000);
  const before = relay.requests();
  // The request has to leave within the event itself: a closed tab doesn't wait for anything after it.
  const sentWithinTheEvent = await page.evaluate(`(() => {
    let sent = false;
    const original = window.fetch;
    window.fetch = (...args) => {
      sent = true;
      return original(...args);
    };
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
    window.fetch = original;
    return sent;
  })()`);
  expect(sentWithinTheEvent).toBe(true);
  await expect.poll(() => relay.requests()).toBe(before + 1);
  // Its answer is taken in: nothing is left waiting, and nothing more goes.
  await setVisible(page, true);
  await expect(page.getByRole("button", { name: /^Cambios por enviar/ })).toHaveCount(0);
  expect(relay.requests()).toBe(before + 1);
  expect(errors).toEqual([]);
});
