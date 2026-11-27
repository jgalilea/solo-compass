import { describe, expect, it } from "vitest";
import {
  foeIsOut,
  applyTagUpdates,
  combineSteps,
  progressDone,
  renameInEntry,
  buildCast,
  mainPc,
  showDetail,
  castKey,
  characterNamed,
  findActorQuery,
  findMember,
  findTagQuery,
  formatProgressTag,
  formatQuantity,
  formatReference,
  formatTag,
  splitTags,
  suggestCast,
  tagKey,
  threadChange,
  writeDetails,
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
    const parts = splitTags(
      "Meet [N:Jonah|friendly|wounded] at the [L:Lighthouse]. [PC:Alex|HP 8]",
    );
    expect(parts.map((p) => p.text)).toEqual([
      "Meet ",
      "[N:Jonah|friendly|wounded]",
      " at the ",
      "[L:Lighthouse]",
      ". ",
      "[PC:Alex|HP 8]",
    ]);
    expect(parts[1].tag).toEqual({
      kind: "npc",
      name: "Jonah",
      reference: false,
      details: ["friendly", "wounded"],
    });
    expect(parts[3].tag).toEqual({
      kind: "place",
      name: "Lighthouse",
      reference: false,
      details: [],
    });
    expect(parts[5].tag?.kind).toBe("pc");
  });

  it("reads reference tags and multi-line tags", () => {
    expect(splitTags("[#N:Jonah]")[0].tag).toEqual({
      kind: "npc",
      name: "Jonah",
      reference: true,
      details: [],
    });
    const [multi] = splitTags("[PC:Jonah\n  | trait: friendly, curious\n  | status: wounded\n]");
    expect(multi.tag).toEqual({
      kind: "pc",
      name: "Jonah",
      reference: false,
      details: ["trait: friendly, curious", "status: wounded"],
      block: true,
    });
  });

  it("leaves other brackets alone (unknown types, plain text, empty names)", () => {
    const text = "[Faction:Guild|rising] [a note] [N:] [Z:1|cleared]";
    expect(splitTags(text)).toEqual([{ text }]);
  });

  it("reads threads and the number of clocks, tracks and timers", () => {
    const tags = splitTags(
      "[Thread:The box|Open] [Clock:Ritual 5/12] [E:Alarm 2/6] [Track:Escape 3/8] [Timer:Dawn 3] [Clock:Ritual+1] [#Clock:Ritual]",
    ).flatMap((p) => (p.tag ? [p.tag] : []));
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
  it("doesn't repeat a value a swap brings that's already there", () => {
    expect(applyTagUpdates(["ally"], ["wary→ally"])).toEqual(["ally"]);
    expect(applyTagUpdates(["wary", "ally"], ["wary→ally"])).toEqual(["ally"]);
  });

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
      {
        key: castKey("npc", "Jonah"),
        kind: "npc",
        name: "Jonah",
        tags: ["friendly", "captured"],
        mentions: ["e1", "e3", "e4"],
        lastSeen: 1004,
      },
      {
        key: castKey("place", "Lighthouse"),
        kind: "place",
        name: "Lighthouse",
        tags: ["ruined"],
        mentions: ["e1"],
        lastSeen: 1001,
      },
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
    expect(splitTags(written)[0].tag).toEqual({
      kind: "npc",
      name: "Odile",
      reference: false,
      details: ["+captured"],
    });
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

describe("who acts or speaks", () => {
  const cast = buildCast([
    entry("note", "[N:Odile] [L:Molino] [PC:Mara] [Thread:La caja|Open]", 1),
  ]);

  it("finds the name being typed at the start of an action or a dialogue line", () => {
    expect(findActorQuery("(Od", "action")).toEqual({ start: 1, text: "Od", actor: "action" });
    expect(findActorQuery("(", "action")).toEqual({ start: 1, text: "", actor: "action" });
    expect(findActorQuery("N (Od", "note")).toEqual({ start: 3, text: "Od", actor: "dialogue" });
    expect(findActorQuery("(Odile) busca", "action")).toBeNull();
    expect(findActorQuery("Busco (Od", "action")).toBeNull();
    expect(findActorQuery("(Od", "note")).toBeNull();
    expect(findActorQuery("N (Odile): hola", "note")).toBeNull();
  });

  it("offers only characters, and anyone else by name", () => {
    const names = (o: TagOption) => ("member" in o ? o.member.name : `other ${o.name}`);
    expect(tagOptions(cast, findActorQuery("(", "action")!).map(names)).toEqual(["Mara", "Odile"]);
    expect(tagOptions(cast, findActorQuery("(mo", "action")!).map(names)).toEqual(["other mo"]);
  });

  it("writes the name and closes the notation", () => {
    const [odile] = tagOptions(cast, findActorQuery("(Od", "action")!);
    expect(tagOptionText(odile, { actor: "action" })).toBe("Odile) ");
    expect(tagOptionText(odile, { actor: "dialogue" })).toBe("Odile): ");
    expect(tagOptionText({ kind: "npc", name: "El (viejo) Bram" }, { actor: "action" })).toBe(
      "El viejo Bram) ",
    );
  });

  it("finds the character a name points to, accents and case aside", () => {
    expect(characterNamed(cast, "odile")?.kind).toBe("npc");
    expect(characterNamed(cast, " Mara ")?.kind).toBe("pc");
    expect(characterNamed(cast, "Molino")).toBeUndefined();
    expect(characterNamed(cast, "Bram")).toBeUndefined();
  });
});

describe("suggestCast", () => {
  const cast = buildCast([entry("note", "[N:Odile] [L:Molino] [N:Bram el molinero] [PC:Mara]", 1)]);

  it("filters by name (accents and case ignored), in alphabetical order", () => {
    expect(suggestCast(cast, findTagQuery("[mo")!).map((m) => m.name)).toEqual([
      "Bram el molinero",
      "Molino",
    ]);
    expect(suggestCast(cast, findTagQuery("[ÓD")!).map((m) => m.name)).toEqual(["Odile"]);
    expect(suggestCast(cast, findTagQuery("[")!).map((m) => m.name)).toEqual([
      "Bram el molinero",
      "Mara",
      "Molino",
      "Odile",
    ]);
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
    expect(tagOptions([], query).map((o) => tagOptionText(o))).toEqual(["[Clock:Huida 0/6]"]);
    expect(findTagQuery("[#n:Od")?.kind).toBe("npc");
    expect(findTagQuery("[THREAD:La")?.kind).toBe("thread");
  });

  const names = (options: TagOption[]) =>
    options.map((o) => ("member" in o ? o.member.name : `new ${o.kind}`));

  it("puts the last three named first, then everything in alphabetical order", () => {
    const cast = buildCast([
      entry("note", "[N:Odile] [L:Molino] [N:Bram] [Thread:La caja|Open]", 1),
      entry("note", "[PC:Mara]", 2),
      entry("note", "[Clock:Alerta 1/4]", 3),
      entry("note", "[#N:Odile]", 4),
    ]);
    const options = tagOptions(cast, findTagQuery("[")!);
    expect(names(options)).toEqual(["Odile", "Alerta", "Mara", "Bram", "La caja", "Molino"]);
    expect(options.map((o) => "member" in o && !!o.recent)).toEqual([
      true,
      true,
      true,
      false,
      false,
      false,
    ]);
  });

  it("is only alphabetical once a name is typed, or when the cast is short", () => {
    const cast = buildCast([
      entry("note", "[N:Odile] [L:Molino]", 1),
      entry("note", "[N:Bram el molinero]", 2),
    ]);
    expect(names(tagOptions(cast, findTagQuery("[")!))).toEqual([
      "Bram el molinero",
      "Molino",
      "Odile",
    ]);
    expect(names(tagOptions(cast, findTagQuery("[mo")!)).slice(0, 2)).toEqual([
      "Bram el molinero",
      "Molino",
    ]);
  });

  it("offers a new one of every kind, or only the typed kind after a prefix", () => {
    const kinds = (q: string) =>
      tagOptions([], findTagQuery(q)!).map((o) => ("kind" in o ? o.kind : ""));
    expect(kinds("[Torre")).toEqual([
      "npc",
      "place",
      "pc",
      "thread",
      "clock",
      "track",
      "timer",
      "event",
      "room",
      "foe",
      "item",
      "wealth",
      "deck",
    ]);
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
    lines.map((text, i) => ({
      id: `e${i}`,
      adventureId: "a",
      timestamp: i,
      kind: "note" as const,
      text,
    }));
  const find = (lines: string[], key: string) =>
    buildCast(log(...lines)).find((m) => m.key === key);

  it("follows a room's status, description and exits (dungeon crawling)", () => {
    const room = find(
      [
        "[R:4|active|storage room, dusty shelves|exits S:R2, E:R5]",
        "[R:4|cleared, looted]",
        "[R:4|exits E:R7(secret)]",
        "[#R:4]",
      ],
      "room:4",
    );
    expect(room?.tags).toEqual([
      "cleared, looted",
      "storage room, dusty shelves",
      "exits S:R2, E:R7(secret)",
    ]);
    // In Spanish, the word as written.
    const sala = buildCast([
      entry("note", "[R:1|explorada|sala de la rueda|salidas Arriba:R2, Abajo:R3]", 1),
    ])[0];
    expect(sala.tags.at(-1)).toBe("salidas Arriba:R2, Abajo:R3");
    expect(room?.mentions).toHaveLength(4);
    expect(find(["[R:1|cleared]", "[R:1|+looted]", "[R:1|-cleared]"], "room:1")?.tags).toEqual([
      "looted",
    ]);
  });

  it("follows a foe's hit points, range band and group size (combat)", () => {
    const foe = find(
      ["[F:Thug A|HP 6|Close|armed]", "[F:Thug A|HP-3|Far]", "[F:Thug A|dead]"],
      "foe:thug a",
    );
    expect(foe?.tags).toEqual(["HP 3", "armed", "Far", "dead"]);
    expect(foeIsOut(foe!)).toBe(true);
    const goblins = find(["[F:Goblins×4|HP 3 each|Close]", "[F:Goblins×3|Close]"], "foe:goblins");
    expect(goblins?.tags).toEqual(["×3", "HP 3 each", "Close"]);
  });

  it("counts items and money (resource tracking)", () => {
    const torch = find(
      ["[Inv:Torch|3]", "[Inv:Torch-1]", "[Inv:Torch+2]", "[Inv:Torch|4→1|smoky]"],
      "item:torch",
    );
    expect(torch?.progress).toEqual({ value: 1 });
    expect(torch?.tags).toEqual(["smoky"]);
    expect(
      find(["[Inv:Oil Flask|2]", "[Inv:Oil Flask|depleted]"], "item:oil flask")?.progress,
    ).toEqual({ value: 0 });
    expect(find(["[Inv:Map to the Ruins]"], "item:map to the ruins")?.progress).toBeUndefined();

    const cast = buildCast(
      log(
        "[Wealth:Gold 45|Silver 12]",
        "[Wealth:Gold+15]",
        "[Wealth:Gold-8]",
        "[Wealth:Silver 12→20]",
      ),
    );
    expect(cast.map((m) => [m.kind, m.name, m.progress?.value])).toEqual([
      ["wealth", "Gold", 52],
      ["wealth", "Silver", 20],
    ]);
  });

  it("keeps a label when its value changes (abstract resources in [PC:])", () => {
    const pc = find(
      [
        "[PC:Kael|Supply d8|Supplies:abundant|HP 8]",
        "[PC:Kael|Supply d8→d6]",
        "[PC:Kael|Supplies:abundant→low|HP 8→6]",
      ],
      "pc:kael",
    );
    expect(pc?.tags).toEqual(["Supply d6", "Supplies:low", "HP 6"]);
    // A plain replacement still works as before.
    expect(find(["[N:Jonah|friendly]", "[N:Jonah|friendly→hostile]"], "npc:jonah")?.tags).toEqual([
      "hostile",
    ]);
  });

  it("draws the add-ons' tags as chips, with their numbers", () => {
    const [, foe] = splitTags("Two of them: [F:Goblins×2|Close]");
    expect(foe.tag).toMatchObject({ kind: "foe", name: "Goblins", details: ["×2", "Close"] });
    expect(splitTags("[Inv:Arrow-1]")[0].tag).toMatchObject({
      kind: "item",
      name: "Arrow",
      progress: { value: -1, relative: true },
    });
    expect(splitTags("[Wealth:Gold 45→52]")[0].tag).toMatchObject({
      kind: "wealth",
      name: "Gold",
      progress: { value: 52 },
    });
  });
});

describe("combineSteps", () => {
  it("keeps a clock's latest value", () => {
    expect(combineSteps("[Clock:Alarm 2/6]", "[Clock:Alarm 3/6]")).toBe("[Clock:Alarm 3/6]");
    expect(combineSteps("[Timer:Dawn 3]", "[Timer:dawn 2]")).toBe("[Timer:dawn 2]");
  });

  it("adds up a quantity's changes, and drops them when they cancel out", () => {
    expect(combineSteps("[Inv:Torch-1]", "[Inv:Torch-1]")).toBe("[Inv:Torch-2]");
    expect(combineSteps("[Wealth:Gold+1]", "[Wealth:Gold-3]")).toBe("[Wealth:Gold-2]");
    expect(combineSteps("[Inv:Torch-1]", "[Inv:Torch+1]")).toBe("");
  });

  it("leaves alone what isn't a step of the same thing", () => {
    expect(combineSteps("[Clock:Alarm 2/6]", "[Clock:Ritual 3/6]")).toBeNull();
    expect(combineSteps("[Clock:Alarm 2/6]", "[Track:Alarm 3/6]")).toBeNull();
    expect(combineSteps("The alarm rings. [Clock:Alarm 2/6]", "[Clock:Alarm 3/6]")).toBeNull();
    expect(combineSteps("[Inv:Torch-1]", "[Inv:Rope-1]")).toBeNull();
    expect(combineSteps("[Inv:Torch-1]", "[Clock:Torch 1/4]")).toBeNull();
  });
});

describe("renameInEntry", () => {
  const odille = { kind: "npc" as const, name: "Odille" };
  const note = (text: string) => ({ kind: "note" as const, text });
  it("renames its tags, references included, and nothing else", () => {
    expect(
      renameInEntry(
        note("[N:Odille|wary] dries tankards. [#N:odille] nods. [L:Odille's inn]"),
        odille,
        "Odile",
      ),
    ).toBe("[N:Odile|wary] dries tankards. [#N:Odile] nods. [L:Odille's inn]");
    expect(renameInEntry(note("[PC:Odille]"), odille, "Odile")).toBe("[PC:Odille]");
  });

  it("keeps the number of a clock or a quantity", () => {
    expect(renameInEntry(note("[Clock:Alrm 2/6]"), { kind: "clock", name: "Alrm" }, "Alarm")).toBe(
      "[Clock:Alarm 2/6]",
    );
    expect(
      renameInEntry(note("[Inv:Torh-1] [Inv:Torh|3]"), { kind: "item", name: "Torh" }, "Torch"),
    ).toBe("[Inv:Torch-1] [Inv:Torch|3]");
  });

  it("renames an NPC's dialogue and actions too", () => {
    expect(renameInEntry(note('N (Odille): "Maybe."'), odille, "Odile")).toBe(
      'N (Odile): "Maybe."',
    );
    expect(
      renameInEntry({ kind: "action", text: "(Odille) Shuts the door" }, odille, "Odile"),
    ).toBe("(Odile) Shuts the door");
    expect(renameInEntry({ kind: "action", text: "(Jonah) Waits" }, odille, "Odile")).toBe(
      "(Jonah) Waits",
    );
  });

  it("won't write a name that breaks the tag", () => {
    expect(renameInEntry(note("[N:Odille]"), odille, "Odile [the innkeeper]")).toBe(
      "[N:Odile the innkeeper ]".replace(" ]", "]"),
    );
    expect(renameInEntry(note("[N:Odille]"), odille, "  ")).toBe("[N:Odille]");
  });
});

describe("progressDone", () => {
  it("tells a full clock or track and a timer that's run out", () => {
    expect(progressDone("clock", { value: 4, max: 4 })).toBe(true);
    expect(progressDone("clock", { value: 3, max: 4 })).toBe(false);
    expect(progressDone("track", { value: 8, max: 8 })).toBe(true);
    expect(progressDone("timer", { value: 0 })).toBe(true);
    expect(progressDone("timer", { value: 2 })).toBe(false);
    // A change ("+1") says nothing about where it stands.
    expect(progressDone("timer", { value: -1, relative: true })).toBe(false);
    expect(progressDone("item", { value: 0 })).toBe(false);
  });
});

describe("Lonelog 1.7 tags", () => {
  const log = (...lines: string[]) => lines.map((text, i) => entry("note", text, i));
  const find = (key: string, ...lines: string[]) => findMember(buildCast(log(...lines)), key)!;

  it("follows the spec's own examples", () => {
    expect(
      find(
        "npc:jonah",
        "[N:Jonah|friendly|injured]",
        "[N:Jonah|captured]",
        "[N:Jonah|-injured]",
        "[N:Jonah|friendly>hostile]",
      ).tags,
    ).toEqual(["hostile", "captured"]);
    expect(
      find("npc:guard", "[N:Guard|status:alert]", "[N:Guard|status:unconscious]").tags,
    ).toEqual(["status:unconscious"]);
    expect(find("pc:alex", "[PC:Alex|HP 8|Gold 12]", "[PC:Alex|HP-2|Gold-5]").tags).toEqual([
      "HP 6",
      "Gold 7",
    ]);
    expect(find("npc:bandits", "[N:Bandits|×6]", "[N:Bandits|×4]", "[N:Bandits|×-1]").tags).toEqual(
      ["×3"],
    );
    expect(find("npc:bandits", "[N:Bandits×6|wary]", "[N:Bandits|×4]").tags).toEqual([
      "×4",
      "wary",
    ]);
    expect(
      find(
        "pc:jonah",
        "[PC:Jonah|trait:friendly,curious]",
        "[PC:Jonah|trait:+reckless]",
        "[PC:Jonah|trait:-curious]",
      ).tags,
    ).toEqual(["trait:friendly, reckless"]);
    expect(
      find(
        "pc:kael",
        "[PC:Kael|Supply d8]",
        "[PC:Kael|Supply d8>d6]",
        "[PC:Kael|Torchlight d4]",
        "[PC:Kael|Torchlight depleted]",
      ).tags,
    ).toEqual(["Supply d6", "Torchlight depleted"]);
    expect(find("timer:dawn", "[Timer:Dawn 3]", "[Timer:Dawn-1]").progress).toEqual({ value: 2 });
  });

  it("sets a bonus and adjusts a number, below zero too", () => {
    expect(applyTagUpdates(applyTagUpdates([], ["ATK +3"]), ["ATK +4"])).toEqual(["ATK +4"]);
    expect(applyTagUpdates(applyTagUpdates(["HP 1"], ["HP-2"]), ["HP-1"])).toEqual(["HP -2"]);
    expect(applyTagUpdates(["charges 2/5"], ["charges-1"])).toEqual(["charges 1/5"]);
    expect(applyTagUpdates(["status:alert, armed"], ["-status:armed"])).toEqual(["status:alert"]);
    expect(applyTagUpdates(["out:none"], ["out:+Qs"])).toEqual(["out:Qs"]);
  });

  it("starts over with a multi-line tag, on paper too, and changes nothing with a reference", () => {
    expect(
      find("pc:jonah", "[PC:Jonah|tired]", "[PC:Jonah\n  | trait: friendly\n  | HP 8\n]").tags,
    ).toEqual(["trait: friendly", "HP 8"]);
    expect(
      find("pc:jonah", "[PC:Jonah\n  trait: friendly | status: wounded\n  stat: HP 8]").tags,
    ).toEqual(["trait: friendly", "status: wounded", "stat: HP 8"]);
    expect(find("npc:jonah", "[N:Jonah|wary]", "[#N:Jonah|friendly]").tags).toEqual(["wary"]);
  });

  it("tells an event from a clock written as one", () => {
    const cast = buildCast(
      log("[E:Bridge Collapse] [E:Siege 1812]", "[E:Alarm 2/6]", "[#E:Alarm] [#E:Bridge Collapse]"),
    );
    expect(cast.map((c) => [c.kind, c.name, c.mentions.length])).toEqual([
      ["event", "Bridge Collapse", 2],
      ["event", "Siege 1812", 1],
      ["clock", "Alarm", 2],
    ]);
  });

  it("changes a thread's state", () => {
    const thread = find(
      "thread:escape",
      "[Thread:Escape|Abierto|urgente]",
      "[Thread:Escape|Open>Closed]",
    );
    expect(thread.tags).toEqual(["urgente", "Closed"]);
    expect(threadChange(thread, "Open")).toBe("Closed>Open");
    expect(threadChange(find("thread:x", "[Thread:X]"), "Closed")).toBe("Closed");
    expect(threadStatus(find("thread:x", "[Thread:X|Urgent]", "[Thread:X|Urgent>Closed]"))).toBe(
      "closed",
    );
  });

  it("reads a room's fields for what they are", () => {
    const room = find(
      "room:3",
      "[R:3|status:unexplored|exits:N R2, W R4|level:2]",
      "[R:3|status:cleared|armory]",
      "[R:3|status:+looted]",
      "[R:3|exits:+E R7 secret]",
      "[R:3|exits:-W R4]",
      "[R:3|-armory]",
      "[R:3|marked on the map]",
    );
    expect(room.tags).toEqual([
      "cleared, looted",
      "marked on the map",
      "level:2",
      "exits N R2, E R7 secret",
    ]);
    expect(
      find("room:1", "[R:1|estado:activa|salidas:Arriba R2]", "[R:1|estado:despejada]").tags,
    ).toEqual(["despejada", "salidas Arriba R2"]);
    // Writing exits again replaces them; the older form merges by direction.
    expect(find("room:5", "[R:5|exits:R4, R6]", "[R:5|exits:R7]").tags).toEqual(["exits R7"]);
    expect(find("room:3", "[R:3|cleared|library]").tags).toEqual(["cleared", "library"]);
  });

  it("keeps one position per foe, as a category or bare", () => {
    expect(find("foe:thug", "[F:Thug|HP 6|pos:Far]", "[F:Thug|pos:Close]").tags).toEqual([
      "HP 6",
      "pos:Close",
    ]);
    expect(find("foe:thug", "[F:Thug|Far]", "[F:Thug|pos:Close]").tags).toEqual(["pos:Close"]);
    expect(foeIsOut(find("foe:pirates", "[F:Pirates|×2]", "[F:Pirates|×0]"))).toBe(true);
  });

  it("counts items and decks", () => {
    const torch = find(
      "item:torch",
      "[Inv:Torch|×3|where:base camp]",
      "[Inv:Torch|×-1]",
      "[Inv:Torch|×2>1]",
      "[Inv:Torch|×+4|where:carried]",
    );
    expect([torch.progress, torch.tags]).toEqual([{ value: 5 }, ["where:carried"]]);
    const deck = find(
      "deck:main",
      "[Deck:Main|×52]",
      "[Deck:Main|×-1|out:+Qs]",
      "[Deck:Main|×-1|out:+M16]",
    );
    expect([deck.progress, deck.tags]).toEqual([{ value: 50 }, ["out:Qs, M16"]]);
  });

  it("keeps each purse apart, and takes in the money that had no owner", () => {
    const cast = buildCast(
      log(
        "[Wealth:Silver 9]",
        "[Wealth:Mara|Silver-6|Gold 1]",
        "[Wealth:Kael|Silver 4]",
        "[Wealth:Gold+2]",
        "[#Wealth:Mara]",
      ),
    );
    expect(cast.map((m) => [m.name, m.owner, m.progress?.value, m.mentions.length])).toEqual([
      ["Silver", "Mara", 3, 3],
      ["Gold", "Mara", 3, 3],
      ["Silver", "Kael", 4, 1],
    ]);
    const key = tagKey(splitTags("[Wealth:Mara|Silver-6]")[0].tag!);
    expect(findMember(cast, key)).toBe(cast[0]);
    expect(findMember(cast, "wealth:mara")).toBe(cast[0]);
    expect(formatReference(cast[2])).toBe("[#Wealth:Kael]");
    expect(tagsToPlainText("[Wealth:Mara|Silver-6] [Inv:Torch|×-1]")).toBe(
      "Mara Silver-6 Torch ×-1",
    );
  });

  it("writes quantities and what's typed as the spec does", () => {
    expect(formatQuantity("item", "Torch", "-1")).toBe("[Inv:Torch|×-1]");
    expect(formatQuantity("wealth", "Gold", "+15", "Kael")).toBe("[Wealth:Kael|Gold+15]");
    expect(formatQuantity("wealth", "Gold", "45", "Kael")).toBe("[Wealth:Kael|Gold 45]");
    expect(formatQuantity("wealth", "Gold", "+15")).toBe("[Wealth:Gold+15]");
    expect(combineSteps("[Inv:Torch|×-1]", "[Inv:Torch|×-1]")).toBe("[Inv:Torch|×-2]");
    expect(combineSteps("[Wealth:Kael|Gold+1]", "[Wealth:Kael|Gold-1]")).toBe("");
    expect(combineSteps("[Wealth:Kael|Gold+1]", "[Wealth:Mara|Gold+1]")).toBeNull();
    const words = {
      status: "status",
      exits: "exits",
      pos: "pos",
      owner: "owner",
      where: "where",
      out: "out",
    };
    expect(writeDetails("foe", ["HP 6", "Close"], words)).toEqual(["HP 6", "pos:Close"]);
    expect(writeDetails("room", ["cleared", "looted", "library"], words)).toEqual([
      "status:cleared, looted",
      "library",
    ]);
    expect(writeDetails("room", ["+looted"], words)).toEqual(["status:+looted"]);
    expect(writeDetails("npc", ["wary", ""], words)).toEqual(["wary"]);
  });

  it("renames owners, purses, points of view and who acts together", () => {
    const mara = { kind: "pc" as const, name: "Mara" };
    expect(
      renameInEntry(
        {
          kind: "note",
          text: "[PC:Mara|HP 2] [Wealth:Mara|Gold 3] [Inv:Rope|owner:Mara] [#Wealth:Mara]",
        },
        mara,
        "Lía",
      ),
    ).toBe("[PC:Lía|HP 2] [Wealth:Lía|Gold 3] [Inv:Rope|owner:Lía] [#Wealth:Lía]");
    expect(renameInEntry({ kind: "note", text: 'PC (Mara, whisper): "Hi"' }, mara, "Lía")).toBe(
      'PC (Lía, whisper): "Hi"',
    );
    expect(renameInEntry({ kind: "action", text: "(Odile > Mara) Boosts" }, mara, "Lía")).toBe(
      "(Odile > Lía) Boosts",
    );
    expect(renameInEntry({ kind: "scene", text: "T1-S1 *Inn* @(Mara)" }, mara, "Lía")).toBe(
      "T1-S1 *Inn* @(Lía)",
    );
    const gold = { kind: "wealth" as const, name: "Gold", owner: "Mara" };
    expect(
      renameInEntry(
        {
          kind: "note",
          text: "[Wealth:Mara|Gold-3|Silver 2] [Wealth:Kael|Gold 1] [Wealth:Gold 4]",
        },
        gold,
        "Crowns",
      ),
    ).toBe("[Wealth:Mara|Crowns-3|Silver 2] [Wealth:Kael|Gold 1] [Wealth:Crowns 4]");
    expect(
      renameInEntry(
        { kind: "note", text: "[F:Goblins×4]" },
        { kind: "foe", name: "Goblins" },
        "Orcs",
      ),
    ).toBe("[F:Orcs×4]");
  });
});

it("reads a range of slots as a name, not a change", () => {
  expect(splitTags("[Inv:Slot 6-10|empty]")[0].tag).toMatchObject({
    name: "Slot 6-10",
    details: ["empty"],
  });
});

it("a value wrapped over two lines is one value, and doesn't start its element over", () => {
  const cast = buildCast([
    entry("note", "[R:7|active|exits N:R2]", 1),
    entry("note", "[R:7|active|vaulted throne room,\nbones on the floor]", 2),
  ]);
  expect(cast[0].tags).toEqual(["active", "vaulted throne room, bones on the floor", "exits N:R2"]);
});

it("goes on with a clock written as an event, however it's named later", () => {
  const cast = buildCast([
    entry("note", "[E:Alarm 2/6]", 1),
    entry("note", "[E:Alarm] [E:Alarm 3]", 2),
  ]);
  expect(cast).toHaveLength(1);
  expect(cast[0]).toMatchObject({ kind: "clock", progress: { value: 3, max: 6 } });
});

describe("the add-ons' categories in either language", () => {
  const words = {
    status: "estado",
    exits: "salidas",
    pos: "posición",
    owner: "dueño",
    where: "lugar",
    out: "fuera",
  };
  it("shows them in the player's language, and leaves any other as written", () => {
    expect(showDetail("owner:guild", words)).toBe("dueño:guild");
    expect(showDetail("dueña:Nela", words)).toBe("dueño:Nela");
    expect(showDetail("pos:Cerca", words)).toBe("posición:Cerca");
    for (const detail of ["ánimo:alerta", "15 m", "constructor:x", "wary"])
      expect(showDetail(detail, words)).toBe(detail);
  });
  it("one replaces the other, whatever its language", () => {
    const cast = buildCast(
      [
        "[Inv:Cuerda|×1|owner:gremio|where:el carro]",
        "[Inv:Cuerda|lugar:el molino|dueño:Nela]",
      ].map((text, i) => ({
        id: String(i),
        adventureId: "a",
        timestamp: i,
        kind: "note" as const,
        text,
      })),
    );
    expect(cast[0].tags).toEqual(["dueño:Nela", "lugar:el molino"]);
  });
  it("a bare PC is the first one named", () => {
    const cast = buildCast(
      ["[PC:Mara]", "[N:Odile]", "[PC:Nela]"].map((text, i) => ({
        id: String(i),
        adventureId: "a",
        timestamp: i,
        kind: "note" as const,
        text,
      })),
    );
    expect(mainPc(cast)?.name).toBe("Mara");
  });
});
