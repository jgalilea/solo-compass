import { describe, expect, it } from "vitest";
import { DICTIONARIES } from "./i18n/allDictionaries";
import {
  createCustomTable,
  isCustomTable,
  MAX_TABLE_SIDES,
  toMeaningTable,
  webAddress,
} from "./customTables";
import {
  buildEntries,
  definitionDraft,
  diceChoiceFor,
  entriesToText,
  exportTableToMarkdown,
  parseEntryLines,
  parseTablesFile,
  parseTheme,
} from "./customTableText";

const t = DICTIONARIES.es;

function build(text: string, choice: Parameters<typeof buildEntries>[2] = "auto") {
  return buildEntries(t, parseEntryLines(text), choice);
}

describe("custom tables: entry lines", () => {
  it("one result per line makes a die with that many faces", () => {
    const result = build("Rata\nLobo\n\nOso\n");
    expect(result).toEqual({
      ok: true,
      dice: "d3",
      entries: [
        { range: [1, 1], text: "Rata" },
        { range: [2, 2], text: "Lobo" },
        { range: [3, 3], text: "Oso" },
      ],
    });
  });

  it("strips list markers and reads numbered lists as ranges", () => {
    const result = build("- Rata\n* Lobo\n• Oso");
    expect(result.ok && result.entries.map((e) => e.text)).toEqual(["Rata", "Lobo", "Oso"]);
    const numbered = build("1. Rata\n2) Lobo\n3: Oso");
    expect(numbered.ok && numbered.entries.map((e) => e.range)).toEqual([
      [1, 1],
      [2, 2],
      [3, 3],
    ]);
  });

  it("weighted ranges pick the die from the highest value", () => {
    const result = build("1-3 Ratas\n4–5 Lobos\n6 Un oso");
    expect(result.ok && result.dice).toBe("d6");
    expect(result.ok && result.entries[0]).toEqual({ range: [1, 3], text: "Ratas" });
  });

  it("keeps a leading number as text when only a few lines have one", () => {
    const result = build("3 guardias dormidos\nUna puerta abierta\nUn perro\nNada");
    expect(result.ok && result.entries[0].text).toBe("3 guardias dormidos");
  });

  it("rejects most-but-not-all lines with ranges, gaps and overlaps", () => {
    expect(build("1-2 A\n3-4 B\nC").ok).toBe(false);
    expect(build("1-2 A\n4-6 B").ok).toBe(false);
    expect(build("1-3 A\n3-6 B").ok).toBe(false);
  });

  it("checks the line count against a fixed die", () => {
    expect(build("A\nB\nC", "d6")).toEqual({
      ok: false,
      error: "Un d6 necesita 6 resultados y hay 3.",
    });
    expect(build("A\nB\nC\nD\nE\nF", "d6").ok).toBe(true);
  });

  it("d66 maps lines to 11–16, 21–26…", () => {
    const lines = Array.from({ length: 36 }, (_, i) => `R${i}`).join("\n");
    const result = build(lines, "d66");
    expect(result.ok && result.entries[6].range).toEqual([21, 21]);
    expect(build(Array.from({ length: 66 }, (_, i) => `R${i}`).join("\n")).ok).toBe(false);
  });

  it("reads a Markdown table, die included in the header", () => {
    const parsed = parseEntryLines(
      "| d4 | Resultado |\n|---|---|\n| 1-2 | A \\| B |\n| 3 | C |\n| 4 | D |",
    );
    expect(parsed.dice).toBe("d4");
    expect(parsed.lines[0]).toEqual({ range: [1, 2], text: "A | B" });
  });
});

