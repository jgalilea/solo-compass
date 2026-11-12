import { describe, expect, it } from "vitest";
import { BLOCK_PAGE, buildEntryBlocks, composerShortcut, fitBlockWindow, filterGroups, groupBySession, splitRollSeries, splitRollText } from "./journalUi";
import { buildCast } from "./lonelogTags";
import type { JournalEntry, JournalLineKind } from "./lonelog";

let n = 0;
function entry(kind: JournalLineKind, text: string = kind, linkedRollId?: string): JournalEntry {
  n += 1;
  return { id: `e${n}`, adventureId: "a", timestamp: n, kind, text, linkedRollId };
}

const kinds = (blocks: JournalEntry[][]) => blocks.map((b) => b.map((e) => e.kind));

describe("groupBySession", () => {
  it("splits by session and keeps what comes before the first", () => {
    const groups = groupBySession([
      entry("note"),
      entry("session", "S1"),
      entry("action"),
      entry("session", "S2"),
    ]);
    expect(groups.map((g) => [g.sessionEntry?.text ?? null, g.items.length])).toEqual([
      [null, 1],
      ["S1", 1],
      ["S2", 0],
    ]);
  });

  it("doesn't create an empty group if the journal starts with a session", () => {
    const groups = groupBySession([entry("session", "S1"), entry("note")]);
    expect(groups).toHaveLength(1);
  });
});

describe("buildEntryBlocks", () => {
  it("puts question, roll and consequences together in one card", () => {
    const blocks = buildEntryBlocks([
      entry("question", "?", "r1"),
      entry("roll", "d", "r1"),
      entry("consequence"),
      entry("consequence"),
      entry("note"),
    ]);
    expect(kinds(blocks)).toEqual([["question", "roll", "consequence", "consequence"], ["note"]]);
  });

  it("groups by position in imported journals (no links)", () => {
    const blocks = buildEntryBlocks([entry("question"), entry("roll"), entry("consequence")]);
    expect(kinds(blocks)).toEqual([["question", "roll", "consequence"]]);
  });

  it("doesn't put a roll linked to something else into the question", () => {
    const blocks = buildEntryBlocks([entry("question", "?", "r1"), entry("roll", "d", "r2")]);
    expect(kinds(blocks)).toEqual([["question"], ["roll"]]);
  });

  it("a standalone roll also gathers its consequences", () => {
    const blocks = buildEntryBlocks([entry("roll"), entry("consequence"), entry("action"), entry("consequence")]);
    expect(kinds(blocks)).toEqual([["roll", "consequence"], ["action", "consequence"]]);
  });

  it("a consequence always joins the entry right before it", () => {
    const blocks = buildEntryBlocks([entry("note"), entry("consequence"), entry("consequence"), entry("action")]);
    expect(kinds(blocks)).toEqual([["note", "consequence", "consequence"], ["action"]]);
  });

  it("a consequence with nothing before it stands alone", () => {
    expect(kinds(buildEntryBlocks([entry("consequence")]))).toEqual([["consequence"]]);
  });
});

describe("fitBlockWindow", () => {
  const tail = { shown: BLOCK_PAGE, end: null };

  it("leaves the window alone when every target is drawn", () => {
    expect(fitBlockWindow(2000, tail, [])).toBe(tail);
    expect(fitBlockWindow(2000, tail, [1990])).toBe(tail);
  });

  it("draws from a target near the end to the end, as before", () => {
    expect(fitBlockWindow(2000, tail, [1900])).toEqual({ shown: 100, end: null });
  });

  it("draws only a stretch around a target far back", () => {
    expect(fitBlockWindow(2000, tail, [0])).toEqual({ shown: 41, end: 21 });
    expect(fitBlockWindow(2000, tail, [1000])).toEqual({ shown: 41, end: 1021 });
  });

  it("covers every target, and reaches the end when the last one is close to it", () => {
    expect(fitBlockWindow(2000, tail, [500, 520])).toEqual({ shown: 61, end: 541 });
    expect(fitBlockWindow(2000, tail, [10, 1995])).toEqual({ shown: 2010, end: null });
  });

  it("keeps a window far back while its targets are inside it", () => {
    const window = { shown: 41, end: 1021 };
    expect(fitBlockWindow(2000, window, [1000])).toBe(window);
    expect(fitBlockWindow(2000, window, [1500])).toEqual({ shown: 41, end: 1521 });
  });
});

