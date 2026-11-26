import { expect, test, type Page } from "@playwright/test";

/**
 * Files handed to the app other than with an import button: dropped on
 * the window, shared to the installed app (the manifest's share_target,
 * received by the service worker), or the wrong kind of file picked
 * with a button. Each one is looked at and explained before anything is
 * kept; what isn't the app's is refused. Fails on any console error.
 */

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

/**
 * What the code run in the page below uses of the browser: the e2e
 * project has no DOM types (as in startup.perf.ts). Only a type, so it
 * can be named inside page.evaluate (whose code runs in the page).
 */
interface InPage {
  DataTransfer: new () => { items: { add(file: object): void }; files: unknown };
  File: new (parts: unknown[], name: string, options: { type: string }) => object;
  document: {
    createElement(tag: string): Record<string, unknown> & { append(child: unknown): void; submit(): void };
    body: { append(child: unknown): void };
  };
  navigator: { serviceWorker: { ready: Promise<unknown> } };
}

const JOURNAL = `---
title: "El pozo"
---

=== Sesión 1 ===
@ Me asomo al pozo
=> Algo brilla en el fondo
`;

const TABLE = JSON.stringify({ name: "Tiempo en el pantano", dice: "d3", entries: ["Niebla", "Lluvia", "Bochorno"] });

/** Drops a file on the window, as a file dragged from the desktop. `content` as bytes for a binary file. */
async function dropFile(page: Page, name: string, content: string | number[], type: string) {
  const dataTransfer = await page.evaluateHandle(
    ({ name, content, type }) => {
      const page = globalThis as unknown as InPage;
      const transfer = new page.DataTransfer();
      const body = typeof content === "string" ? content : new Uint8Array(content);
      transfer.items.add(new page.File([body], name, { type }));
      return transfer;
    },
    { name, content, type },
  );
  await page.dispatchEvent("main", "dragenter", { dataTransfer });
  await page.dispatchEvent("main", "dragover", { dataTransfer });
  await expect(page.getByText("Suelta el archivo para abrirlo")).toBeVisible();
  await page.dispatchEvent("main", "drop", { dataTransfer });
  await expect(page.getByText("Suelta el archivo para abrirlo")).toBeHidden();
}

test("a journal dropped on the window is imported as a new adventure, once asked", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("./#/dados");
  await dropFile(page, "pozo.md", JOURNAL, "text/markdown");

  const dialog = page.getByRole("dialog", { name: "Abrir archivo" });
  await expect(dialog.getByText("Diario de Lonelog")).toBeVisible();
  await expect(dialog.getByText("El pozo")).toBeVisible();
  await dialog.getByRole("button", { name: "Importar como aventura nueva" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "El pozo" })).toBeVisible();
  await expect(page.locator("[id^=entry-]").getByText("Algo brilla en el fondo")).toBeVisible();
  expect(errors).toEqual([]);
});

test("a file that isn't the app's is refused, and nothing is kept", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("./#/diario");
  // A PNG renamed to .md: not text.
  await dropFile(page, "mapa.md", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13], "text/markdown");
  const dialog = page.getByRole("dialog", { name: "Abrir archivo" });
  await expect(dialog.getByText("No se puede abrir")).toBeVisible();
  await expect(dialog.getByText(/No es un archivo de texto/)).toBeVisible();
  await dialog.getByRole("button", { name: "Cerrar" }).click();

  // A backup from a newer version of the app.
  await dropFile(
    page,
    "copia.json",
    JSON.stringify({ app: "solo-compass", schemaVersion: 999, exportedAt: "", history: [], journal: { adventures: [], entries: [] } }),
    "application/json",
  );
  await expect(dialog.getByText(/versión de Solo Compass más nueva/)).toBeVisible();
  await expect(dialog.getByRole("button", { name: /Juntar|Sustituir/ })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Cerrar" }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Todavía no tienes ninguna aventura")).toBeVisible();
  expect(errors).toEqual([]);
});