describe("custom tables: files", () => {
  it("export and import round-trip", () => {
    const built = build("1-3 Ratas\n4-5 Lobos | grises\n6 Un oso");
    if (!built.ok) throw new Error(built.error);
    const table = createCustomTable({
      name: "Bestias",
      description: "Lo que acecha en el bosque.",
      dice: built.dice,
      entries: built.entries,
      source: {
        name: "Mi zine",
        author: "Alguien",
        license: "CC BY 4.0",
        url: "https://example.com",
      },
    });
    const [back] = parseTablesFile(t, exportTableToMarkdown(t, table), "x.md");
    expect(back).toEqual({
      name: table.name,
      description: table.description,
      dice: table.dice,
      entries: table.entries,
      source: table.source,
    });
  });

  it("keeps the theme through export and import, in either language", () => {
    const built = build("Ratas\nLobos\nOso");
    if (!built.ok) throw new Error(built.error);
    const table = createCustomTable({
      name: "Bestias",
      description: "",
      dice: built.dice,
      entries: built.entries,
      theme: "creatures",
    });
    const md = exportTableToMarkdown(t, table);
    expect(md).toContain("Temática: Criaturas");
    expect(parseTablesFile(t, md, "x.md")[0].theme).toBe("creatures");
    expect(parseTablesFile(t, "# A\nTheme: Planets\nUno\nDos", "x.md")[0].theme).toBe("planets");
    const json = JSON.stringify({ name: "A", theme: "names", entries: ["x", "y"] });
    expect(parseTablesFile(t, json, "x.json")[0].theme).toBe("names");
    expect(toMeaningTable(table, t).theme).toBe("creatures");
  });

  it("reads a theme by id or by name, ignoring case and accents, and nothing else", () => {
    expect(parseTheme("inspiracion")).toBe("inspiration");
    expect(parseTheme(" Space and starships ")).toBe("space");
    expect(parseTheme("dungeons")).toBe("dungeons");
    expect(parseTheme("dragones")).toBeUndefined();
  });

  it("a file without headings is one table named after the file", () => {
    const [table] = parseTablesFile(t, "Rata\nLobo\nOso", "bichos.txt");
    expect(table.name).toBe("bichos");
    expect(table.dice).toBe("d3");
  });

  it("several headings make several tables and invalid ones are skipped", () => {
    const text = "# Uno\nA\nB\n\n# Vacía\n\n## Dos\nd4\nA\nB\nC\nD";
    expect(parseTablesFile(t, text, "x.md").map((x) => [x.name, x.dice])).toEqual([
      ["Uno", "d2"],
      ["Dos", "d4"],
    ]);
  });

  it("reads JSON: a table, a list or { tables }", () => {
    const one = { name: "Clima", entries: ["Sol", "Lluvia"] };
    expect(parseTablesFile(t, JSON.stringify(one), "x.json")).toHaveLength(1);
    expect(parseTablesFile(t, JSON.stringify([one, one]), "x.json")).toHaveLength(2);
    const ranged = {
      tables: [
        {
          name: "R",
          dice: "d6",
          entries: [
            { range: [1, 4], text: "A" },
            { range: [5, 6], text: "B" },
          ],
        },
      ],
    };
    expect(parseTablesFile(t, JSON.stringify(ranged), "x.json")[0].entries[1].range).toEqual([
      5, 6,
    ]);
    expect(parseTablesFile(t, "{ broken", "x.json")).toEqual([]);
  });

  it("the editor text and die choice come back from a saved table", () => {
    const plain = {
      dice: "d3" as const,
      entries: [
        { range: [1, 1] as [number, number], text: "A" },
        { range: [2, 2] as [number, number], text: "B" },
        { range: [3, 3] as [number, number], text: "C" },
      ],
    };
    expect(entriesToText(plain)).toBe("A\nB\nC");
    expect(diceChoiceFor(plain)).toBe("auto");
    const weighted = {
      dice: "d6" as const,
      entries: [
        { range: [1, 4] as [number, number], text: "A" },
        { range: [5, 6] as [number, number], text: "B" },
      ],
    };
    expect(entriesToText(weighted)).toBe("1-4 A\n5-6 B");
    expect(diceChoiceFor(weighted)).toBe("d6");
  });
});

