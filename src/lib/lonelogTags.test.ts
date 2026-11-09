import { describe, expect, it } from "vitest";
import { foeIsOut,
  applyTagUpdates,
  buildCast,
  castKey,
  findTagQuery,
  formatProgressTag,
  formatTag,
  splitTags,
  suggestCast,
  tagOptions,
  tagOptionText,
  tagsToPlainText,
  threadStatus,
  type TagOption,
} from "./lonelogTags";
import type { JournalEntry, JournalLineKind } from "./lonelog";

function entry(kind: JournalLineKind, text: string, i: number): JournalEntry {
  return { id: `e${i}`, adventureId: "a1", timestamp: 1000 + i, kind, text };
}

describe("splitTags", () => {
  it("finds NPC, PC and location tags among the prose", () => {
    const parts = splitTags("Meet [N:Jonah|friendly|wounded] at the [L:Lighthouse]. [PC:Alex|HP 8]");
    expect(parts.map((p) => p.text)).toEqual([
      "Meet ",
      "[N:Jonah|friendly|wounded]",
      " at the ",
      "[L:Lighthouse]",
      ". ",
      "[PC:Alex|HP 8]",
    ]);
    expect(parts[1].tag).toEqual({ kind: "npc", name: "Jonah", reference: false, details: ["friendly", "wounded"] });
    expect(parts[3].tag).toEqual({ kind: "place", name: "Lighthouse", reference: false, details: [] });
    expect(parts[5].tag?.kind).toBe("pc");
  });

  it("reads reference tags and multi-line tags", () => {
    expect(splitTags("[#N:Jonah]")[0].tag).toEqual({ kind: "npc", name: "Jonah", reference: true, details: [] });
    const [multi] = splitTags("[PC:Jonah\n  | trait: friendly, curious\n  | status: wounded\n]");
    expect(multi.tag).toEqual({
      kind: "pc",
      name: "Jonah",
      reference: false,
      details: ["trait: friendly, curious", "status: wounded"],
    });
  });

  it("leaves other brackets alone (unknown types, plain text, empty names)", () => {
    const text = "[Faction:Guild|rising] [a note] [N:] [Z:1|cleared]";
    expect(splitTags(text)).toEqual([{ text }]);
  });

  it("reads threads and the number of clocks, tracks and timers", () => {
    const tags = splitTags("[Thread:The box|Open] [Clock:Ritual 5/12] [E:Alarm 2/6] [Track:Escape 3/8] [Timer:Dawn 3] [Clock:Ritual+1] [#Clock:Ritual]").flatMap((p) => (p.tag ? [p.tag] : []));
    expect(tags.map((t) => [t.kind, t.name, t.progress])).toEqual([
      ["thread", "The box", undefined],
      ["clock", "Ritual", { value: 5, max: 12 }],
      ["clock", "Alarm", { value: 2, max: 6 }],
      ["track", "Escape", { value: 3, max: 8 }],
      ["timer", "Dawn", { value: 3 }],
      ["clock", "Ritual", { value: 1, relative: true }],
      ["clock", "Ritual", undefined],
    ]);
  });
});

describe("applyTagUpdates", () => {
  it("adds plain and + tags, removes - tags and replaces with →", () => {
    let tags = applyTagUpdates([], ["friendly", "wounded"]);
    tags = applyTagUpdates(tags, ["captured"]);
    expect(tags).toEqual(["friendly", "wounded", "captured"]);
    tags = applyTagUpdates(tags, ["-wounded", "+Captured"]);
    expect(tags).toEqual(["friendly", "captured"]);
    expect(applyTagUpdates(tags, ["friendly→hostile"])).toEqual(["hostile", "captured"]);
    expect(applyTagUpdates(tags, ["friendly->hostile"])).toEqual(["hostile", "captured"]);
  });

  it("keeps one value per stat and per category", () => {
    let tags = applyTagUpdates([], ["HP 8", "Stress 0", "Gear:Flashlight"]);
    tags = applyTagUpdates(tags, ["HP-2", "Stress+1"]);
    expect(tags).toEqual(["HP 6", "Stress 1", "Gear:Flashlight"]);
    tags = applyTagUpdates(tags, ["HP 7", "gear: Rope"]);
    expect(tags).toEqual(["HP 7", "Stress 1", "gear: Rope"]);
    expect(applyTagUpdates(["Clock 2/6"], ["Clock+1"])).toEqual(["Clock 3/6"]);
  });
});

