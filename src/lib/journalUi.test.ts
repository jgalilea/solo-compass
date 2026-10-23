import { describe, expect, it } from "vitest";
import { buildEntryBlocks, groupBySession, splitRollText } from "./journalUi";
import type { JournalEntry, JournalLineKind } from "./lonelog";

let n = 0;
function entry(kind: JournalLineKind, text: string = kind, linkedRollId?: string): JournalEntry {
  n += 1;
  return { id: `e${n}`, adventureId: "a", timestamp: n, kind, text, linkedRollId };
}

const kinds = (blocks: JournalEntry[][]) => blocks.map((b) => b.map((e) => e.kind));

describe("groupBySession", () => {
  it("separa por sesiones y conserva lo anterior a la primera", () => {
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

  it("no crea un grupo vacío si el diario empieza con una sesión", () => {
    const groups = groupBySession([entry("session", "S1"), entry("note")]);
    expect(groups).toHaveLength(1);
  });
});

describe("buildEntryBlocks", () => {
  it("junta pregunta, tirada y consecuencias en una tarjeta", () => {
    const blocks = buildEntryBlocks([
      entry("question", "?", "r1"),
      entry("roll", "d", "r1"),
      entry("consequence"),
      entry("consequence"),
      entry("note"),
    ]);
    expect(kinds(blocks)).toEqual([["question", "roll", "consequence", "consequence"], ["note"]]);
  });

  it("agrupa por posición en diarios importados (sin enlaces)", () => {
    const blocks = buildEntryBlocks([entry("question"), entry("roll"), entry("consequence")]);
    expect(kinds(blocks)).toEqual([["question", "roll", "consequence"]]);
  });

  it("no mete en la pregunta una tirada enlazada a otra cosa", () => {
    const blocks = buildEntryBlocks([entry("question", "?", "r1"), entry("roll", "d", "r2")]);
    expect(kinds(blocks)).toEqual([["question"], ["roll"]]);
  });

  it("una tirada suelta también recoge sus consecuencias", () => {
    const blocks = buildEntryBlocks([entry("roll"), entry("consequence"), entry("action"), entry("consequence")]);
    expect(kinds(blocks)).toEqual([["roll", "consequence"], ["action"], ["consequence"]]);
  });
});

describe("splitRollText", () => {
  it("separa el detalle del resultado y reconoce la respuesta del oráculo", () => {
    expect(splitRollText("Recluse — blanco 5 / negro 2 -> Sí, y además.")).toEqual({
      detail: "Recluse — blanco 5 / negro 2",
      result: "Sí, y además.",
      answer: "si",
    });
    expect(splitRollText("Recluse — white 1 / black 1 -> Contradiction").answer).toBe("contradiccion");
    expect(splitRollText("Recluse — white 2 / black 4 -> No, but.").answer).toBe("no");
  });

  it("no confunde una tirada normal con el oráculo", () => {
    expect(splitRollText("d20 -> 14")).toEqual({ detail: "d20", result: "14", answer: undefined });
    expect(splitRollText("Sigilo -> Sí")).toMatchObject({ answer: undefined });
  });

  it("sin «->» todo es detalle", () => {
    expect(splitRollText("tiro dados")).toEqual({ detail: "tiro dados", result: null, answer: undefined });
  });
});
