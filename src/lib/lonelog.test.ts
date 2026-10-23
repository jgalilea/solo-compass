import { describe, expect, it } from "vitest";
import { es } from "./i18n/locales/es";
import {
  exportAdventureToMarkdown,
  formatLine,
  parseMarkdownToEntries,
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
  it("antepone el símbolo Lonelog de cada tipo", () => {
    expect(formatLine({ kind: "action", text: "Abro la puerta" })).toBe("@ Abro la puerta");
    expect(formatLine({ kind: "question", text: "¿Está cerrada?" })).toBe("? ¿Está cerrada?");
    expect(formatLine({ kind: "roll", text: "d6 -> 4" })).toBe("d: d6 -> 4");
    expect(formatLine({ kind: "consequence", text: "Cruje" })).toBe("=> Cruje");
    expect(formatLine({ kind: "session", text: "Sesión 2" })).toBe("=== Sesión 2 ===");
    expect(formatLine({ kind: "note", text: "Prosa libre" })).toBe("Prosa libre");
  });
});

describe("exportAdventureToMarkdown", () => {
  it("escribe título, crédito y una entrada por párrafo, en orden cronológico", () => {
    const entries = [entry("action", "Segundo", 2), entry("note", "Primero", 1)];
    const md = exportAdventureToMarkdown(es, "La Cripta", entries);
    const blocks = md.trimEnd().split("\n\n");
    expect(blocks[0]).toBe("# La Cripta");
    expect(blocks[1]).toMatch(/^> .*Lonelog/);
    expect(blocks.slice(2)).toEqual(["Primero", "@ Segundo"]);
  });
});

describe("parseMarkdownToEntries", () => {
  it("exportar e importar devuelve el mismo diario", () => {
    const original = SAMPLE.map(([kind, text], i) => entry(kind, text, i));
    const md = exportAdventureToMarkdown(es, "Aventura", original);
    const parsed = parseMarkdownToEntries(md, "a2", 5000);
    expect(parsed.map((e) => [e.kind, e.text])).toEqual(SAMPLE);
  });

  it("ignora el BOM, el título H1, las citas y las líneas vacías", () => {
    const parsed = parseMarkdownToEntries("﻿# Título\n\n> crédito\n\n@ Algo\n", "a", 0);
    expect(parsed.map((e) => [e.kind, e.text])).toEqual([["action", "Algo"]]);
  });

  it("reconoce sesiones en «## Título» además de «=== Título ===»", () => {
    const parsed = parseMarkdownToEntries("## Capítulo 1\n=== Capítulo 2 ===", "a", 0);
    expect(parsed.map((e) => [e.kind, e.text])).toEqual([
      ["session", "Capítulo 1"],
      ["session", "Capítulo 2"],
    ]);
  });

  it("acepta los símbolos sin espacio detrás", () => {
    const parsed = parseMarkdownToEntries("@Corro\n?¿Me siguen?\nd:2d6 -> 7\n=>Me alcanzan", "a", 0);
    expect(parsed.map((e) => e.kind)).toEqual(["action", "question", "roll", "consequence"]);
    expect(parsed.map((e) => e.text)).toEqual(["Corro", "¿Me siguen?", "2d6 -> 7", "Me alcanzan"]);
  });

  it("guarda como nota lo que no entiende, sin fallar", () => {
    const parsed = parseMarkdownToEntries("[N:Garrick|posadero|nervioso]\nTexto suelto", "a", 0);
    expect(parsed.map((e) => [e.kind, e.text])).toEqual([
      ["note", "[N:Garrick|posadero|nervioso]"],
      ["note", "Texto suelto"],
    ]);
  });

  it("conserva las entradas de varias líneas, aunque una línea empiece por un símbolo", () => {
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

  it("las notas que empiezan como un símbolo o un título Markdown sobreviven al viaje", () => {
    const notes = ["#pista: la llave estaba en el pozo", "> Cita de un libro", "@ no es una acción", "? tampoco una pregunta", "d: ni una tirada", "=> ni una consecuencia", "=== ni una sesión ===", "## ni un encabezado", "\\barra inicial"];
    const original = notes.map((text, i) => entry("note", text, i));
    const md = exportAdventureToMarkdown(es, "Aventura", original);
    expect(parseMarkdownToEntries(md, "a", 0).map((e) => [e.kind, e.text])).toEqual(
      notes.map((text) => ["note", text]),
    );
  });

  it("en un archivo ajeno, «#» y «>» solo se ignoran en la cabecera", () => {
    const parsed = parseMarkdownToEntries("# Mi aventura\n> intro\n\n@ Entro\n#etiqueta\n> una cita", "a", 0);
    expect(parsed.map((e) => [e.kind, e.text])).toEqual([
      ["action", "Entro"],
      ["note", "#etiqueta"],
      ["note", "> una cita"],
    ]);
  });

  it("en un archivo ajeno, una línea sangrada continúa la entrada anterior", () => {
    const parsed = parseMarkdownToEntries("d: 2d6 -> 4\n    -> Fallo\nTexto suelto\n=== S1 ===\n  sangrado tras sesión", "a", 0);
    expect(parsed.map((e) => [e.kind, e.text])).toEqual([
      ["roll", "2d6 -> 4\n-> Fallo"],
      ["note", "Texto suelto"],
      ["session", "S1"],
      ["note", "sangrado tras sesión"],
    ]);
  });

  it("un título de sesión con saltos de línea se exporta en una sola línea", () => {
    expect(formatLine({ kind: "session", text: "Sesión 3:\nEl regreso" })).toBe("=== Sesión 3: El regreso ===");
  });

  it("asigna timestamps secuenciales e ids únicos para conservar el orden", () => {
    const parsed = parseMarkdownToEntries("uno\ndos\ntres", "a", 100);
    expect(parsed.map((e) => e.timestamp)).toEqual([100, 101, 102]);
    expect(new Set(parsed.map((e) => e.id)).size).toBe(3);
    expect(parsed.every((e) => e.adventureId === "a")).toBe(true);
  });
});
