import { describe, expect, it } from "vitest";
import { DICTIONARIES } from "./i18n/allDictionaries";
import {
  buildEntries,
  createCustomTable,
  diceChoiceFor,
  entriesToText,
  exportTableToMarkdown,
  parseEntryLines,
  parseTablesFile,
  parseTheme,
  toMeaningTable,
} from "./customTables";

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
    expect(numbered.ok && numbered.entries.map((e) => e.range)).toEqual([[1, 1], [2, 2], [3, 3]]);
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
    const parsed = parseEntryLines("| d4 | Resultado |\n|---|---|\n| 1-2 | A \\| B |\n| 3 | C |\n| 4 | D |");
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
      source: { name: "Mi zine", author: "Alguien", license: "CC BY 4.0", url: "https://example.com" },
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
    const ranged = { tables: [{ name: "R", dice: "d6", entries: [{ range: [1, 4], text: "A" }, { range: [5, 6], text: "B" }] }] };
    expect(parseTablesFile(t, JSON.stringify(ranged), "x.json")[0].entries[1].range).toEqual([5, 6]);
    expect(parseTablesFile(t, "{ broken", "x.json")).toEqual([]);
  });

  it("the editor text and die choice come back from a saved table", () => {
    const plain = { dice: "d3" as const, entries: [{ range: [1, 1] as [number, number], text: "A" }, { range: [2, 2] as [number, number], text: "B" }, { range: [3, 3] as [number, number], text: "C" }] };
    expect(entriesToText(plain)).toBe("A\nB\nC");
    expect(diceChoiceFor(plain)).toBe("auto");
    const weighted = { dice: "d6" as const, entries: [{ range: [1, 4] as [number, number], text: "A" }, { range: [5, 6] as [number, number], text: "B" }] };
    expect(entriesToText(weighted)).toBe("1-4 A\n5-6 B");
    expect(diceChoiceFor(weighted)).toBe("d6");
  });
});