describe("a table written out in a journal", () => {
  it("becomes one of the player's, on its die", () => {
    expect(definitionDraft(t, "tbl: Clima (d4) [Sol, 3 nubes, Lluvia, Nieve]")).toEqual({
      name: "Clima",
      description: "",
      dice: "d4",
      entries: ["Sol", "3 nubes", "Lluvia", "Nieve"].map((text, i) => ({
        range: [i + 1, i + 1],
        text,
      })),
    });
    expect(
      definitionDraft(
        t,
        "tbl: Bosque (d6)\n1-2: Nada\n3: Huellas\n4: Campamento\n5: Viajero\n6: Algo te sigue",
      ),
    ).toMatchObject({
      name: "Bosque",
      dice: "d6",
      entries: [{ range: [1, 2], text: "Nada" }, {}, {}, {}, { range: [6, 6] }],
    });
    // With no die, or one that doesn't fit, a face each.
    expect(definitionDraft(t, "tbl: Ánimo [Tenso, Sereno, Raro]").dice).toBe("d3");
    expect(definitionDraft(t, "tbl: Ánimo (d8) [Tenso, Sereno, Raro]").dice).toBe("d3");
    expect(definitionDraft(t, "tbl: Vacía [Uno]").entries).toHaveLength(1);
  });
});

describe("custom tables: what a file can't do", () => {
  it("refuses a die past the limit instead of listing every value of it", () => {
    const started = performance.now();
    const result = build("1-500000000 Todo\n500000001-999999999 Nada");
    expect(result).toEqual({ ok: false, error: t.tables.editor.errorTooBig });
    expect(performance.now() - started).toBeLessThan(500);
    expect(build("A\nB", "d999999" as Parameters<typeof buildEntries>[2])).toEqual({
      ok: false,
      error: t.tables.editor.errorTooBig,
    });
    // A file naming such a die in its header has no table to import.
    expect(
      parseTablesFile(
        t,
        "# Tabla\n| d999999 | Resultado |\n|---|---|\n| 1 | A |\n| 2 | B |",
        "t.md",
      ),
    ).toEqual([]);
  });

  it("still takes the biggest die allowed, quickly, with ranges", () => {
    const half = MAX_TABLE_SIDES / 2;
    const started = performance.now();
    const result = build(`1-${half} Arriba\n${half + 1}-${MAX_TABLE_SIDES} Abajo`);
    expect(result).toMatchObject({ ok: true, dice: `d${MAX_TABLE_SIDES}` });
    expect(performance.now() - started).toBeLessThan(500);
  });

  it("drops a stored or restored table with a die past the limit or ranges that aren't whole numbers", () => {
    const table = {
      id: "x",
      name: "X",
      description: "",
      dice: "d6",
      entries: [{ range: [1, 6], text: "a" }],
    };
    expect(isCustomTable(table)).toBe(true);
    expect(isCustomTable({ ...table, dice: "d1000000000" })).toBe(false);
    expect(isCustomTable({ ...table, dice: "d0" })).toBe(false);
    expect(isCustomTable({ ...table, entries: [{ range: [1, 6.5], text: "a" }] })).toBe(false);
    expect(isCustomTable({ ...table, entries: [{ range: ["1", "6"], text: "a" }] })).toBe(false);
  });

  it("keeps a table's link only if it's a web page", () => {
    expect(webAddress("https://example.com/tabla")).toBe("https://example.com/tabla");
    expect(webAddress("  http://example.com ")).toBe("http://example.com");
    expect(webAddress("example.com/tabla")).toBe("https://example.com/tabla");
    expect(webAddress("javascript:alert(1)")).toBeUndefined();
    expect(webAddress("JavaScript:alert(1)")).toBeUndefined();
    expect(webAddress("data:text/html,<script>alert(1)</script>")).toBeUndefined();
    expect(webAddress("")).toBeUndefined();
    const [draft] = parseTablesFile(t, "# Tabla\nEnlace: javascript:alert(1)\n\nA\nB", "t.md");
    expect(draft.source?.url).toBeUndefined();
    const saved = createCustomTable({ ...draft, source: { url: "javascript:alert(1)" } });
    expect(toMeaningTable(saved, t).game.url).toBeUndefined();
  });
});