describe("splitRollText", () => {
  it("splits the detail from the result and recognises the oracle answer", () => {
    expect(splitRollText("Recluse — blanco 5 / negro 2 -> Sí, y además.")).toEqual({
      detail: "Recluse — blanco 5 / negro 2",
      result: "Sí, y además.",
      answer: "si",
    });
    expect(splitRollText("Recluse — white 1 / black 1 -> Contradiction").answer).toBe("contradiccion");
    expect(splitRollText("Recluse — white 2 / black 4 -> No, but.").answer).toBe("no");
  });

  it("doesn't mistake a normal roll for the oracle", () => {
    expect(splitRollText("d20 -> 14")).toEqual({ detail: "d20", result: "14", answer: undefined });
    expect(splitRollText("Sigilo -> Sí")).toMatchObject({ answer: undefined });
  });

  it("without \"->\" everything is detail", () => {
    expect(splitRollText("tiro dados")).toEqual({ detail: "tiro dados", result: null, answer: undefined });
  });
});

describe("splitRollSeries", () => {
  it("reads dice formulas too", () => {
    expect(splitRollSeries("Ataque 2d20kh1 -> 17 (17, 5✗), 1d8+3 -> 7 (4 + 3), 5d6>=5 -> 2 (6✓ 5✓ 3 2 1)")).toEqual({
      label: "Ataque",
      rolls: [
        { label: "", die: "2d20kh1", result: "17 (17, 5✗)" },
        { label: "", die: "1d8+3", result: "7 (4 + 3)" },
        { label: "", die: "5d6>=5", result: "2 (6✓ 5✓ 3 2 1)" },
      ],
    });
  });

  it("reads the whole dice notation: arithmetic, groups and new marks", () => {
    expect(
      splitRollSeries("(1d6+2)*3 -> 18 ((4 + 2) × 3), {4d6,2d10}k1 -> 13 ({5+4+3+1, (7+4)✗}), d6r -> 4 (1→4), 4dF.1 -> 0 (0 0 0 0)"),
    ).toEqual({
      label: "",
      rolls: [
        { label: "", die: "(1d6+2)*3", result: "18 ((4 + 2) × 3)" },
        { label: "", die: "{4d6,2d10}k1", result: "13 ({5+4+3+1, (7+4)✗})" },
        { label: "", die: "d6r", result: "4 (1→4)" },
        { label: "", die: "4dF.1", result: "0 (0 0 0 0)" },
      ],
    });
  });

  it("keeps the description of a roll in the middle of the list", () => {
    expect(splitRollSeries("2d6 -> 7 (3+4), Mejor tirada {4d6,2d10}k1 -> 13 ({5+4+3+1, (7+4)✗}), Fuerza 4d6dl1 -> 14 (6+5+3, 2✗)")).toEqual({
      label: "",
      rolls: [
        { label: "", die: "2d6", result: "7 (3+4)" },
        { label: "Mejor tirada", die: "{4d6,2d10}k1", result: "13 ({5+4+3+1, (7+4)✗})" },
        { label: "Fuerza", die: "4d6dl1", result: "14 (6+5+3, 2✗)" },
      ],
    });
  });

  it("leaves table rolls alone: \"d66=25\" is a rolled value, not a formula", () => {
    expect(splitRollSeries("Acción d66=34 -> Atacar, Tema d66=25 -> Muerte")).toBeNull();
  });

  it("splits each die from its result, with or without commas", () => {
    const rolls = [
      { label: "", die: "d10", result: "9" },
      { label: "", die: "d10", result: "5" },
      { label: "", die: "d10", result: "2" },
    ];
    expect(splitRollSeries("d10 -> 9, d10 -> 5, d10 -> 2")).toEqual({ label: "", rolls });
    expect(splitRollSeries("d10 -> 9 d10 -> 5 d10 -> 2")).toEqual({ label: "", rolls });
  });

  it("keeps the leading text and the Fudge and d% results", () => {
    expect(splitRollSeries("Ataque al orco d20 -> 14, 4dF -> +1 (+ 0 − +), d% -> 73")).toEqual({
      label: "Ataque al orco",
      rolls: [
        { label: "", die: "d20", result: "14" },
        { label: "", die: "4dF", result: "+1 (+ 0 − +)" },
        { label: "", die: "d%", result: "73" },
      ],
    });
  });

  it("leaves a single roll, the oracle or free text as a normal roll", () => {
    expect(splitRollSeries("d20 -> 14")).toBeNull();
    expect(splitRollSeries("Recluse — blanco 5 / negro 2 -> Sí")).toBeNull();
    expect(splitRollSeries("Sigilo -> Sí, d6 -> 3")).toBeNull();
  });
});

