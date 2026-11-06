import { describe, expect, it } from "vitest";
import { es } from "./i18n/locales/es";
import {
  exportAdventureToMarkdown,
  formatLine,
  parseMarkdownToEntries,
  parseNotesFromMarkdown,
  type JournalEntry,
  type JournalLineKind,
} from "./lonelog";

function entry(kind: JournalLineKind, text: string, i: number): JournalEntry {
  return { id: `e${i}`, adventureId: "a1", timestamp: 1000 + i, kind, text };
}

const SAMPLE: [JournalLineKind, string][] = [
  ["session", "Sesión 1: La posada"],
  ["note", "La lluvia no ha parado en tres días."],
  ["action", "Lydia salta la valla"],
  ["question", "¿La ven los guardias?"],
  ["roll", "Recluse — blanco 2 / negro 5 -> No, pero."],
  ["consequence", "No la ven, pero se le engancha la capa."],
  ["roll", "d20 -> 14"],
];

describe("formatLine", () => {
  it("prefixes each kind's Lonelog symbol", () => {
    expect(formatLine({ kind: "action", text: "Abro la puerta" })).toBe("@ Abro la puerta");
    expect(formatLine({ kind: "question", text: "¿Está cerrada?" })).toBe("? ¿Está cerrada?");
    expect(formatLine({ kind: "roll", text: "d6 -> 4" })).toBe("d: d6 -> 4");
    expect(formatLine({ kind: "consequence", text: "Cruje" })).toBe("=> Cruje");
    expect(formatLine({ kind: "session", text: "Sesión 2" })).toBe("=== Sesión 2 ===");
    expect(formatLine({ kind: "note", text: "Prosa libre" })).toBe("Prosa libre");
  });
});

describe("exportAdventureToMarkdown", () => {
  it("writes title, credit and one entry per paragraph, in chronological order", () => {
    const entries = [entry("action", "Segundo", 2), entry("note", "Primero", 1)];
    const md = exportAdventureToMarkdown(es, "La Cripta", entries);
    const blocks = md.trimEnd().split("\n\n");
    expect(blocks[0]).toBe("# La Cripta");
    expect(blocks[1]).toMatch(/^> .*Lonelog/);
    expect(blocks.slice(2)).toEqual(["Primero", "@ Segundo"]);
  });
});

