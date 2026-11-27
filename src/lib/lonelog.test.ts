import { describe, expect, it } from "vitest";
import { rollFormula } from "./diceNotation";
import { buildCast, purseKey } from "./lonelogTags";
import { es } from "./i18n/locales/es";
import {
  exportAdventureToMarkdown,
  formatLine,
  parseDescriptionsFromMarkdown,
  parseMarkdownToEntries,
  parseNotesFromMarkdown,
  parseTitleFromMarkdown,
  sectionToLonelog,
  sessionDate,
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
  ["roll", "Recluse: blanco 2 / negro 5 -> No, pero."],
  ["consequence", "No la ven, pero se le engancha la capa."],
  ["roll", "d20 -> 14"],
];

describe("formatLine", () => {
  it("prefixes each kind's Lonelog symbol", () => {
    expect(formatLine({ kind: "action", text: "Abro la puerta" })).toBe("@ Abro la puerta");
    expect(formatLine({ kind: "question", text: "¿Está cerrada?" })).toBe("? ¿Está cerrada?");
    expect(formatLine({ kind: "roll", text: "d6 -> 4" })).toBe("d: d6=4");
    expect(formatLine({ kind: "consequence", text: "Cruje" })).toBe("=> Cruje");
    expect(formatLine({ kind: "session", text: "Sesión 2" })).toBe("=== Sesión 2 ===");
    expect(formatLine({ kind: "note", text: "Prosa libre" })).toBe("Prosa libre");
  });

  it("writes someone else's action with no space, as the spec does", () => {
    expect(formatLine({ kind: "action", text: "(Jonah) Keeps watch" })).toBe(
      "@(Jonah) Keeps watch",
    );
    expect(formatLine({ kind: "action", text: "(Elara > Jonah) Boosts the climb" })).toBe(
      "@(Elara > Jonah) Boosts the climb",
    );
  });

  it("reads it back as that character's action", () => {
    expect(
      parseMarkdownToEntries("@(Jonah) Keeps watch", "a", 0).map((e) => [e.kind, e.text]),
    ).toEqual([["action", "(Jonah) Keeps watch"]]);
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

  it('recognises sessions in "## Title" as well as "=== Title ==="', () => {
    const parsed = parseMarkdownToEntries("## Capítulo 1\n=== Capítulo 2 ===", "a", 0);
    expect(parsed.map((e) => [e.kind, e.text])).toEqual([
      ["session", "Capítulo 1"],
      ["session", "Capítulo 2"],
    ]);
  });

  it("accepts symbols with no space after them", () => {
    const parsed = parseMarkdownToEntries(
      "@Corro\n?¿Me siguen?\nd:2d6 -> 7\n=>Me alcanzan",
      "a",
      0,
    );
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
    const md = exportAdventureToMarkdown(
      es,
      "Aventura",
      original.map(([k, t], i) => entry(k, t, i)),
    );
    const parsed = parseMarkdownToEntries(md, "a", 0);
    expect(parsed.map((e) => [e.kind, e.text])).toEqual(original);
  });

  it("notes that start like a symbol or a Markdown heading survive the round trip", () => {
    const notes = [
      "#pista: la llave estaba en el pozo",
      "> Cita de un libro",
      "@ no es una acción",
      "? tampoco una pregunta",
      "d: ni una tirada",
      "=> ni una consecuencia",
      "=== ni una sesión ===",
      "## ni un encabezado",
      "\\barra inicial",
    ];
    const original = notes.map((text, i) => entry("note", text, i));
    const md = exportAdventureToMarkdown(es, "Aventura", original);
    expect(parseMarkdownToEntries(md, "a", 0).map((e) => [e.kind, e.text])).toEqual(
      notes.map((text) => ["note", text]),
    );
  });

  it('in a foreign file, "#" and ">" are only ignored in the header', () => {
    const parsed = parseMarkdownToEntries(
      "# Mi aventura\n> intro\n\n@ Entro\n#etiqueta\n> una cita",
      "a",
      0,
    );
    expect(parsed.map((e) => [e.kind, e.text])).toEqual([
      ["action", "Entro"],
      ["note", "#etiqueta"],
      ["note", "> una cita"],
    ]);
  });

  it("an indented line that opens an entry is one, as in Lonelog's own examples", () => {
    const md =
      "```\n@ Search the archives\n    d: Investigation d6=5 vs TN 4 -> Success\n    => I find the manifests. [L:Archive|searched]\n    [N:Viktor|implicated]\n```\n";
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
    const parsed = parseMarkdownToEntries(
      "d: 2d6 -> 4\n    -> Fallo\nTexto suelto\n=== S1 ===\n  sangrado tras sesión",
      "a",
      0,
    );
    expect(parsed.map((e) => [e.kind, e.text])).toEqual([
      ["roll", "2d6 -> 4"],
      ["roll", "-> Fallo"],
      ["note", "Texto suelto"],
      ["session", "S1"],
      ["note", "sangrado tras sesión"],
    ]);
  });

  it("a session title with line breaks is exported on a single line", () => {
    expect(formatLine({ kind: "session", text: "Sesión 3:\nEl regreso" })).toBe(
      "=== Sesión 3: El regreso ===",
    );
  });

  it("assigns sequential timestamps and unique ids to keep the order", () => {
    const parsed = parseMarkdownToEntries("uno\ndos\ntres", "a", 100);
    expect(parsed.map((e) => e.timestamp)).toEqual([100, 101, 102]);
    expect(new Set(parsed.map((e) => e.id)).size).toBe(3);
    expect(parsed.every((e) => e.adventureId === "a")).toBe(true);
  });
});

describe("session dates", () => {
  it("writes the date below the session and reads it back", () => {
    const session = { ...entry("session", "El molino", 0), date: "2025-09-10" };
    const md = exportAdventureToMarkdown(es, "Aventura", [session, entry("note", "Llueve.", 1)]);
    expect(md).toContain("=== El molino ===\n\n[Date] 2025-09-10\n\nLlueve.");
    const back = parseMarkdownToEntries(md, "a1", 0);
    expect(back.map((e) => [e.kind, e.text, e.date])).toEqual([
      ["session", "El molino", "2025-09-10"],
      ["note", "Llueve.", undefined],
    ]);
  });

  it("reads every form of Lonelog's date line, keeping the rest", () => {
    const parse = (md: string) =>
      parseMarkdownToEntries(md, "a1", 0).map((e) => [e.kind, e.text, e.date]);
    expect(parse("=== Session 1 ===\nDate: 2025-09-03 | Duration: 1h30")).toEqual([
      ["session", "Session 1", "2025-09-03"],
      ["note", "Duration: 1h30", undefined],
    ]);
    expect(parse("## Session 2\n*Date: 2025-09-10 | Duration: 2h*")[0]).toEqual([
      "session",
      "Session 2",
      "2025-09-10",
    ]);
    expect(parse("=== Session 3 ===\n[Date]        2025-09-17")).toEqual([
      ["session", "Session 3", "2025-09-17"],
    ]);
    // Only right below a session.
    expect(parse("=== S ===\nAlgo\n[Date] 2025-09-17").map((e) => e[0])).toEqual([
      "session",
      "note",
      "note",
    ]);
  });

  it("an imported session without a date has none, not the day of the import", () => {
    const [session] = parseMarkdownToEntries("=== Session 1 ===\n@ Go", "a1", Date.now());
    expect(sessionDate(session!)).toBeNull();
    expect(exportAdventureToMarkdown(es, "A", [session!])).not.toContain("[Date]");
  });

  it("a session from before dates were kept uses the day it was opened", () => {
    expect(sessionDate({ timestamp: new Date(2026, 10, 9, 20).getTime() })).toBe("2026-11-09");
  });
});

describe("pinned notes (front matter)", () => {
  const notes = 'Inventory:\n- [x] rope\n- [ ] lantern\n\n  indented line\nAsk Odile: "why?"';

  it("are exported as the front matter's notes field and read back as written", () => {
    const md = exportAdventureToMarkdown(es, "Mi aventura", [entry("note", "Hola", 1)], notes);
    expect(md.startsWith('---\ntitle: "Mi aventura"\nnotes: |\n  Inventory:\n  - [x] rope\n')).toBe(
      true,
    );
    expect(parseNotesFromMarkdown(md)).toBe(notes);
    // The entries don't change because of it.
    expect(parseMarkdownToEntries(md, "a", 0).map((e) => e.text)).toEqual(["Hola"]);
  });

  it("keep their Markdown as written, a divider line too (it doesn't end the front matter)", () => {
    const marked =
      "# Leads\n**Stag** seal, *house unknown*\n---\n> “Gold leaves no tracks.”\n1. Ask Odile";
    const md = exportAdventureToMarkdown(es, "Mi aventura", [entry("note", "Hola", 1)], marked);
    expect(parseNotesFromMarkdown(md)).toBe(marked);
    expect(parseMarkdownToEntries(md, "a", 0).map((e) => e.text)).toEqual(["Hola"]);
  });

  it("without notes the front matter only has the campaign header", () => {
    const md = exportAdventureToMarkdown(es, "Mi aventura", [], "  \n");
    expect(md.startsWith('---\ntitle: "Mi aventura"\n---\n\n# Mi aventura')).toBe(true);
    expect(parseNotesFromMarkdown(md)).toBe("");
  });

  it("reads other YAML styles and ignores the other fields", () => {
    const md = (front: string) =>
      `---\ntitle: Clearview\n${front}\nruleset: Loner\n---\n\n# Clearview\n`;
    expect(parseNotesFromMarkdown(md("notes: Inspired by 80s shows"))).toBe(
      "Inspired by 80s shows",
    );
    expect(parseNotesFromMarkdown(md('notes: "Line \\"one\\""'))).toBe('Line "one"');
    expect(parseNotesFromMarkdown(md("notes: 'It''s here'"))).toBe("It's here");
    expect(parseNotesFromMarkdown(md("notes: >\n  folded\n  text\n\n  next"))).toBe(
      "folded text\n\nnext",
    );
    expect(parseNotesFromMarkdown(md(""))).toBe("");
  });

  it("a log that opens with a --- rule isn't taken for front matter", () => {
    const md = "---\n@ I open the door\n---\n=> It creaks\n";
    expect(parseNotesFromMarkdown(md)).toBe("");
    expect(parseMarkdownToEntries(md, "a", 0).map((e) => e.kind)).toEqual([
      "note",
      "action",
      "note",
      "consequence",
    ]);
  });
});

describe("descriptions (front matter)", () => {
  const entries = [
    entry("note", "Llego a la [L:Posada del cruce]. [N:Bram|tuerto] me mira.", 1),
    entry("note", "[N:Odile] calla.", 2),
  ];
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
    expect(parseDescriptionsFromMarkdown(handWritten, 1)).toEqual({
      "npc:jonah": { text: "Old sailor", updatedAt: 1 },
    });
  });
});

