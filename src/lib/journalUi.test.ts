import { describe, expect, it } from "vitest";
import { buildEntryBlocks, groupBySession, splitRollSeries, splitRollText } from "./journalUi";
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
        { die: "2d20kh1", result: "17 (17, 5✗)" },
        { die: "1d8+3", result: "7 (4 + 3)" },
        { die: "5d6>=5", result: "2 (6✓ 5✓ 3 2 1)" },
      ],
    });
  });

  it("splits each die from its result, with or without commas", () => {
    const rolls = [
      { die: "d10", result: "9" },
      { die: "d10", result: "5" },
      { die: "d10", result: "2" },
    ];
    expect(splitRollSeries("d10 -> 9, d10 -> 5, d10 -> 2")).toEqual({ label: "", rolls });
    expect(splitRollSeries("d10 -> 9 d10 -> 5 d10 -> 2")).toEqual({ label: "", rolls });
  });

  it("keeps the leading text and the Fudge and d% results", () => {
    expect(splitRollSeries("Ataque al orco d20 -> 14, 4dF -> +1 (+ 0 − +), d% -> 73")).toEqual({
      label: "Ataque al orco",
      rolls: [
        { die: "d20", result: "14" },
        { die: "4dF", result: "+1 (+ 0 − +)" },
        { die: "d%", result: "73" },
      ],
    });
  });

  it("leaves a single roll, the oracle or free text as a normal roll", () => {
    expect(splitRollSeries("d20 -> 14")).toBeNull();
    expect(splitRollSeries("Recluse — blanco 5 / negro 2 -> Sí")).toBeNull();
    expect(splitRollSeries("Sigilo -> Sí, d6 -> 3")).toBeNull();
  });
});
