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
  // Another, tested with the oracle (off until turned on).
  await page.locator("[data-composer] button[aria-haspopup=menu]").click();
  await page.getByRole("menuitemradio", { name: /Nueva escena/ }).click();
  const sceneCheck = page.getByRole("switch", { name: /Probar la escena/ });
  await expect(sceneCheck).toHaveAttribute("aria-checked", "false");
  await sceneCheck.click();
  await composer.fill("El osario");
  await page.getByRole("button", { name: "Añadir al diario" }).click();
  await expect(page.locator("[id^=entry-]").getByText("S2")).toBeVisible();
  await expect(page.locator("[id^=entry-]").getByText("¿La escena va como esperaba?")).toBeVisible();

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
  // Searched, and the free roll logged in the journal after all (and undone).
  await page.getByLabel("Buscar en el historial").fill("posada alguien");
  await expect(page.getByText("Acción", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Apuntar", exact: true }).click();
  await expect(page.getByText("Apuntado en «La cripta»")).toBeVisible();
  await expect(page.getByRole("link", { name: "La cripta" })).toBeVisible();
  await page.getByRole("button", { name: "Deshacer" }).click();
  await page.getByRole("button", { name: "Apuntar", exact: true }).click();
  await page.getByRole("link", { name: "La cripta" }).click();
  await expect(page.locator("[id^=entry-]").getByText("¿Hay alguien en la posada?")).toHaveCount(1);

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

/**
 * The play tools around the journal: a die of one's own made on the
 * Dice tab and rolled from an adventure's game table, a dialogue line
 * typed in Lonelog, a half-written entry that waits, and the history
 * saying which adventure each roll was for.
 */
test("rolls own dice in an adventure and keeps track of them", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("./#/dados");
  // A die of one's own, starred so it's on the game table.
  await page.getByRole("button", { name: "Nuevo dado" }).click();
  await page.getByLabel("Texto del dado (opcional)").fill("Ataque");
  await page.getByLabel("Fórmula de dados").last().fill("d20+5");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await page.getByRole("button", { name: "Marcar Ataque como favorito" }).click();

  // An adventure (made active) with a dialogue line typed in Lonelog.
  await page.getByRole("link", { name: "Diario", exact: true }).click();
  await page.getByRole("button", { name: "Nueva aventura" }).click();
  await page.getByPlaceholder("Nombre de la aventura").fill("La torre");
  await page.getByRole("button", { name: "Crear" }).click();
  const composer = page.locator("[data-composer] textarea");
  await composer.pressSequentially("N (Bram): ");
  await composer.fill("Bienvenida a la torre.");
  await page.getByRole("button", { name: "Añadir al diario" }).click();
  await expect(page.locator("[id^=entry-]").getByText("Bram:")).toBeVisible();

  // The die from the game table (a sheet on phones, a panel on desktop).
  const opener = page.getByRole("button", { name: "Tirar: oráculo, dados o tablas" });
  if (await opener.isVisible()) {
    await opener.click();
    await page.getByRole("tab", { name: "Dados" }).click();
  }
  const dice = page.locator('[data-hotkey="dice"]').filter({ visible: true });
  await dice.getByRole("button", { name: "Ataque", exact: true }).click();
  await dice.getByRole("button", { name: "Apuntar" }).click();
  // Its text, and what was rolled on the box of its result.
  const attack = page.locator("[id^=entry-]").filter({ hasText: "Ataque" });
  await expect(attack.getByText("d20+5", { exact: true })).toBeVisible();

  // A card from the deck, on the same tray.
  if (await opener.isVisible()) {
    await opener.click();
    await page.getByRole("tab", { name: "Dados" }).click();
  }
  await dice.getByRole("button", { name: "Cartas" }).click();
  await dice.getByRole("button", { name: "Sacar carta" }).click();
  await expect(dice.getByText("Quedan 51 de 52")).toBeVisible();
  // Taken off the tray unlogged, it goes back into the deck.
  await dice.getByRole("button", { name: "Vaciar" }).click();
  await expect(dice.getByText("Quedan 52 de 52")).toBeVisible();
  await dice.getByRole("button", { name: "Sacar carta" }).click();
  await dice.getByRole("button", { name: "Apuntar" }).click();
  await expect(page.locator("[id^=entry-]").getByText(/ de (picas|corazones|diamantes|tréboles)$/)).toBeVisible();

  // Half written, it waits for the way back.
  await composer.fill("A medio escribir");
  await page.getByRole("link", { name: "Tablas", exact: true }).click();
  await page.getByRole("link", { name: "Diario", exact: true }).click();
  await expect(composer).toHaveValue("A medio escribir");

  // The Dice tab's latest rolls, and the history filtered to them, with the adventure.
  await page.getByRole("link", { name: "Dados", exact: true }).click();
  await expect(page.getByText(/Ataque d20\+5/).first()).toBeVisible();
  // Rolled again from there, into the tray.
  await page.getByRole("button", { name: "Volver a tirar Ataque d20+5" }).click();
  await expect(page.getByRole("button", { name: /^Quitar.*Ataque d20\+5/ })).toBeVisible();
  await page.getByRole("link", { name: "Ver historial" }).click();
  await expect(page.getByRole("link", { name: "La torre" }).first()).toBeVisible();

  expect(errors).toEqual([]);
});

test("going back closes the open dialog, not the screen behind it", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("link", { name: "Tablas", exact: true }).click();
  await page.getByRole("link", { name: "Diario", exact: true }).click();
  await expect(page).toHaveURL(/#\/diario$/);

  await page.getByRole("button", { name: /^Ajustes/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page).toHaveURL(/#\/diario$/);

  // Closed any other way, it leaves nothing behind: back is the previous screen.
  await page.getByRole("button", { name: /^Ajustes/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  // Its entry goes a moment after closing (no finger is that quick).
  await page.waitForFunction("!history.state?.modalDepth");
  await page.goBack();
  await expect(page).toHaveURL(/#\/tablas$/);
});

test("going back closes an open menu, and an edit can be undone", async ({ page }) => {
  await page.goto("./#/diario");
  await page.getByRole("button", { name: "Nueva aventura" }).click();
  await page.getByPlaceholder("Nombre de la aventura").fill("El faro");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByText("El faro", { exact: true }).first().click();
  await expect(page).toHaveURL(/#\/diario\/.+/);
  const url = page.url();

  await page.getByRole("button", { name: "Más opciones" }).click();
  await expect(page.getByRole("menu")).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("menu")).toBeHidden();
  expect(page.url()).toBe(url);

  // Editing an entry: "Undo" brings back the text it had.
  const composer = page.locator("[data-composer] textarea");
  await composer.fill("La linterna está apagada.");
  await page.getByRole("button", { name: "Añadir al diario" }).click();
  const entry = page.locator("[id^=entry-]").filter({ hasText: "La linterna está apagada." });
  await entry.click();
  await entry.getByRole("button", { name: "Editar entrada" }).click();
  await page.locator("textarea:focus").fill("La linterna está encendida.");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.locator("[id^=entry-]").getByText("La linterna está encendida.")).toBeVisible();
  await page.getByRole("status").getByRole("button", { name: "Deshacer" }).click();
  await expect(page.locator("[id^=entry-]").getByText("La linterna está apagada.")).toBeVisible();
});

test("an address that isn't a screen leads back to the oracle", async ({ page }) => {
  await page.goto("./#/mapa-perdido");
  await expect(page.getByRole("heading", { name: "Te has salido del mapa" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Contarlo en el formulario" })).toHaveAttribute("href", /tally\.so.*version=/);
  await page.getByRole("link", { name: "Volver al oráculo" }).click();
  await expect(page.getByLabel("Pregunta para el oráculo")).toBeVisible();
});

/**
 * A long journal opens where the game was left (its last entry, right
 * above the composer), with its bar pinned, and each question stays
 * with its answer after reloading.
 */
test("opens an adventure at its end, each question before its answer", async ({ page }) => {
  await page.goto("./#/diario");
  await page.getByRole("button", { name: "Nueva aventura" }).click();
  await page.getByPlaceholder("Nombre de la aventura").fill("El paso");
  await page.getByRole("button", { name: "Crear" }).click();
  const composer = page.locator("[data-composer] textarea");
  for (let i = 1; i <= 12; i++) {
    await composer.fill(`Jornada ${i}.\nNieve.\nViento.\nMás nieve.`);
    await page.getByRole("button", { name: "Añadir al diario" }).click();
  }

  // Several questions: one of them alone could come out in order by chance.
  await page.getByRole("link", { name: "Oráculo", exact: true }).click();
  for (let i = 1; i <= 8; i++) {
    await page.getByLabel("Pregunta para el oráculo").fill(`¿Duda ${i}?`);
    await page.getByRole("button", { name: "Lanzar los dados" }).click();
  }
  await page.getByRole("link", { name: "Diario", exact: true }).click();
  const entries = page.locator("[id^=entry-]");
  await expect(entries.last()).toBeInViewport();

  await page.reload();
  await expect(entries.last()).toBeInViewport();
  await expect(page.getByRole("heading", { level: 1, name: "El paso" })).toBeInViewport();
  const lines = (await entries.allInnerTexts()).slice(-16);
  expect(lines.filter((_, i) => i % 2 === 0).map((line) => line.trim())).toEqual(
    Array.from({ length: 8 }, (_, i) => `¿Duda ${i + 1}?`),
  );
});

/** Picking a session goes to it and stays there (on a phone, from a menu that's a history entry). */
test("jumps to a session from the index", async ({ page }) => {
  await page.goto("./#/diario");
  await page.getByRole("button", { name: "Nueva aventura" }).click();
  await page.getByPlaceholder("Nombre de la aventura").fill("El río");
  await page.getByRole("button", { name: "Crear" }).click();
  const composer = page.locator("[data-composer] textarea");
  for (const session of ["La orilla", "La barca", "El delta"]) {
    await page.locator("[data-composer] button[aria-haspopup=menu]").click();
    await page.getByRole("menuitemradio", { name: /Nueva sesión/ }).click();
    await composer.fill(session);
    await page.getByRole("button", { name: "Añadir al diario" }).click();
    for (let i = 1; i <= 10; i++) {
      await composer.fill(`${session}, ${i}.\nAgua.\nJuncos.\nMás agua.`);
      await page.getByRole("button", { name: "Añadir al diario" }).click();
    }
  }
  const menu = page.getByRole("button", { name: "Sesiones", exact: true }).and(page.locator("[aria-haspopup]"));
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("navigation", { name: "Sesiones" }).getByRole("button", { name: /^La orilla/ }).filter({ visible: true }).click();
  // Once the menu's history entry is gone too.
  await page.waitForTimeout(500);
  await expect(page.locator("[id^=entry-]").getByText("La orilla, 1.")).toBeInViewport();
});

/** Each adventure is played with its own oracle: picked in it, it stays there and only there. */
test("each adventure keeps its own oracle", async ({ page }) => {
  const create = async (name: string) => {
    await page.goto("./#/diario");
    await page.getByRole("button", { name: "Nueva aventura" }).click();
    await page.getByPlaceholder("Nombre de la aventura").fill(name);
    await page.getByRole("button", { name: "Crear" }).click();
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  };
  // The game table's oracle: a sheet on phones, a panel on desktop.
  const switcher = async () => {
    const button = page.getByRole("button", { name: "Cambiar oráculo" }).filter({ visible: true }).first();
    const opener = page.getByRole("button", { name: "Tirar: oráculo, dados o tablas" });
    await expect(button.or(opener).first()).toBeVisible();
    if (!(await button.isVisible())) await opener.click();
    return button;
  };

  await create("La saga");
  await (await switcher()).click();
  const dialog = page.getByRole("dialog", { name: "Oráculo" });
  await expect(dialog.getByText("Lo eliges para «La saga»")).toBeVisible();
  await dialog.getByRole("button", { name: /^Ironsworn/ }).click();
  await page.keyboard.press("Escape");
  await expect(await switcher()).toContainText("Ironsworn");

  // Another adventure starts with the usual one.
  await create("La cripta");
  await expect(await switcher()).toContainText("Recluse");

  // Back in the first, and on the Oracle screen while it's the active one.
  await page.goto("./#/diario");
  await page.getByRole("link", { name: /La saga/ }).click();
  await expect(await switcher()).toContainText("Ironsworn");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Activar" }).click();
  await page.goto("./#/");
  await expect(page.getByRole("button", { name: "Cambiar oráculo" })).toContainText("Ironsworn");
});