describe("Lonelog 1.6 core", () => {
  const kinds = (md: string) => parseMarkdownToEntries(md, "a", 0).map((e) => [e.kind, e.text]);

  it("reads scenes in every form, Markdown heading included", () => {
    expect(
      kinds(
        "S1 *School library*\n### S2 *Hall*\nS5a *Flashback*\nS7.1 *Day 1*\nT2-S1 *Meanwhile*\nS3\nS1 is not a scene marker",
      ),
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
    const md =
      '? What\'s in the chest?\ntbl: d100=42 -> "A broken sword"\ngen: NPC\n  Role: d6=3 -> Merchant\n  Trait: d6=5 -> Secretive\n? Anyone home?\n-> Yes, but... (d6=4)';
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
    expect(parseMarkdownToEntries(again, "a", 0).map((e) => [e.kind, e.text])).toEqual(
      parsed.map((e) => [e.kind, e.text]),
    );
  });

  it("keeps a narrative block whole, blank lines and symbols inside included", () => {
    const md = "Before\n\\---\nThe diary reads:\n\n@ not an action\n---\\\nAfter";
    const parsed = parseMarkdownToEntries(md, "a", 0);
    expect(parsed.map((e) => [e.kind, e.text])).toEqual([
      ["note", "Before"],
      ["note", "\\---\nThe diary reads:\n\n@ not an action\n---\\"],
      ["note", "After"],
    ]);
    expect(formatLine(parsed[1]!)).toBe(parsed[1]!.text);
  });

  it("escapes a note that would read as a roll symbol", () => {
    const note = entry("note", "-> not a result", 1);
    expect(formatLine(note)).toBe("\\-> not a result");
    expect(parseMarkdownToEntries(formatLine(note), "a", 0).map((e) => [e.kind, e.text])).toEqual([
      ["note", "-> not a result"],
    ]);
  });

  it("writes and reads the campaign header", () => {
    const md = exportAdventureToMarkdown(
      es,
      'La "Cripta"',
      [],
      "",
      {},
      { createdAt: new Date(2025, 8, 3).getTime(), updatedAt: new Date(2025, 9, 28).getTime() },
    );
    expect(
      md.startsWith(
        '---\ntitle: "La \\"Cripta\\""\nstart_date: 2025-09-03\nlast_update: 2025-10-28\n---',
      ),
    ).toBe(true);
    expect(parseTitleFromMarkdown(md)).toBe('La "Cripta"');
    expect(parseTitleFromMarkdown("# Clearview Mystery\n\n@ a")).toBe("Clearview Mystery");
    expect(parseTitleFromMarkdown("=== Campaign Log: Clearview Mystery ===\n[Ruleset] Loner")).toBe(
      "Clearview Mystery",
    );
    expect(parseTitleFromMarkdown("@ just play")).toBe("");
    // The analog header's first line isn't a session.
    expect(kinds("=== Campaign Log: Clearview ===\n=== Session 1 ===").map(([k]) => k)).toEqual([
      "session",
    ]);
  });
});

describe("a full Lonelog 1.6 log with the add-ons", () => {
  const LOG =
    '---\ntitle: Clearview Mystery\nruleset: Loner + Mythic Oracle\n---\n\n# Clearview Mystery\n\n## Session 1\n\n### S1 *School library after hours*\n\n```\n@ Sneak inside to check the archives\nd: Stealth d6=5 vs TN 4 -> Success\n=> I slip inside unnoticed. [L:Library|dark|quiet]\n@(Jonah) Keeps watch at the door\n? Is anyone inside?\n-> Yes, but... (d6=4)\n=> Someone is here, but they\'re distracted. [N:Guard|watchful]\nN (Guard): "Who\'s there?"\nPC: "Stay calm... just stay calm."\n(note: testing alternate stealth rule)\ntbl: Forest Encounter d6=5 -> Traveler on the road\ngen: NPC (custom)\n  Role: d6=3 -> Merchant\n  Trait: d6=5 -> Secretive\n```\n\n\\---\nThe diary reads:\n"Day 47: The tides no longer obey the moon."\n---\\\n\nS2 [R:1|active|entry cave|exits N:R2, E:R3] *The crypt below*\n\n[DUNGEON STATUS]\n[R:2|unexplored]\n[R:3|locked|heavy door]\n[/DUNGEON STATUS]\n\nS3 *Dockside ambush* [COMBAT]\n[F:Pirate Captain|HP 10|Close] [F:Pirate×2|HP 4|Medium]\nRd1\n@ Slash Captain\nd: 1d8=6 damage\n=> [F:Pirate Captain|HP-6|staggered]\n@(Pirate Captain) Desperate swing\nRd2\n=> [F:Pirate Captain|fled] [F:Pirate×1|Close]\n[/COMBAT]\n\n[RESOURCES]\n[Inv:Torch|3] [Inv:Rope|1|50ft] [Wealth:Gold 45|Silver 12]\n[/RESOURCES]\n=> I light a torch. [Inv:Torch-1] [Wealth:Gold+15] [R:1|cleared, looted]\n[PC:Kael|Supply d8|HP 8]\n[PC:Kael|Supply d8→d6]\n';

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

describe("Lonelog 1.7", () => {
  const read = (md: string) => parseMarkdownToEntries(md, "a", 0).map((e) => [e.kind, e.text]);

  it("splits the compact form into its elements", () => {
    expect(
      read("S1 @Sneak d:4<5 ->F => noise [Clock:Alert 1/6] ?Seen? ->Nb (3) => distracted"),
    ).toEqual([
      ["scene", "S1"],
      ["action", "Sneak"],
      ["roll", "4<5 -> F"],
      ["consequence", "noise [Clock:Alert 1/6]"],
      ["question", "Seen?"],
      ["roll", "-> Nb (3)"],
      ["consequence", "distracted"],
    ]);
    expect(
      read(
        "Rd1 @Slash Dock Rat d:17≥10 ->Hit =>[F:Dock Rat|dead] @(Pirate Captain)Cutlass d:19≥14 ->Hit d:Damage 1d8+2=7 =>[PC:Alex|HP-7]",
      ),
    ).toEqual([
      ["note", "Rd1"],
      ["action", "Slash Dock Rat"],
      ["roll", "17≥10 -> Hit"],
      ["consequence", "[F:Dock Rat|dead]"],
      ["action", "(Pirate Captain)Cutlass"],
      ["roll", "19≥14 -> Hit"],
      ["roll", "Damage 1d8+2 -> 7"],
      ["consequence", "[PC:Alex|HP-7]"],
    ]);
    expect(read("[/COMBAT] =>Captain escapes")).toEqual([
      ["note", "[/COMBAT]"],
      ["consequence", "Captain escapes"],
    ]);
    expect(read("[F:Thug A|pos:Close] @(A) Slash d:14<15 ->Miss").map(([k]) => k)).toEqual([
      "note",
      "action",
      "roll",
    ]);
    expect(read("d: d20+4=17 vs AC 10 -> Hit => [F:Dock Rat|dead]").map(([k]) => k)).toEqual([
      "roll",
      "consequence",
    ]);
    expect(read("? Seen? -> Nb (3)").map(([k]) => k)).toEqual(["question", "roll"]);
  });

  it("leaves prose, brackets and quotes whole", () => {
    for (const line of [
      "The sign reads => this way",
      "=> She writes to @odile ",
      "? Quoi ?",
      '=> He says "go => there"',
      "@ Wait (d: nothing)",
      "T2-S1 *City archives* @(Jordan)",
      "S7 *Entrance* (note: storylines T1 and T2 merge)",
      "S9 *Ambush* [COMBAT]",
      "@ Show the arrow -> to them",
      "Rd3 Roster: [PC:Alex|HP 3]",
    ])
      expect(read(line), line).toHaveLength(1);
  });

  it("gives back whatever the player wrote, symbols and all", () => {
    const written = [
      entry("consequence", "It goes => there d: and ?Why -> x", 1),
      entry("action", "(Odile) Points => at me", 2),
      entry("question", "Is it here -> or there?", 3),
      entry("note", "S1 *not a scene*", 4),
      entry("note", "[N:Odile] => she leaves", 5),
      entry("note", "Rd1 @ I strike", 6),
      entry("note", "Two lines\nwith => in them", 7),
    ];
    const md = exportAdventureToMarkdown(es, "A", written);
    expect(read(md)).toEqual(written.map((e) => [e.kind, e.text]));
  });

  it("writes the player's rolls as Lonelog orders them, and reads them back", () => {
    const rolls: [string, string][] = [
      ["d20 -> 14", "d: d20=14"],
      ["Attack d20+5 -> 19 (14 + 5)", "d: Attack d20+5[14]=19"],
      ["2d6+3 -> 9 (4+2 + 3)", "d: 2d6+3[4, 2]=9"],
      ["Strength 4d6dl1 -> 14 (6+5+3, 2✗)", "d: Strength 4d6dl1[6, 5, 3, 2d]=14"],
      ["5d10>=7 -> 2 (8✓ 7✓ 3 2 1)", "d: 5d10>=7[8✓ 7✓ 3 2 1] =2"],
      ["2d6! -> 13 (6!+6!+1)", "d: 2d6![6!+6!+1] =13"],
      ["4dF -> +1 (+ 0 − +)", "d: 4dF[+ 0 − +]=+1"],
      [
        "Ataque, con cuidado d20 -> 15, Daño 1d6+1 -> 5 (4 + 1)",
        "d: Ataque, con cuidado d20=15, Daño 1d6+1[4]=5",
      ],
      ["+[flanking] -[wounded] 2d6+2 -> 9 (4+3 + 2)", "d: +[flanking] -[wounded] 2d6+2[4, 3]=9"],
    ];
    for (const [text, line] of rolls) {
      expect(formatLine({ kind: "roll", text })).toBe(line);
      expect(read(line)).toEqual([["roll", text]]);
    }
    // A verdict, an oracle and prose stay as they are.
    for (const text of [
      "Stealth d6=5 vs TN 4 -> Success",
      "Recluse: white 3 / black 5 -> No",
      "d100=60 vs 35 -> No",
      "1d8=6 damage",
      "Hack (spend 1 Gear) -> Success",
    ]) {
      expect(formatLine({ kind: "roll", text })).toBe(`d: ${text}`);
      expect(read(`d: ${text}`)).toEqual([["roll", text]]);
    }
    // As other tools write them.
    expect(read("d: 4d6dl1[6, 4d, 5, 3]=14")).toEqual([["roll", "4d6dl1 -> 14 (6+5+3, 4✗)"]]);
    expect(read("d: 4d6dl1 // STR=15")).toEqual([["roll", "4d6dl1 // STR=15"]]);
    expect(read("d: Fighting {d8!, d6!}kh1 =12 -> Hit")).toEqual([
      ["roll", "Fighting {d8!, d6!}kh1 =12 -> Hit"],
    ]);
    expect(read("d: Damage 1d8=5")).toEqual([["roll", "Damage 1d8 -> 5"]]);
  });

  it("keeps a multi-line tag in one entry, and the forms it retired", () => {
    const tag = "[PC:Jonah\n  | trait: friendly\n  | stat: HP 8\n]";
    const [only, ...rest] = parseMarkdownToEntries(tag, "a", 0);
    expect(rest).toEqual([]);
    expect(read(exportAdventureToMarkdown(es, "A", [only!]))).toEqual([["note", only!.text]]);
    expect(read("=> A broken sword [tbl]")).toEqual([["roll", "tbl: -> A broken sword"]]);
    expect(read("gen: NPC -> Merchant")).toEqual([["roll", "gen: NPC -> Merchant"]]);
    expect(read("T1+T2-S5 *Reunited*")).toEqual([["scene", "T1+T2-S5 *Reunited*"]]);
  });

  it("keeps the description of a currency in someone's purse", () => {
    const entries = [entry("note", "[Wealth:Mara|Silver 9] [Wealth:Kael|Silver 2]", 1)];
    const md = exportAdventureToMarkdown(es, "A", entries, "", {
      [purseKey("Kael", "Silver")]: { text: "Stolen", updatedAt: 1 },
    });
    expect(md).toContain("[Wealth:Kael|Silver] Stolen");
    expect(parseDescriptionsFromMarkdown(md, 1)).toEqual({
      [purseKey("Kael", "Silver")]: { text: "Stolen", updatedAt: 1 },
    });
  });
});

describe("sectionToLonelog", () => {
  const entries = [
    { ...entry("session", "Session 1", 1), date: "2026-10-03" },
    entry("scene", "S1 *The inn*", 2),
    entry("action", "I look around", 3),
    entry("scene", "S2 *The road*", 4),
    entry("note", "Rain.", 5),
    entry("session", "Session 2", 6),
    entry("note", "Later.", 7),
  ];

  it("copies a session with everything in it, up to the next session", () => {
    expect(sectionToLonelog(entries, "e1")).toBe(
      "=== Session 1 ===\n\n[Date] 2026-10-03\n\nS1 *The inn*\n\n@ I look around\n\nS2 *The road*\n\nRain.\n",
    );
  });

  it("copies a scene up to the next scene or session", () => {
    expect(sectionToLonelog(entries, "e2")).toBe("S1 *The inn*\n\n@ I look around\n");
    expect(sectionToLonelog(entries, "e4")).toBe("S2 *The road*\n\nRain.\n");
  });

  it("copies nothing for an entry that isn't a session or a scene", () => {
    expect(sectionToLonelog(entries, "e3")).toBe("");
  });
});

describe("whatever is written", () => {
  // A small fixed generator, so a failure can be repeated.
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)]!;
  const WORDS = [
    "I",
    "run",
    "=>",
    "=>there",
    "->",
    "d:",
    "d:4",
    "tbl:",
    "gen:",
    "@",
    "@(Odile)",
    "@pepe",
    "?",
    "?Why",
    "S1",
    "Rd2",
    "[N:Odile|wary]",
    "[#L:Mill]",
    "[COMBAT]",
    '"hi',
    'there"',
    "(note:",
    "ok)",
    "[",
    "]",
    "|",
    "\\",
    "===",
    "#",
    ">",
    "*x*",
    "T1-S2",
    "¿Quién?",
    "PC:",
    "d20",
    "=5",
  ] as const;
  const words = (n: number) => Array.from({ length: n }, () => pick(WORDS)).join(" ");

  it("comes back the same from the .md", () => {
    for (let i = 0; i < 4000; i++) {
      const kind = pick(["action", "question", "consequence", "note"] as const);
      const text = `${pick(["", "Word "])}${words(1 + Math.floor(random() * 7))}`.trim();
      // A heading, a fence or a narrative block are Markdown's own; not what's tested here.
      if (kind === "note" && /^\\---|^---/.test(text)) continue;
      const md = exportAdventureToMarkdown(es, "A", [
        entry("note", "Before", 1),
        entry(kind, text, 2),
        entry("note", "After", 3),
      ]);
      const read = parseMarkdownToEntries(md, "a", 0).map((e) => [e.kind, e.text]);
      expect(read, `${kind}: ${text}`).toEqual([
        ["note", "Before"],
        [kind, text],
        ["note", "After"],
      ]);
    }
  });

  it("any dice roll comes back the same from the .md", () => {
    const formulas = [
      "d20",
      "d%",
      "d66",
      "d(66)",
      "2d6+3",
      "1d8+1d6-2",
      "4dF",
      "4dF+2",
      "d6min3",
      "3d6!",
      "3d6!!",
      "3d6!p",
      "4d6r",
      "4d6ro<3",
      "3d6u",
      "4d6kh3",
      "4d6dl1",
      "2d20kl1",
      "5d10>=7",
      "4d6>4f<3",
      "2d20cs>18",
      "4d6s",
      "(1d6+2)*3",
      "{4d6,2d10}k1",
      "{2d6+3,2d6+3}kh1",
      "3d(2*6)",
      "10d6=6",
      "-2d6",
      "{d8!,d6!}kh1",
    ];
    for (const formula of formulas)
      for (let i = 0; i < 60; i++) {
        const roll = rollFormula(formula, random);
        expect(roll, formula).not.toBeNull();
        for (const text of [
          roll!,
          `Attack ${roll}`,
          `Attack, again ${roll}, Fire d6 -> 3`,
          `+[cover] -[hurt] ${roll}`,
        ])
          expect(
            parseMarkdownToEntries(formatLine({ kind: "roll", text }), "a", 0).map((e) => [
              e.kind,
              e.text,
            ]),
            text,
          ).toEqual([["roll", text]]);
      }
  });
});

it("keeps what the notations left apart write as text, out of the notebook and the rolls", () => {
  const lines = [
    "! The bridge collapses behind the party",
    "[Party:Crew|Gold 150]",
    "[Faction:Guild|rising]",
    "[Unit:Spearmen|×10|status:steady]",
    "[Force:Red|points 500]",
    "[Scenario:Dawn raid]",
  ];
  const entries = parseMarkdownToEntries(lines.join("\n\n"), "a", 0);
  expect(entries.map((e) => [e.kind, e.text])).toEqual(lines.map((l) => ["note", l]));
  expect(buildCast(entries)).toEqual([]);
  expect(
    parseMarkdownToEntries(exportAdventureToMarkdown(es, "A", entries), "a", 0).map((e) => e.text),
  ).toEqual(lines);
});