describe("buildCast", () => {
  it("derives each element's state and mentions in journal order", () => {
    const cast = buildCast([
      entry("note", "[N:Jonah|friendly|wounded] waits at the [L:Lighthouse|ruined].", 1),
      entry("roll", "d: Persuade 2d6 [N:Ignored] = 8 -> Mixed", 2),
      entry("consequence", "He's taken. [N:jonah|+captured|-wounded]", 3),
      entry("action", "I ask [#N:Jonah] about it.", 4),
      entry("session", "[L:Not a tag here]", 5),
    ]);
    expect(cast).toEqual([
      { key: castKey("npc", "Jonah"), kind: "npc", name: "Jonah", tags: ["friendly", "captured"], mentions: ["e1", "e3", "e4"], lastSeen: 1004 },
      { key: castKey("place", "Lighthouse"), kind: "place", name: "Lighthouse", tags: ["ruined"], mentions: ["e1"], lastSeen: 1001 },
    ]);
  });

  it("treats a PC and an NPC with the same name as different elements", () => {
    const cast = buildCast([entry("note", "[PC:Mara] [N:Mara]", 1)]);
    expect(cast.map((c) => c.kind)).toEqual(["pc", "npc"]);
  });
});

describe("threads and progress", () => {
  it("a thread keeps one state, in either language", () => {
    const [thread] = buildCast([
      entry("note", "[Thread:La caja sellada|Abierto|urgente]", 1),
      entry("note", "[Thread:la caja sellada|Closed]", 2),
    ]);
    expect(thread.tags).toEqual(["urgente", "Closed"]);
    expect(threadStatus(thread)).toBe("closed");
    expect(threadStatus(buildCast([entry("note", "[Thread:Otra]", 3)])[0])).toBe("open");
  });

  it("clocks follow their last value, relative changes and keep their size", () => {
    const [clock, timer] = buildCast([
      entry("note", "[Clock:Ritual 2/6] [Timer:Alba 3]", 1),
      entry("note", "[Clock:Ritual+2] [Timer:Alba 2]", 2),
      entry("note", "[Clock:Ritual 5] [#Clock:Ritual]", 3),
    ]);
    expect(clock.progress).toEqual({ value: 5, max: 6 });
    expect(timer.progress).toEqual({ value: 2 });
    expect(formatProgressTag("clock", "Ritual", 6, 6)).toBe("[Clock:Ritual 6/6]");
    expect(tagsToPlainText("Sube [Clock:Ritual 6/6]")).toBe("Sube Ritual 6/6");
  });
});

describe("formatTag", () => {
  it("writes tags the way the spec does, and they read back", () => {
    expect(formatTag("npc", "Odile", ["innkeeper", " wary "])).toBe("[N:Odile|innkeeper|wary]");
    expect(formatTag("place", "Old mill", [], true)).toBe("[#L:Old mill]");
    expect(formatTag("pc", "Ma|ra]", ["HP 8"])).toBe("[PC:Ma ra|HP 8]");
    const written = formatTag("npc", "Odile", ["+captured"]);
    expect(splitTags(written)[0].tag).toEqual({ kind: "npc", name: "Odile", reference: false, details: ["+captured"] });
  });
});

describe("findTagQuery", () => {
  it("finds the tag being typed before the caret", () => {
    expect(findTagQuery("Hablo con [")).toEqual({ start: 10, kind: undefined, text: "" });
    expect(findTagQuery("Hablo con [Od")).toEqual({ start: 10, kind: undefined, text: "Od" });
    expect(findTagQuery("[N:Od")).toEqual({ start: 0, kind: "npc", text: "Od" });
    expect(findTagQuery("[#L:mo")).toEqual({ start: 0, kind: "place", text: "mo" });
    expect(findTagQuery("[PC:")).toEqual({ start: 0, kind: "pc", text: "" });
  });

  it("ignores closed tags, checkboxes and other kinds of tag", () => {
    expect(findTagQuery("[N:Odile] y")).toBeNull();
    expect(findTagQuery("- [ ")).toBeNull();
    expect(findTagQuery("[Faction:La caja")).toBeNull();
    expect(findTagQuery("[N:Odile|herida")).toBeNull();
    expect(findTagQuery("sin corchete")).toBeNull();
  });
});

