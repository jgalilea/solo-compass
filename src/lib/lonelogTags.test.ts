import { describe, expect, it } from "vitest";
import { applyTagUpdates, buildCast, castKey, findTagQuery, formatTag, splitTags, suggestCast } from "./lonelogTags";
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

  it("leaves other brackets alone (threads, clocks, plain text)", () => {
    const text = "[Thread:The box|Open] [E:Alarm 2/6] [a note] [N:]";
    expect(splitTags(text)).toEqual([{ text }]);
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
      { key: castKey("npc", "Jonah"), kind: "npc", name: "Jonah", tags: ["friendly", "captured"], mentions: ["e1", "e3", "e4"] },
      { key: castKey("place", "Lighthouse"), kind: "place", name: "Lighthouse", tags: ["ruined"], mentions: ["e1"] },
    ]);
  });

  it("treats a PC and an NPC with the same name as different elements", () => {
    const cast = buildCast([entry("note", "[PC:Mara] [N:Mara]", 1)]);
    expect(cast.map((c) => c.kind)).toEqual(["pc", "npc"]);
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
    expect(findTagQuery("[Thread:La caja")).toBeNull();
    expect(findTagQuery("[N:Odile|herida")).toBeNull();
    expect(findTagQuery("sin corchete")).toBeNull();
  });
});

describe("suggestCast", () => {
  const cast = buildCast([entry("note", "[N:Odile] [L:Molino] [N:Bram el molinero] [PC:Mara]", 1)]);

  it("filters by name (accents and case ignored), names starting with it first", () => {
    expect(suggestCast(cast, findTagQuery("[mo")!).map((m) => m.name)).toEqual(["Molino", "Bram el molinero"]);
    expect(suggestCast(cast, findTagQuery("[ÓD")!).map((m) => m.name)).toEqual(["Odile"]);
    expect(suggestCast(cast, findTagQuery("[")!)).toHaveLength(4);
  });

  it("only offers the type already typed", () => {
    expect(suggestCast(cast, findTagQuery("[L:")!).map((m) => m.name)).toEqual(["Molino"]);
  });
});