describe("parseMarkdownToEntries", () => {
  it("export then import returns the same journal", () => {
    const original = SAMPLE.map(([kind, text], i) => entry(kind, text, i));
    const md = exportAdventureToMarkdown(es, "Aventura", original);
    const parsed = parseMarkdownToEntries(md, "a2", 5000);
    expect(parsed.map((e) => [e.kind, e.text])).toEqual(SAMPLE);
  });

  it("ignores the BOM, the H1 title, quotes and empty lines", () => {
    const parsed = parseMarkdownToEntries("﻿# Título\n\n> crédito\n\n@ Algo\n", "a", 0);
    expect(parsed.map((e) => [e.kind, e.text])).toEqual([["action", "Algo"]]);
  });

  it("recognises sessions in \"## Title\" as well as \"=== Title ===\"", () => {
    const parsed = parseMarkdownToEntries("## Capítulo 1\n=== Capítulo 2 ===", "a", 0);
    expect(parsed.map((e) => [e.kind, e.text])).toEqual([
      ["session", "Capítulo 1"],
      ["session", "Capítulo 2"],
    ]);
  });

  it("accepts symbols with no space after them", () => {
    const parsed = parseMarkdownToEntries("@Corro\n?¿Me siguen?\nd:2d6 -> 7\n=>Me alcanzan", "a", 0);
    expect(parsed.map((e) => e.kind)).toEqual(["action", "question", "roll", "consequence"]);
    expect(parsed.map((e) => e.text)).toEqual(["Corro", "¿Me siguen?", "2d6 -> 7", "Me alcanzan"]);
  });

  it("keeps what it doesn't understand as a note, without failing", () => {
    const parsed = parseMarkdownToEntries("[N:Garrick|posadero|nervioso]\nTexto suelto", "a", 0);
    expect(parsed.map((e) => [e.kind, e.text])).toEqual([
      ["note", "[N:Garrick|posadero|nervioso]"],
      ["note", "Texto suelto"],
    ]);
  });

  it("keeps multi-line entries, even if a line starts with a symbol", () => {
    const original: [JournalLineKind, string][] = [
      ["action", "Empujo la losa\ncon todas mis fuerzas"],
      ["note", "Primer párrafo.\n\nSegundo párrafo, tras una línea en blanco."],
      ["consequence", "La losa cede\n@ y algo respira al otro lado\n? quién anda ahí"],
      ["roll", "d20 -> 3\n(con desventaja)"],
    ];
    const md = exportAdventureToMarkdown(es, "Aventura", original.map(([k, t], i) => entry(k, t, i)));
    const parsed = parseMarkdownToEntries(md, "a", 0);
    expect(parsed.map((e) => [e.kind, e.text])).toEqual(original);
  });

  it("notes that start like a symbol or a Markdown heading survive the round trip", () => {
    const notes = ["#pista: la llave estaba en el pozo", "> Cita de un libro", "@ no es una acción", "? tampoco una pregunta", "d: ni una tirada", "=> ni una consecuencia", "=== ni una sesión ===", "## ni un encabezado", "\\barra inicial"];
    const original = notes.map((text, i) => entry("note", text, i));
    const md = exportAdventureToMarkdown(es, "Aventura", original);
    expect(parseMarkdownToEntries(md, "a", 0).map((e) => [e.kind, e.text])).toEqual(
      notes.map((text) => ["note", text]),
    );
  });

  it("in a foreign file, \"#\" and \">\" are only ignored in the header", () => {
    const parsed = parseMarkdownToEntries("# Mi aventura\n> intro\n\n@ Entro\n#etiqueta\n> una cita", "a", 0);
    expect(parsed.map((e) => [e.kind, e.text])).toEqual([
      ["action", "Entro"],
      ["note", "#etiqueta"],
      ["note", "> una cita"],
    ]);
  });

  it("an indented line that opens an entry is one, as in Lonelog's own examples", () => {
    const md = "```\n@ Search the archives\n    d: Investigation d6=5 vs TN 4 -> Success\n    => I find the manifests. [L:Archive|searched]\n    [N:Viktor|implicated]\n```\n";
    expect(parseMarkdownToEntries(md, "a", 0).map((e) => [e.kind, e.text])).toEqual([
      ["action", "Search the archives"],
      ["roll", "Investigation d6=5 vs TN 4 -> Success"],
      ["consequence", "I find the manifests. [L:Archive|searched]\n[N:Viktor|implicated]"],
    ]);
  });

  it("escapes a continuation line that starts with a symbol", () => {
    expect(formatLine({ kind: "consequence", text: "Cede\n@ algo respira\n\\barra" })).toBe(
      "=> Cede\n  \\@ algo respira\n  \\\\barra",
    );
  });

  it("in a foreign file, an indented line continues the previous entry", () => {
    const parsed = parseMarkdownToEntries("d: 2d6 -> 4\n    -> Fallo\nTexto suelto\n=== S1 ===\n  sangrado tras sesión", "a", 0);
    expect(parsed.map((e) => [e.kind, e.text])).toEqual([
      ["roll", "2d6 -> 4\n-> Fallo"],
      ["note", "Texto suelto"],
      ["session", "S1"],
      ["note", "sangrado tras sesión"],
    ]);
  });

  it("a session title with line breaks is exported on a single line", () => {
    expect(formatLine({ kind: "session", text: "Sesión 3:\nEl regreso" })).toBe("=== Sesión 3: El regreso ===");
  });

  it("assigns sequential timestamps and unique ids to keep the order", () => {
    const parsed = parseMarkdownToEntries("uno\ndos\ntres", "a", 100);
    expect(parsed.map((e) => e.timestamp)).toEqual([100, 101, 102]);
    expect(new Set(parsed.map((e) => e.id)).size).toBe(3);
    expect(parsed.every((e) => e.adventureId === "a")).toBe(true);
  });
});

describe("pinned notes (front matter)", () => {
  const notes = "Inventory:\n- [x] rope\n- [ ] lantern\n\n  indented line\nAsk Odile: \"why?\"";

  it("are exported as the front matter's notes field and read back as written", () => {
    const md = exportAdventureToMarkdown(es, "Mi aventura", [entry("note", "Hola", 1)], notes);
    expect(md.startsWith("---\nnotes: |\n  Inventory:\n  - [x] rope\n")).toBe(true);
    expect(parseNotesFromMarkdown(md)).toBe(notes);
    // The entries don't change because of it.
    expect(parseMarkdownToEntries(md, "a", 0).map((e) => e.text)).toEqual(["Hola"]);
  });

  it("without notes there's no front matter", () => {
    const md = exportAdventureToMarkdown(es, "Mi aventura", [], "  \n");
    expect(md.startsWith("# Mi aventura")).toBe(true);
    expect(parseNotesFromMarkdown(md)).toBe("");
  });

  it("reads other YAML styles and ignores the other fields", () => {
    const md = (front: string) => `---\ntitle: Clearview\n${front}\nruleset: Loner\n---\n\n# Clearview\n`;
    expect(parseNotesFromMarkdown(md("notes: Inspired by 80s shows"))).toBe("Inspired by 80s shows");
    expect(parseNotesFromMarkdown(md('notes: "Line \\"one\\""'))).toBe('Line "one"');
    expect(parseNotesFromMarkdown(md("notes: 'It''s here'"))).toBe("It's here");
    expect(parseNotesFromMarkdown(md("notes: >\n  folded\n  text\n\n  next"))).toBe("folded text\n\nnext");
    expect(parseNotesFromMarkdown(md(""))).toBe("");
  });

  it("a log that opens with a --- rule isn't taken for front matter", () => {
    const md = "---\n@ I open the door\n---\n=> It creaks\n";
    expect(parseNotesFromMarkdown(md)).toBe("");
    expect(parseMarkdownToEntries(md, "a", 0).map((e) => e.kind)).toEqual(["note", "action", "note", "consequence"]);
  });
});