describe("suggestCast", () => {
  const cast = buildCast([entry("note", "[N:Odile] [L:Molino] [N:Bram el molinero] [PC:Mara]", 1)]);

  it("filters by name (accents and case ignored), in alphabetical order", () => {
    expect(suggestCast(cast, findTagQuery("[mo")!).map((m) => m.name)).toEqual(["Bram el molinero", "Molino"]);
    expect(suggestCast(cast, findTagQuery("[ÓD")!).map((m) => m.name)).toEqual(["Odile"]);
    expect(suggestCast(cast, findTagQuery("[")!).map((m) => m.name)).toEqual(["Bram el molinero", "Mara", "Molino", "Odile"]);
  });

  it("only offers the type already typed", () => {
    expect(suggestCast(cast, findTagQuery("[L:")!).map((m) => m.name)).toEqual(["Molino"]);
  });
  it("lists every match with no limit, closed threads too", () => {
    const more = buildCast([
      entry("note", "[N:Odile] [Thread:La caja|Open] [Thread:El robo|Closed]", 1),
      entry("note", "[Clock:Alerta 1/4] [N:B] [N:C] [N:D] [N:E] [N:F]", 2),
    ]);
    expect(suggestCast(more, findTagQuery("[")!)).toHaveLength(9);
    expect(suggestCast(more, findTagQuery("[el")!).map((m) => m.name)).toEqual(["El robo"]);
  });
});

describe("tagOptions", () => {
  it("takes a prefix in any case and writes the notation's own", () => {
    const query = findTagQuery("Pienso en [clock:Huida")!;
    expect(query.kind).toBe("clock");
    expect(tagOptions([], query).map(tagOptionText)).toEqual(["[Clock:Huida 0/6]"]);
    expect(findTagQuery("[#n:Od")?.kind).toBe("npc");
    expect(findTagQuery("[THREAD:La")?.kind).toBe("thread");
  });

  const names = (options: TagOption[]) => options.map((o) => ("member" in o ? o.member.name : `new ${o.kind}`));

  it("puts the last three named first, then everything in alphabetical order", () => {
    const cast = buildCast([
      entry("note", "[N:Odile] [L:Molino] [N:Bram] [Thread:La caja|Open]", 1),
      entry("note", "[PC:Mara]", 2),
      entry("note", "[Clock:Alerta 1/4]", 3),
      entry("note", "[#N:Odile]", 4),
    ]);
    const options = tagOptions(cast, findTagQuery("[")!);
    expect(names(options)).toEqual(["Odile", "Alerta", "Mara", "Bram", "La caja", "Molino"]);
    expect(options.map((o) => "member" in o && !!o.recent)).toEqual([true, true, true, false, false, false]);
  });

  it("is only alphabetical once a name is typed, or when the cast is short", () => {
    const cast = buildCast([entry("note", "[N:Odile] [L:Molino]", 1), entry("note", "[N:Bram el molinero]", 2)]);
    expect(names(tagOptions(cast, findTagQuery("[")!))).toEqual(["Bram el molinero", "Molino", "Odile"]);
    expect(names(tagOptions(cast, findTagQuery("[mo")!)).slice(0, 2)).toEqual(["Bram el molinero", "Molino"]);
  });

  it("offers a new one of every kind, or only the typed kind after a prefix", () => {
    const kinds = (q: string) => tagOptions([], findTagQuery(q)!).map((o) => ("kind" in o ? o.kind : ""));
    expect(kinds("[Torre")).toEqual(["npc", "place", "pc", "thread", "clock", "track", "timer", "room", "foe", "item", "wealth"]);
    expect(kinds("[Clock:Torre")).toEqual(["clock"]);
  });

  it("starts a new clock or timer with a size unless one is typed", () => {
    expect(tagOptionText({ kind: "clock", name: "Torre" })).toBe("[Clock:Torre 0/6]");
    expect(tagOptionText({ kind: "timer", name: "Torre" })).toBe("[Timer:Torre 6]");
    expect(tagOptionText({ kind: "clock", name: "Torre 2/4" })).toBe("[Clock:Torre 2/4]");
    expect(tagOptionText({ kind: "thread", name: "Torre" })).toBe("[Thread:Torre]");
  });
});

