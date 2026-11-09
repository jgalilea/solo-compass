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
  await page.getByText("La cripta", { exact: true }).first().click();
  const composer = page.locator("[data-composer] textarea");
  await composer.fill("Bajo las escaleras de la cripta.");
  await page.getByRole("button", { name: "Añadir al diario" }).click();
  await expect(page.locator("[id^=entry-]").getByText("Bajo las escaleras de la cripta.")).toBeVisible();
  // A scene, numbered on its own.
  await page.locator("[data-composer] button[aria-haspopup=menu]").click();
  await page.getByRole("menuitemradio", { name: /Nueva escena/ }).click();
  await composer.fill("La puerta de la cripta");
  await page.getByRole("button", { name: "Añadir al diario" }).click();
  await expect(page.locator("[id^=entry-]").getByText("S1")).toBeVisible();

  // A table roll.
  await page.getByRole("link", { name: "Tablas", exact: true }).click();
  await page.getByRole("button", { name: "Inspírame" }).click();
  await expect(page.getByText(/Acción d66=\d+, Tema d66=\d+/).filter({ visible: true }).first()).toBeVisible();

  // Everything is still there after reloading.
  await page.reload();
  await page.getByRole("link", { name: "Diario", exact: true }).click();
  await page.getByText("La cripta", { exact: true }).first().click();
  await expect(page.getByText("Bajo las escaleras de la cripta.")).toBeVisible();
  await expect(page.locator("[id^=entry-]").getByText("La puerta de la cripta")).toBeVisible();
  // Both rolls are in the history.
  await page.goto("./#/historial");
  await expect(page.getByText("¿Hay alguien en la posada?")).toBeVisible();
  await expect(page.getByText("Acción", { exact: true }).first()).toBeVisible();

  expect(errors).toEqual([]);
});

/**
 * Two tabs (an installed app and a browser tab, say) writing at once:
 * neither loses what the other saved, and each sees the other's.
 */
test("keeps what two open tabs write at the same time", async ({ page, context }) => {
  const other = await context.newPage();
  for (const p of [page, other]) await p.goto("./#/diario");

  async function create(p: typeof page, name: string) {
    await p.getByRole("button", { name: "Nueva aventura" }).click();
    await p.getByPlaceholder("Nombre de la aventura").fill(name);
    await p.getByRole("button", { name: "Crear" }).click();
    // Creating opens the adventure; back to the list.
    await p.getByRole("link", { name: "Volver al diario" }).click();
  }
  await create(page, "Desde la primera pestaña");
  await create(other, "Desde la segunda pestaña");

  // The first tab shows the second's without reloading…
  await expect(page.getByText("Desde la segunda pestaña").first()).toBeVisible();
  // …and both are saved.
  const fresh = await context.newPage();
  await fresh.goto("./#/diario");
  await expect(fresh.getByText("Desde la primera pestaña").first()).toBeVisible();
  await expect(fresh.getByText("Desde la segunda pestaña").first()).toBeVisible();
});
