import { expect, test } from "@playwright/test";

/**
 * The main path through the app, as a player would take it: ask the
 * oracle, start an adventure, write in it, roll on a table and find it
 * all still there after reloading. Fails on any error in the console.
 */
test("ask, write, roll and keep it after reloading", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("./");

  // Oracle.
  await page.getByLabel("Pregunta para el oráculo").fill("¿Hay alguien en la posada?");
  await page.getByRole("button", { name: "Lanzar los dados" }).click();
  await expect(page.getByText("¿Hay alguien en la posada?").first()).toBeVisible();
  await expect(page.getByText(/^(Sí|No|Contradicción)/).first()).toBeVisible();

  // A new adventure, active, with an entry.
  await page.getByRole("link", { name: "Diario", exact: true }).click();
  await page.getByRole("button", { name: "Nueva aventura" }).click();
  await page.getByPlaceholder("Nombre de la aventura").fill("La cripta");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByText("La cripta").first().click();
  const composer = page.locator("[data-composer] textarea");
  await composer.fill("Bajo las escaleras de la cripta.");
  await page.getByRole("button", { name: "Añadir al diario" }).click();
  await expect(page.locator("[id^=entry-]").getByText("Bajo las escaleras de la cripta.")).toBeVisible();

  // A table roll.
  await page.getByRole("link", { name: "Tablas", exact: true }).click();
  await page.getByRole("button", { name: "Inspírame" }).click();
  await expect(page.getByText(/Acción \d\/\d, Tema \d\/\d/).filter({ visible: true }).first()).toBeVisible();

  // Everything is still there after reloading.
  await page.reload();
  await page.getByRole("link", { name: "Diario", exact: true }).click();
  await page.getByText("La cripta").first().click();
  await expect(page.getByText("Bajo las escaleras de la cripta.")).toBeVisible();
  // Both rolls are in the history.
  await page.goto("./#/historial");
  await expect(page.getByText("¿Hay alguien en la posada?")).toBeVisible();
  await expect(page.getByText("Acción", { exact: true }).first()).toBeVisible();

  expect(errors).toEqual([]);
});
