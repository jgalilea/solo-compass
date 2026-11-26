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
      { ...entry("session", "Sesión 1", 1), date: "2025-09-03" },
      entry("question", "¿Hay alguien?", 2),
      entry("roll", "Recluse: blanco 5 / negro 2 -> Sí", 3),
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
    expect(html).toContain('<h2>Sesión 1 <time datetime="2025-09-03">3 de septiembre de 2025</time></h2>');
    expect(html).toContain("<b>Alerta</b> <span>1/4</span>");
  });

  it("draws the notes' Markdown and keeps what's in it escaped", () => {
    const page = exportAdventureToHtml({
      t: es,
      name: "Notas",
      notes: '## Pistas\nEl **ciervo** de [la casa](https://example.com/"x") <b>\n> «Oro»\n---\n1. Ir',
      theme,
      exportedAt: new Date(2026, 10, 6),
      entries: [entry("note", "Algo", 1)],
    });
    expect(page).toContain('<p class="h2">Pistas</p>');
    expect(page).toContain('<p>El <strong>ciervo</strong> de <a href="https://example.com/&quot;x&quot;" rel="noreferrer">la casa</a> &lt;b&gt;</p>');
    expect(page).toContain('<p class="quote">«Oro»</p><hr><p class="bullet">1. Ir</p>');
  });
});

describe("exportAdventureToHtml, only the story", () => {
  const html = exportAdventureToHtml({
    t: es,
    name: "La posada",
    notes: "Pagar a Odile",
    theme,
    story: true,
    entries: [
      entry("session", "Sesión 1", 1),
      entry("question", "¿Hay alguien?", 2),
      entry("roll", "Recluse: blanco 5 / negro 2 -> Sí", 3),
      entry("consequence", "La posadera, [N:Odile|desconfiada], seca jarras.", 4),
      entry("note", "[Clock:Alerta 1/4]", 5),
    ],
  });

  it("keeps what's told, without the question, the roll or the cards", () => {
    expect(html).toContain(es.journal.htmlStoryNote);
    expect(html).toContain("seca jarras.");
    expect(html).not.toContain("¿Hay alguien?");
    expect(html).not.toContain("Recluse");
    expect(html).not.toContain('class="card"');
  });

  it("keeps the pinned notes and who's in it, not the clocks", () => {
    expect(html).toContain("Pagar a Odile");
    expect(html).toContain(es.notebook.castTitle);
    expect(html).not.toContain(es.notebook.threadsTitle);
    expect(html).not.toContain("Alerta");
  });
});