describe("Lonelog 1.6 lines", () => {
  const e = (kind: JournalLineKind, text: string, i: number): JournalEntry => ({ id: `e${i}`, adventureId: "a", timestamp: i, kind, text });

  it("reads tbl:, gen: and a bare result, colouring an oracle's answer", () => {
    expect(splitRollText("tbl: Forest Encounter d6=5 -> Traveler")).toEqual({ detail: "Forest Encounter d6=5", result: "Traveler", answer: undefined });
    expect(splitRollText("gen: NPC -> Merchant / Secretive").detail).toBe("NPC");
    expect(splitRollText("-> Yes, but... (d6=4)")).toEqual({ detail: "", result: "Yes, but... (d6=4)", answer: "si" });
  });

  it("keeps a scene apart: a consequence right after it isn't joined to it", () => {
    const blocks = buildEntryBlocks([e("scene", "S1 *Mill*", 1), e("consequence", "I find the journal.", 2), e("question", "Locked?", 3), e("roll", "-> No", 4)]);
    expect(blocks.map((b) => b.map((x) => x.id))).toEqual([["e1"], ["e2"], ["e3", "e4"]]);
    const afterBlock = buildEntryBlocks([e("note", "[/RESOURCES]", 1), e("consequence", "I light a torch.", 2)]);
    expect(afterBlock.map((b) => b.map((x) => x.id))).toEqual([["e1"], ["e2"]]);
  });
});

describe("composerShortcut", () => {
  it("picks the entry type from the Lonelog typed at the start", () => {
    expect(composerShortcut("@ ")).toEqual({ mode: "action", text: "" });
    expect(composerShortcut("@ I force the door")).toEqual({ mode: "action", text: "I force the door" });
    expect(composerShortcut("@(Odile) Shuts it")).toEqual({ mode: "action", text: "(Odile) Shuts it" });
    expect(composerShortcut("=> ")).toEqual({ mode: "consequence", text: "" });
    expect(composerShortcut("PC: ")).toEqual({ mode: "dialogue", text: "", speaker: { pc: true } });
    expect(composerShortcut("N (Grey Cloak): Run")).toEqual({
      mode: "dialogue",
      text: "Run",
      speaker: { pc: false, name: "Grey Cloak" },
    });
    expect(composerShortcut("\\--- ")).toEqual({ mode: "excerpt", text: "" });
    expect(composerShortcut("\\--- Dear Jonah")).toEqual({ mode: "excerpt", text: "Dear Jonah" });
    expect(composerShortcut("=== ")).toEqual({ mode: "session", text: "" });
  });

  it("waits for the space and leaves everything else alone", () => {
    for (const text of ["@", "=>", "PC:", "N (Odile)", "\\---", "\\-- Dear", "===", "Email me @ home", "PCs: two", "", "? Is it?"]) {
      expect(composerShortcut(text)).toBeNull();
    }
  });
});

describe("filterGroups", () => {
  it("keeps what's about one element, with its block, by session", () => {
    const entries = [
      entry("session", "S1"),
      entry("note", "I reach the [L:Inn]."),
      entry("question", "Is [N:Odile|wary] awake?"),
      entry("roll", "Recluse — white 5 / black 2 -> Yes"),
      entry("consequence", "She dries tankards."),
      entry("note", 'N (Odile): "Maybe."'),
      entry("action", "(Odile) Shuts the door"),
      entry("session", "S2"),
      entry("note", "Nobody here."),
    ];
    const odile = buildCast(entries).find((c) => c.name === "Odile")!;
    const { groups, count } = filterGroups(groupBySession(entries), odile);
    expect(groups).toHaveLength(1);
    expect(groups[0].sessionEntry?.text).toBe("S1");
    // The question names her; its roll and consequence come along.
    expect(groups[0].items.map((e) => e.kind)).toEqual(["question", "roll", "consequence", "note", "action"]);
    expect(count).toBe(3);
  });
});
