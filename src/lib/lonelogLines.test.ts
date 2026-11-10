import { describe, expect, it } from "vitest";
import { formatDialogue, formatExcerpt, formatScene, nextSceneId, noteForm, parseScene, splitActor, splitRollSymbol } from "./lonelogLines";

describe("splitRollSymbol", () => {
  it("tells mechanics, tables, generators and bare results apart", () => {
    expect(splitRollSymbol("d20+5=17 vs DC 15 -> Success")).toEqual({ symbol: "d", text: "d20+5=17 vs DC 15 -> Success" });
    expect(splitRollSymbol("tbl: Forest Encounter d6=5 -> Traveler")).toEqual({ symbol: "tbl", text: "Forest Encounter d6=5 -> Traveler" });
    expect(splitRollSymbol("gen: NPC -> Merchant / Secretive")).toEqual({ symbol: "gen", text: "NPC -> Merchant / Secretive" });
    expect(splitRollSymbol("-> Yes, but... (d6=4)")).toEqual({ symbol: "result", text: "-> Yes, but... (d6=4)" });
  });
});

describe("scenes", () => {
  it("reads every kind of scene marker in the spec", () => {
    expect(parseScene("S1 *School library after hours*")).toEqual({ id: "S1", context: "School library after hours", combat: false });
    expect(parseScene("S5a *Flashback: Father's workshop*").id).toBe("S5a");
    expect(parseScene("S7.2 *Day 3: Mountains*").id).toBe("S7.2");
    expect(parseScene("T1+T2-S5 *Reunited*").id).toBe("T1+T2-S5");
    expect(parseScene("S5 [R:4|active] *Storage room*")).toEqual({ id: "S5", context: "[R:4|active] Storage room", combat: false });
    expect(parseScene("S9 *Dockside ambush* [COMBAT]")).toEqual({ id: "S9", context: "Dockside ambush", combat: true });
    expect(parseScene("S1")).toEqual({ id: "S1", context: "", combat: false });
  });

  it("numbers a new scene after the highest one, suffixes and threads included", () => {
    expect(nextSceneId([])).toBe("S1");
    expect(
      nextSceneId([
        { kind: "scene", text: "S3 *a*" },
        { kind: "scene", text: "S3a *flashback*" },
        { kind: "scene", text: "T2-S7 *b*" },
        { kind: "note", text: "S99 is not a scene here" },
      ]),
    ).toBe("S8");
  });

  it("writes the context in italics", () => {
    expect(formatScene("S2", " Town square, *midnight* ")).toBe("S2 *Town square, midnight*");
    expect(formatScene("S2", "")).toBe("S2");
  });
});

describe("splitActor", () => {
  it("finds who acts, if it isn't the PC", () => {
    expect(splitActor("(Jonah) Keeps watch")).toEqual({ actor: "Jonah", text: "Keeps watch" });
    expect(splitActor("(Elara > Jonah) Boosts the climb").actor).toBe("Elara > Jonah");
    expect(splitActor("Pick the lock")).toEqual({ actor: null, text: "Pick the lock" });
  });
});

describe("noteForm", () => {
  it("recognises narrative blocks, dialogue and meta notes", () => {
    expect(noteForm("\\---\nThe diary reads:\n\"Day 47…\"\n---\\")).toEqual({ form: "excerpt", text: 'The diary reads:\n"Day 47…"' });
    expect(noteForm('N (Guard): "Who\'s there?"')).toEqual({ form: "dialogue", speaker: "Guard", pc: false, text: '"Who\'s there?"' });
    expect(noteForm('PC: "Stay calm."')).toEqual({ form: "dialogue", speaker: "PC", pc: true, text: '"Stay calm."' });
    expect(noteForm("(note: testing a house rule)")).toEqual({ form: "meta", label: "note", text: "testing a house rule" });
    expect(noteForm("(This happened before the campaign)")).toEqual({ form: "meta", label: null, text: "This happened before the campaign" });
  });

  it("recognises the add-ons' blocks and combat rounds", () => {
    expect(noteForm("[COMBAT]")).toEqual({ form: "block", name: "combat", closing: false });
    expect(noteForm("[/COMBAT]")).toEqual({ form: "block", name: "combat", closing: true });
    expect(noteForm("[DUNGEON STATUS]")).toEqual({ form: "block", name: "dungeon", closing: false });
    expect(noteForm("--- END RESOURCES ---")).toEqual({ form: "block", name: "resources", closing: true });
    expect(noteForm("Rd2")).toEqual({ form: "round", round: "Rd2", text: "" });
    expect(noteForm("Rd3 Roster: [F:Captain|HP 4]")).toEqual({ form: "round", round: "Rd3", text: "Roster: [F:Captain|HP 4]" });
  });

  it("leaves everything else as prose", () => {
    expect(noteForm("The rain keeps falling.")).toEqual({ form: "plain" });
    expect(noteForm("(a) and (b)")).toEqual({ form: "plain" });
    expect(noteForm("PCs gather around")).toEqual({ form: "plain" });
  });
});

describe("formatDialogue", () => {
  it("writes what someone says as Lonelog dialogue", () => {
    expect(formatDialogue({ pc: true }, " Who's there? ")).toBe('PC: "Who\'s there?"');
    expect(formatDialogue({ pc: false, name: "Odile" }, "Maybe.")).toBe('N (Odile): "Maybe."');
    // Its own quotes are kept, and a name can't break the brackets.
    expect(formatDialogue({ pc: false, name: "Odile (innkeeper)" }, "«Quizá»")).toBe("N (Odile innkeeper): «Quizá»");
  });

  it("is read back as dialogue", () => {
    expect(noteForm(formatDialogue({ pc: false, name: "Grey Cloak" }, "Run.\nNow."))).toEqual({
      form: "dialogue",
      speaker: "Grey Cloak",
      pc: false,
      text: '"Run.\nNow."',
    });
    expect(noteForm(formatDialogue({ pc: true }, "Wait")).form).toBe("dialogue");
  });
});

describe("formatExcerpt", () => {
  it("wraps in-world text in a narrative block and reads it back", () => {
    const block = formatExcerpt("  Dear Jonah,\nthe stag must not reach the guild.\n");
    expect(block).toBe("\\---\nDear Jonah,\nthe stag must not reach the guild.\n---\\");
    expect(noteForm(block)).toEqual({ form: "excerpt", text: "Dear Jonah,\nthe stag must not reach the guild." });
  });
});
