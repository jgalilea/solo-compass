import { describe, expect, it } from "vitest";
import { es } from "./i18n/locales/es";
import { exportAdventureToHtml, EXPORT_COLOR_TOKENS } from "./htmlExport";
import type { JournalEntry, JournalLineKind } from "./lonelog";

function entry(kind: JournalLineKind, text: string, i: number): JournalEntry {
  return { id: `e${i}`, adventureId: "a1", timestamp: 1000 + i, kind, text };
}

const theme = {
  colors: Object.fromEntries(EXPORT_COLOR_TOKENS.map((token) => [token, "#123456"])),
  fontDisplay: '"Cinzel", serif',
  mode: "dark" as const,
};

describe("exportAdventureToHtml", () => {
  const html = exportAdventureToHtml({
    t: es,
    name: "La <posada>",
    notes: "- [x] Pagar\n- [ ] Abrir la caja",
    theme,
    exportedAt: new Date(2026, 10, 6),
    entries: [
      entry("session", "Sesión 1", 1),
      entry("question", "¿Hay alguien?", 2),
      entry("roll", "Recluse — blanco 5 / negro 2 -> Sí", 3),
      entry("consequence", "La posadera, [N:Odile|desconfiada], seca jarras. <script>", 4),
      entry("note", "[Clock:Alerta 1/4]", 5),
    ],
  });

  it("is a whole page with the theme as editable variables", () => {
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("--color-gold: #123456;");
    expect(html).toContain('--font-display: "Cinzel", serif;');
    expect(html).toContain("<title>La &lt;posada&gt;</title>");
  });

  it("escapes the text and draws tags, answers and notes", () => {
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain('<span class="tag"><b>Odile</b> <small>desconfiada</small></span>');
    expect(html).toContain('<span class="answer si">Sí</span>');
    expect(html).toContain('<p class="check done">☑ Pagar</p>');
    expect(html).toContain("<h2>Sesión 1</h2>");
    expect(html).toContain("<b>Alerta</b> <span>1/4</span>");
  });
});
