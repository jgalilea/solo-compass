import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Accessibility, checked by axe (WCAG 2.1 A and AA) on the main screens
 * in every theme and mode: contrast was checked by hand once
 * (2026-11-11), and this keeps it so as themes and screens change.
 * Every theme on the desktop; the main one (OSR) on the phone too, with
 * its own layout (bottom bar, the adventure's own bar).
 */

const THEMES = ["osr", "fantasia", "pulp", "moderno", "scifi"] as const;
const MODES = ["dark", "light"] as const;

/**
 * Left out on purpose: pinch zoom is blocked for a native-app feel (see
 * CLAUDE.md, "Manifest"; text fields stay at 16px so iOS never zooms).
 */
const DISABLED_RULES = ["meta-viewport"];

async function expectNoViolations(page: Page, where: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .disableRules(DISABLED_RULES)
    .analyze();
  const found = results.violations.map(
    (v) => `${where}: ${v.id} (${v.impact}) ${v.help}\n${v.nodes.map((n) => `  ${n.target.join(" ")}: ${n.failureSummary?.split("\n").slice(1).join(" ")}`).join("\n")}`,
  );
  expect(found, found.join("\n\n")).toEqual([]);
}

async function useTheme(page: Page, theme: string, mode: string) {
  // Still: a colour checked halfway through a fade isn't the colour shown.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(
    ([theme, mode]) => {
      const storage = (globalThis as unknown as { localStorage: { setItem(k: string, v: string): void } }).localStorage;
      storage.setItem("solo-compass:theme", theme);
      storage.setItem("solo-compass:mode", mode);
    },
    [theme, mode],
  );
}

/** The sample adventure: every kind of entry, roll and notebook section. */
async function openSample(page: Page) {
  await page.goto("./#/diario");
  await expect(page.getByText("Todavía no tienes ninguna aventura")).toBeVisible();
  await expectNoViolations(page, "journal list");
  await page.getByRole("button", { name: "¿Primera vez? Echa un vistazo a una aventura de ejemplo" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Ejemplo: La posada del cruce" })).toBeVisible();
}

for (const theme of THEMES) {
  for (const mode of MODES) {
    test(`main screens pass axe in ${theme}, ${mode}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name === "phone" && theme !== "osr", "every theme on the desktop; OSR on the phone");
      await useTheme(page, theme, mode);

      await page.goto("./");
      await page.getByLabel("Pregunta para el oráculo").fill("¿Hay alguien en la posada?");
      await page.getByRole("button", { name: "Lanzar los dados" }).click();
      await expect(page.getByText(/^(Sí|No|Contradicción)/).first()).toBeVisible();
      await expectNoViolations(page, "oracle");

      await page.goto("./#/historial");
      await expect(page.getByText("¿Hay alguien en la posada?")).toBeVisible();
      await expectNoViolations(page, "history");

      await page.goto("./#/tablas");
      await page.getByRole("button", { name: "Inspírame" }).click();
      await expectNoViolations(page, "tables");

      await page.goto("./#/dados");
      await page.getByRole("button", { name: "d20", exact: true }).click();
      await expectNoViolations(page, "dice");

      await openSample(page);
      await expectNoViolations(page, "adventure");
    });
  }
}

test("dialogs pass axe", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openSample(page);
  // Settings, from the header or (phone) the adventure's menu.
  const settings = page.getByRole("button", { name: /^Ajustes/ });
  if (await settings.isVisible()) await settings.click();
  else {
    await page.getByRole("button", { name: "Más opciones" }).click();
    await page.getByRole("menuitem", { name: "Ajustes" }).click();
  }
  await expect(page.getByRole("dialog")).toBeVisible();
  await expectNoViolations(page, "settings");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Más opciones" }).click();
  await page.getByRole("menuitem", { name: "Estadísticas" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expectNoViolations(page, "stats");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Más opciones" }).click();
  await page.getByRole("menuitem", { name: "Modo zen" }).click();
  await expect(page.getByText(/^Modo zen: solo lo que se cuenta/)).toBeVisible();
  await expectNoViolations(page, "zen");

  await page.getByRole("button", { name: "Más opciones" }).click();
  await page.getByRole("menuitem", { name: "Continuar en una aventura nueva" }).click();
  await expect(page.getByRole("dialog", { name: "Continuar en una aventura nueva" })).toBeVisible();
  await expectNoViolations(page, "continue");
  await page.keyboard.press("Escape");

  // A backup dropped on the window, and "Replace everything" asking again.
  const transfer = await page.evaluateHandle((text) => {
    const page = globalThis as unknown as {
      DataTransfer: new () => { items: { add(file: object): void } };
      File: new (parts: unknown[], name: string, options: { type: string }) => object;
    };
    const t = new page.DataTransfer();
    t.items.add(new page.File([text], "copia.json", { type: "application/json" }));
    return t;
  }, JSON.stringify({ app: "solo-compass", schemaVersion: 6, exportedAt: "", history: [], journal: { adventures: [], entries: [] } }));
  await page.dispatchEvent("main", "drop", { dataTransfer: transfer });
  await page.getByRole("button", { name: /Sustituir todo/ }).click();
  await expect(page.getByText(/No se puede deshacer/)).toBeVisible();
  await expectNoViolations(page, "restore");
});

test("the header passes axe in English, with and without an active adventure", async ({ page }) => {
  await useTheme(page, "osr", "dark");
  await page.addInitScript(() => {
    (globalThis as unknown as { localStorage: { setItem(k: string, v: string): void } }).localStorage.setItem("solo-compass:locale", "en");
  });
  // No active adventure: the chip says so, and its name starts with what it shows.
  await page.goto("./");
  await expect(page.getByRole("link", { name: /^No adventure/ })).toBeVisible();
  await expectNoViolations(page, "header, no adventure (en)");
  // One active: the chip names it, first.
  await page.goto("./#/diario");
  await page.getByRole("button", { name: "New adventure" }).click();
  await page.getByPlaceholder("Adventure name").fill("The ford");
  await page.getByRole("button", { name: "Create" }).click();
  await page.goto("./");
  await expect(page.getByRole("link", { name: /^The ford: go to the active adventure/ })).toBeVisible();
  await expectNoViolations(page, "header, an adventure active (en)");
});