test("tables picked with the journal's import button go to the tables", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("./#/diario");
  await page.locator('input[type=file][accept*=".md"]').setInputFiles({
    name: "pantano.json",
    mimeType: "application/json",
    buffer: Buffer.from(TABLE),
  });
  const dialog = page.getByRole("dialog", { name: "Abrir archivo" });
  await expect(dialog.getByText("Tablas propias")).toBeVisible();
  await dialog.getByRole("button", { name: "Revisarla e importarla" }).click();

  // One table opens in the editor, to look at before saving.
  await expect(page).toHaveURL(/#\/tablas/);
  const editor = page.getByRole("dialog");
  await expect(editor.getByRole("textbox", { name: /Nombre/ })).toHaveValue("Tiempo en el pantano");
  await editor.getByRole("button", { name: "Guardar tabla" }).click();
  // Saved among the player's own (a folded block).
  await expect(page.getByRole("button", { name: "Tus tablas 1 tabla" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("a file shared to the installed app opens in the same dialog", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("./");
  // The service worker receives what the system shares (public/share-target.js).
  await page.evaluate(() => (globalThis as unknown as InPage).navigator.serviceWorker.ready.then(() => undefined));

  // What Android's share sheet does: a form posted to the manifest's share_target.
  await page.evaluate((journal) => {
    const { document, DataTransfer, File } = globalThis as unknown as InPage;
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "share-target";
    form.enctype = "multipart/form-data";
    const input = document.createElement("input");
    input.type = "file";
    input.name = "file";
    const transfer = new DataTransfer();
    transfer.items.add(new File([journal], "pozo.md", { type: "text/markdown" }));
    input.files = transfer.files;
    form.append(input);
    document.body.append(form);
    form.submit();
  }, JOURNAL);

  const dialog = page.getByRole("dialog", { name: "Abrir archivo" });
  await expect(dialog.getByText("Diario de Lonelog")).toBeVisible();
  await expect(dialog.getByText("pozo.md")).toBeVisible();
  // Any web page can post to the share target: it says so.
  await expect(dialog.getByText(/Si no lo has compartido tú, ciérralo/)).toBeVisible();
  // The address it came back to is the app's own again.
  await expect(page).not.toHaveURL(/compartido/);
  await dialog.getByRole("button", { name: "Importar como aventura nueva" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "El pozo" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("replacing everything from a dropped backup asks again, and going back keeps all", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("./#/diario");
  await page.getByRole("button", { name: "Nueva aventura" }).click();
  await page.getByPlaceholder("Nombre de la aventura").fill("Lo mío");
  await page.getByRole("button", { name: "Crear" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Lo mío" })).toBeVisible();

  const backup = JSON.stringify({
    app: "solo-compass",
    schemaVersion: 6,
    exportedAt: "2026-11-20T18:30:00.000Z",
    history: [],
    journal: { adventures: [{ id: "x", name: "Lo de otro", createdAt: 1, updatedAt: 1 }], entries: [] },
    settings: {},
  });
  await dropFile(page, "copia.json", backup, "application/json");
  const dialog = page.getByRole("dialog", { name: "Abrir archivo" });
  // Dropped by the player: no "if you didn't share it" note.
  await expect(dialog.getByText(/Si no lo has compartido tú/)).toHaveCount(0);
  await dialog.getByRole("button", { name: /Sustituir todo/ }).click();
  await expect(dialog.getByText(/No se puede deshacer/)).toBeVisible();
  await dialog.getByRole("button", { name: "Mejor no" }).click();
  await expect(dialog.getByRole("button", { name: /Juntar/ })).toBeVisible();
  await dialog.getByRole("button", { name: "Cancelar" }).click();

  await page.goto("./#/diario");
  await expect(page.getByRole("link", { name: /^Lo mío/ })).toBeVisible();
  await expect(page.getByText("Lo de otro")).toHaveCount(0);
  expect(errors).toEqual([]);
});