describe("the official add-ons' tags", () => {
  const log = (...lines: string[]) =>
    lines.map((text, i) => ({ id: `e${i}`, adventureId: "a", timestamp: i, kind: "note" as const, text }));
  const find = (lines: string[], key: string) => buildCast(log(...lines)).find((m) => m.key === key);

  it("follows a room's status, description and exits (dungeon crawling)", () => {
    const room = find(
      ["[R:4|active|storage room, dusty shelves|exits S:R2, E:R5]", "[R:4|cleared, looted]", "[R:4|exits E:R7(secret)]", "[#R:4]"],
      "room:4",
    );
    expect(room?.tags).toEqual(["cleared, looted", "storage room, dusty shelves", "exits S:R2, E:R7(secret)"]);
    expect(room?.mentions).toHaveLength(4);
    expect(find(["[R:1|cleared]", "[R:1|+looted]", "[R:1|-cleared]"], "room:1")?.tags).toEqual(["looted"]);
  });

  it("follows a foe's hit points, range band and group size (combat)", () => {
    const foe = find(["[F:Thug A|HP 6|Close|armed]", "[F:Thug A|HP-3|Far]", "[F:Thug A|dead]"], "foe:thug a");
    expect(foe?.tags).toEqual(["HP 3", "armed", "Far", "dead"]);
    expect(foeIsOut(foe!)).toBe(true);
    const goblins = find(["[F:Goblins×4|HP 3 each|Close]", "[F:Goblins×3|Close]"], "foe:goblins");
    expect(goblins?.tags).toEqual(["HP 3 each", "×3", "Close"]);
  });

  it("counts items and money (resource tracking)", () => {
    const torch = find(["[Inv:Torch|3]", "[Inv:Torch-1]", "[Inv:Torch+2]", "[Inv:Torch|4→1|smoky]"], "item:torch");
    expect(torch?.progress).toEqual({ value: 1 });
    expect(torch?.tags).toEqual(["smoky"]);
    expect(find(["[Inv:Oil Flask|2]", "[Inv:Oil Flask|depleted]"], "item:oil flask")?.progress).toEqual({ value: 0 });
    expect(find(["[Inv:Map to the Ruins]"], "item:map to the ruins")?.progress).toBeUndefined();

    const cast = buildCast(log("[Wealth:Gold 45|Silver 12]", "[Wealth:Gold+15]", "[Wealth:Gold-8]", "[Wealth:Silver 12→20]"));
    expect(cast.map((m) => [m.kind, m.name, m.progress?.value])).toEqual([
      ["wealth", "Gold", 52],
      ["wealth", "Silver", 20],
    ]);
  });

  it("keeps a label when its value changes (abstract resources in [PC:])", () => {
    const pc = find(["[PC:Kael|Supply d8|Supplies:abundant|HP 8]", "[PC:Kael|Supply d8→d6]", "[PC:Kael|Supplies:abundant→low|HP 8→6]"], "pc:kael");
    expect(pc?.tags).toEqual(["Supply d6", "Supplies:low", "HP 6"]);
    // A plain replacement still works as before.
    expect(find(["[N:Jonah|friendly]", "[N:Jonah|friendly→hostile]"], "npc:jonah")?.tags).toEqual(["hostile"]);
  });

  it("draws the add-ons' tags as chips, with their numbers", () => {
    const [, foe] = splitTags("Two of them: [F:Goblins×2|Close]");
    expect(foe.tag).toMatchObject({ kind: "foe", name: "Goblins", details: ["×2", "Close"] });
    expect(splitTags("[Inv:Arrow-1]")[0].tag).toMatchObject({ kind: "item", name: "Arrow", progress: { value: -1, relative: true } });
    expect(splitTags("[Wealth:Gold 45→52]")[0].tag).toMatchObject({ kind: "wealth", name: "Gold", progress: { value: 52 } });
  });
});
