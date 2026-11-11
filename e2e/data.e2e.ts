import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

/**
 * What a player would lose the most if it broke: their journal leaving
 * the app and coming back (Lonelog and the full backup), their own
 * tables, and the language they picked. Fails on any console error.
 */

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
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

test("exports an adventure as Lonelog and imports it back", async ({ page }) => {
  const errors = watchErrors(page);
  await newAdventure(page, "El faro");
  await write(page, "[N:Odile|farera] vigila la costa.");
  // Typed in Lonelog: someone else's action.
  await write(page, "@(Odile) Sube la escalera");
  await expect(page.locator("[id^=entry-]").getByText("Sube la escalera")).toBeVisible();

  // Out as Lonelog, written as the spec does.
  await page.getByRole("button", { name: "Más opciones" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Exportar a Markdown" }).click();
  const file = await (await download).path();
  const markdown = readFileSync(file, "utf8");
  expect(markdown).toContain('title: "El faro"');
  expect(markdown).toContain("[N:Odile|farera] vigila la costa.");
  expect(markdown).toContain("@(Odile) Sube la escalera");

  // And back in, as a new adventure named after its front matter.
  await page.goto("./#/diario");
  await page.locator('input[type=file][accept*=".md"]').setInputFiles(file);
  await expect(page.getByRole("heading", { level: 1, name: "El faro" })).toBeVisible();
  await expect(page.locator("[id^=entry-]").getByText("vigila la costa.")).toBeVisible();
  // The actor's name still opens her in the notebook.
  await expect(page.getByRole("button", { name: "Odile", exact: true }).first()).toHaveAttribute(
    "title",
    "Odile: ver en el cuaderno",
  );

  expect(errors).toEqual([]);
});

test("restores the full backup on a device that has nothing", async ({ page, browser }, testInfo) => {
  const errors = watchErrors(page);
  await newAdventure(page, "La ciénaga");
  await write(page, "El barro me llega a las rodillas.");

  await page.getByRole("button", { name: /^Ajustes/ }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar todo" }).click();
  const backup = await (await download).path();
  expect(JSON.parse(readFileSync(backup, "utf8")).app).toBe("solo-compass");

  // Another device: a browser with no data at all.
  const fresh = await browser.newContext({ ...testInfo.project.use, locale: "es-ES" });
  const other = await fresh.newPage();
  const otherErrors = watchErrors(other);
  await other.goto("./#/diario");
  await expect(other.getByText("La ciénaga")).toHaveCount(0);
  await other.getByRole("button", { name: /^Ajustes/ }).click();
  await other.locator('input[type=file][accept*="json"]').setInputFiles(backup);
  await other.getByRole("button", { name: /Sustituir todo/ }).click();
  // It reloads with everything in place.
  await other.getByText("La ciénaga").first().click();
  await expect(other.locator("[id^=entry-]").getByText("El barro me llega a las rodillas.")).toBeVisible();
  await fresh.close();

  expect(errors).toEqual([]);
  expect(otherErrors).toEqual([]);
});

test("rolls a table of one's own and keeps the language picked", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("./#/tablas");
  // "Your tables" starts folded.
  await page.getByRole("button", { name: /Tus tablas/ }).click();
  await page.getByRole("button", { name: "Nueva tabla" }).click();
  const editor = page.getByRole("dialog");
  await editor.getByLabel("Nombre", { exact: true }).fill("Botín del faro");
  await editor.getByLabel("Resultados, uno por línea").fill("Una lente rota\nUn diario empapado\nAceite para la lámpara");
  await editor.getByRole("button", { name: "Guardar tabla" }).click();

  const results = ["Una lente rota", "Un diario empapado", "Aceite para la lámpara"];
  const row = page.getByRole("listitem").filter({ has: page.getByText("Botín del faro", { exact: true }) });
  await row.getByRole("button", { name: /^Tirar/ }).click();
  await expect(page.getByText(new RegExp(results.join("|"))).filter({ visible: true }).first()).toBeVisible();

  // English, and still English after reloading, with the table there.
  await page.getByRole("button", { name: /^Ajustes/ }).click();
  await page.getByRole("radio", { name: "English" }).click();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.getByRole("link", { name: "Oracle", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Botín del faro" })).toBeVisible();

  expect(errors).toEqual([]);
});
