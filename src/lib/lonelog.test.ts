import { describe, expect, it } from "vitest";
import { es } from "./i18n/locales/es";
import {
  exportAdventureToMarkdown,
  formatLine,
  parseDescriptionsFromMarkdown,
  parseMarkdownToEntries,
  parseNotesFromMarkdown,
  parseTitleFromMarkdown,
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
    // The campaign header (§5.1) in the front matter, then the title.
    expect(blocks[0]).toBe('---\ntitle: "La Cripta"\n---');
    expect(blocks[1]).toBe("# La Cripta");
    expect(blocks[2]).toMatch(/^> .*Lonelog/);
    expect(blocks.slice(3)).toEqual(["Primero", "@ Segundo"]);
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
    // "->" is a symbol of its own (§3.2.2): indented, it's still a new line.
    const parsed = parseMarkdownToEntries("d: 2d6 -> 4\n    -> Fallo\nTexto suelto\n=== S1 ===\n  sangrado tras sesión", "a", 0);
    expect(parsed.map((e) => [e.kind, e.text])).toEqual([
      ["roll", "2d6 -> 4"],
      ["roll", "-> Fallo"],
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
    expect(md.startsWith('---\ntitle: "Mi aventura"\nnotes: |\n  Inventory:\n  - [x] rope\n')).toBe(true);
    expect(parseNotesFromMarkdown(md)).toBe(notes);
    // The entries don't change because of it.
    expect(parseMarkdownToEntries(md, "a", 0).map((e) => e.text)).toEqual(["Hola"]);
  });

  it("without notes the front matter only has the campaign header", () => {
    const md = exportAdventureToMarkdown(es, "Mi aventura", [], "  \n");
    expect(md.startsWith('---\ntitle: "Mi aventura"\n---\n\n# Mi aventura')).toBe(true);
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

describe("descriptions (front matter)", () => {
  const entries = [entry("note", "Llego a la [L:Posada del cruce]. [N:Bram|tuerto] me mira.", 1), entry("note", "[N:Odile] calla.", 2)];
  const descriptions = {
    "npc:bram": { text: "Posadero. Debe dinero al gremio.\nNo se fía de nadie.", updatedAt: 5 },
    "place:posada del cruce": { text: "Dos plantas, establo detrás.", updatedAt: 5 },
    "npc:odile": { text: "  ", updatedAt: 5 },
    "npc:gone": { text: "Not in the journal any more", updatedAt: 5 },
  };

  it("are a descriptions field after the notes, one tag per element, and read back by key", () => {
    const md = exportAdventureToMarkdown(es, "Aventura", entries, "Notas", descriptions);
    expect(md).toContain(
      "notes: |\n  Notas\ndescriptions: |\n  [L:Posada del cruce] Dos plantas, establo detrás.\n  [N:Bram] Posadero. Debe dinero al gremio.\n    No se fía de nadie.\n---",
    );
    expect(parseDescriptionsFromMarkdown(md, 9)).toEqual({
      "npc:bram": { text: "Posadero. Debe dinero al gremio.\nNo se fía de nadie.", updatedAt: 9 },
      "place:posada del cruce": { text: "Dos plantas, establo detrás.", updatedAt: 9 },
    });
    expect(parseNotesFromMarkdown(md)).toBe("Notas");
    expect(parseMarkdownToEntries(md, "a", 0)).toHaveLength(2);
  });

  it("work without notes, and a hand-written tag with details is read too", () => {
    const md = exportAdventureToMarkdown(es, "Aventura", entries, "", descriptions);
    expect(md.startsWith('---\ntitle: "Aventura"\ndescriptions: |\n')).toBe(true);
    expect(parseNotesFromMarkdown(md)).toBe("");
    const handWritten = "---\ndescriptions: |\n  [N:Jonah|friendly] Old sailor\n---\n\n# X\n";
    expect(parseDescriptionsFromMarkdown(handWritten, 1)).toEqual({ "npc:jonah": { text: "Old sailor", updatedAt: 1 } });
  });
});

describe("Lonelog 1.6 core", () => {
  const kinds = (md: string) => parseMarkdownToEntries(md, "a", 0).map((e) => [e.kind, e.text]);

  it("reads scenes in every form, Markdown heading included", () => {
    expect(
      kinds("S1 *School library*\n### S2 *Hall*\nS5a *Flashback*\nS7.1 *Day 1*\nT2-S1 *Meanwhile*\nS3\nS1 is not a scene marker"),
    ).toEqual([
      ["scene", "S1 *School library*"],
      ["scene", "S2 *Hall*"],
      ["scene", "S5a *Flashback*"],
      ["scene", "S7.1 *Day 1*"],
      ["scene", "T2-S1 *Meanwhile*"],
      ["scene", "S3"],
      ["note", "S1 is not a scene marker"],
    ]);
    expect(formatLine({ kind: "scene", text: "S4 *Tavern*" })).toBe("S4 *Tavern*");
  });

  it("keeps tbl:, gen: and bare -> lines as rolls, written back as they were", () => {
    const md = "? What's in the chest?\ntbl: d100=42 -> \"A broken sword\"\ngen: NPC\n  Role: d6=3 -> Merchant\n  Trait: d6=5 -> Secretive\n? Anyone home?\n-> Yes, but... (d6=4)";
    const parsed = parseMarkdownToEntries(md, "a", 0);
    expect(parsed.map((e) => [e.kind, e.text])).toEqual([
      ["question", "What's in the chest?"],
      ["roll", 'tbl: d100=42 -> "A broken sword"'],
      ["roll", "gen: NPC\nRole: d6=3 -> Merchant\nTrait: d6=5 -> Secretive"],
      ["question", "Anyone home?"],
      ["roll", "-> Yes, but... (d6=4)"],
    ]);
    const again = exportAdventureToMarkdown(es, "A", parsed);
    expect(again).toContain('\n\ntbl: d100=42 -> "A broken sword"\n');
    expect(again).toContain("\n\ngen: NPC\n  Role: d6=3 -> Merchant\n");
    expect(again).toContain("\n\n-> Yes, but... (d6=4)\n");
    expect(parseMarkdownToEntries(again, "a", 0).map((e) => [e.kind, e.text])).toEqual(parsed.map((e) => [e.kind, e.text]));
  });

  it("keeps a narrative block whole, blank lines and symbols inside included", () => {
    const md = 'Before\n\\---\nThe diary reads:\n\n@ not an action\n---\\\nAfter';
    const parsed = parseMarkdownToEntries(md, "a", 0);
    expect(parsed.map((e) => [e.kind, e.text])).toEqual([
      ["note", "Before"],
      ["note", "\\---\nThe diary reads:\n\n@ not an action\n---\\"],
      ["note", "After"],
    ]);
    expect(formatLine(parsed[1])).toBe(parsed[1].text);
  });

  it("escapes a note that would read as a roll symbol", () => {
    const note = entry("note", "-> not a result", 1);
    expect(formatLine(note)).toBe("\\-> not a result");
    expect(parseMarkdownToEntries(formatLine(note), "a", 0).map((e) => [e.kind, e.text])).toEqual([["note", "-> not a result"]]);
  });

  it("writes and reads the campaign header", () => {
    const md = exportAdventureToMarkdown(es, 'La "Cripta"', [], "", {}, { createdAt: new Date(2025, 8, 3).getTime(), updatedAt: new Date(2025, 9, 28).getTime() });
    expect(md.startsWith('---\ntitle: "La \\"Cripta\\""\nstart_date: 2025-09-03\nlast_update: 2025-10-28\n---')).toBe(true);
    expect(parseTitleFromMarkdown(md)).toBe('La "Cripta"');
    expect(parseTitleFromMarkdown("# Clearview Mystery\n\n@ a")).toBe("Clearview Mystery");
    expect(parseTitleFromMarkdown("=== Campaign Log: Clearview Mystery ===\n[Ruleset] Loner")).toBe("Clearview Mystery");
    expect(parseTitleFromMarkdown("@ just play")).toBe("");
    // The analog header's first line isn't a session.
    expect(kinds("=== Campaign Log: Clearview ===\n=== Session 1 ===").map(([k]) => k)).toEqual(["session"]);
  });
});

describe("a full Lonelog 1.6 log with the add-ons", () => {
  const LOG = "---\ntitle: Clearview Mystery\nruleset: Loner + Mythic Oracle\n---\n\n# Clearview Mystery\n\n## Session 1\n\n### S1 *School library after hours*\n\n```\n@ Sneak inside to check the archives\nd: Stealth d6=5 vs TN 4 -> Success\n=> I slip inside unnoticed. [L:Library|dark|quiet]\n@(Jonah) Keeps watch at the door\n? Is anyone inside?\n-> Yes, but... (d6=4)\n=> Someone is here, but they're distracted. [N:Guard|watchful]\nN (Guard): \"Who's there?\"\nPC: \"Stay calm... just stay calm.\"\n(note: testing alternate stealth rule)\ntbl: Forest Encounter d6=5 -> Traveler on the road\ngen: NPC (custom)\n  Role: d6=3 -> Merchant\n  Trait: d6=5 -> Secretive\n```\n\n\\---\nThe diary reads:\n\"Day 47: The tides no longer obey the moon.\"\n---\\\n\nS2 [R:1|active|entry cave|exits N:R2, E:R3] *The crypt below*\n\n[DUNGEON STATUS]\n[R:2|unexplored]\n[R:3|locked|heavy door]\n[/DUNGEON STATUS]\n\nS3 *Dockside ambush* [COMBAT]\n[F:Pirate Captain|HP 10|Close] [F:Pirate×2|HP 4|Medium]\nRd1\n@ Slash Captain\nd: 1d8=6 damage\n=> [F:Pirate Captain|HP-6|staggered]\n@(Pirate Captain) Desperate swing\nRd2\n=> [F:Pirate Captain|fled] [F:Pirate×1|Close]\n[/COMBAT]\n\n[RESOURCES]\n[Inv:Torch|3] [Inv:Rope|1|50ft] [Wealth:Gold 45|Silver 12]\n[/RESOURCES]\n=> I light a torch. [Inv:Torch-1] [Wealth:Gold+15] [R:1|cleared, looted]\n[PC:Kael|Supply d8|HP 8]\n[PC:Kael|Supply d8→d6]\n";

  it("survives being imported, exported and imported again, entry for entry", () => {
    const first = parseMarkdownToEntries(LOG, "a", 0);
    const md = exportAdventureToMarkdown(es, parseTitleFromMarkdown(LOG), first);
    const second = parseMarkdownToEntries(md, "a", 0);
    expect(second.map((e) => [e.kind, e.text])).toEqual(first.map((e) => [e.kind, e.text]));
    expect(first.filter((e) => e.kind === "scene").map((e) => e.text)).toEqual([
      "S1 *School library after hours*",
      "S2 [R:1|active|entry cave|exits N:R2, E:R3] *The crypt below*",
      "S3 *Dockside ambush* [COMBAT]",
    ]);
    expect(parseTitleFromMarkdown(LOG)).toBe("Clearview Mystery");
  });
});
