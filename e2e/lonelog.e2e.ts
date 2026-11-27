import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

/**
 * Lonelog 1.7 from the outside: a log of it imported, its elements in
 * the notebook and changed from there, what the tools write, and the
 * .md it comes out as. Fails on any console error.
 */

const LOG = `# La cripta

## Sesión 1

[PC:Mara|PV 8] [PC:Kael] [Wealth:Mara|Plata 9] [Inv:Antorcha|×3] [Deck:Principal|×52]
[R:3|estado:activa|cripta|salidas:N R2]
[Thread:El robo|Abierto] [E:Cae el puente]

S1 @Me cuelo d:4<5 ->F => hago ruido ?¿Me oyen? ->Nb (3) => dudan

tbl: Clima (d4) [Sol, Niebla, Lluvia, Nieve]

T2-S1 *La ciudad* @(Kael)
@ Busco planos
PC (Kael): "Aquí está"
d: Daño 1d8+2[5]=7
[R:3|estado:+saqueada]
! Algo de otra notación
`;

test("imports, shows, changes and writes Lonelog 1.7", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  await page.goto("./#/diario");
  await page
    .locator('input[type=file][accept*=".md"]')
    .setInputFiles({ name: "log.md", mimeType: "text/markdown", buffer: Buffer.from(LOG) });
  await expect(page.getByRole("heading", { level: 1, name: "La cripta" })).toBeVisible();
  const entries = page.locator("[id^=entry-]");
  // The compact line, an entry per element; the answer's code written out.
  await expect(entries.getByText("Me cuelo")).toBeVisible();
  await expect(entries.getByText("No, pero. (3)")).toBeVisible();
  // The storyline's point of view, which PC speaks and the dice of a roll.
  await expect(
    entries.filter({ hasText: "La ciudad" }).getByText("Kael", { exact: true }),
  ).toBeVisible();
  await expect(
    entries.filter({ hasText: "Aquí está" }).getByText("Kael", { exact: true }),
  ).toBeVisible();
  await expect(entries.filter({ hasText: "Daño" }).getByText("5 + 2")).toBeVisible();

  await expect(
    entries.filter({ hasText: "Busco planos" }).getByText("Kael", { exact: true }),
  ).toBeVisible();
  // A table written out, to the player's own.
  await page.getByRole("button", { name: "Guardar en mis tablas" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Guardar tabla" }).click();
  await expect(page.getByText("«Clima» está en tus tablas")).toBeVisible();

  // Edited as Lonelog writes it; a verdict can be added.
  const damage = entries.filter({ hasText: "Daño" });
  await damage.click();
  await damage.getByRole("button", { name: "Editar" }).click();
  const editor = page.locator("textarea").filter({ hasText: "Daño" });
  await expect(editor).toHaveValue("Daño 1d8+2[5]=7");
  await editor.fill("Daño 1d8+2[6]=8");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(entries.filter({ hasText: "Daño" }).getByText("6 + 2")).toBeVisible();

  const notebook = await openNotebook(page);
  await expect(notebook.getByText("activa, saqueada · cripta · salidas N R2")).toBeVisible();
  await expect(notebook.getByText("Sucesos")).toBeVisible();
  await expect(notebook.getByRole("button", { name: /Principal/ }).first()).toContainText("52");
  await notebook.getByRole("button", { name: "Gastar una unidad de Antorcha" }).click();
  await notebook.getByRole("button", { name: /^El robo/ }).click();
  await notebook.getByRole("button", { name: "Cerrar", exact: true }).last().click();
  // Money of a new currency: it asks whose it is (two characters: nobody's by default).
  await notebook.getByRole("button", { name: "Añadir: Dinero" }).click();
  await notebook.getByLabel("Nombre", { exact: true }).fill("Oro");
  await expect(notebook.getByRole("button", { name: "Apuntar" })).toBeDisabled();
  await notebook.getByLabel("¿De quién es?").fill("Kael");
  await notebook.getByRole("button", { name: "Apuntar" }).click();
  if ((await notebook.getAttribute("role")) === "dialog") await page.keyboard.press("Escape");

  // Dice and a card in one tray: a verdict's line and a content's.
  const opener = page.getByRole("button", { name: "Tirar: oráculo, dados o tablas" });
  if (await opener.isVisible()) {
    await opener.click();
    await page.getByRole("tab", { name: "Dados" }).click();
  }
  const dice = page.locator('[data-hotkey="dice"]').filter({ visible: true });
  await dice.getByRole("button", { name: "d20", exact: true }).click();
  await dice.getByRole("button", { name: "Cartas" }).click();
  await dice.getByRole("button", { name: "Sacar carta" }).click();
  await dice.getByRole("button", { name: /^Apuntar/ }).click();

  await page.getByRole("button", { name: "Más opciones" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Exportar a Markdown" }).click();
  const md = readFileSync(await (await download).path(), "utf8");
  for (const line of [
    "[Inv:Antorcha|×-1]",
    "[Thread:El robo|Abierto>Cerrado]",
    "[Wealth:Kael|Oro 1]",
    "d: Daño 1d8+2[6]=8",
    "T2-S1 *La ciudad* @(Kael)",
    "! Algo de otra notación",
  ])
    expect(md).toContain(`\n${line}\n`);
  expect(md).toMatch(/\nd: d20=\d+\n/);
  expect(md).toMatch(/\ntbl: draw=\w+ -> /);
  expect(errors).toEqual([]);
});

test("the guide says what's used of Lonelog and what isn't", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.keyboard.press("?");
  const guide = page.getByRole("dialog");
  await expect(guide.getByRole("heading", { name: "Qué se usa de Lonelog" })).toBeVisible();
  for (const name of ["Partylog", "Lorelog", "Maplog", "Solo Wargaming"])
    await expect(guide.getByText(name, { exact: true })).toBeVisible();
});

/** A sheet on phones; on a wide desktop, the left column. */
async function openNotebook(page: Page) {
  const button = page.getByRole("button", { name: /^Cuaderno/ }).first();
  if (await button.isVisible()) {
    await button.click();
    return page.getByRole("dialog");
  }
  return page.locator("aside").first();
}
