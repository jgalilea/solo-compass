import { describe, expect, it } from "vitest";
import { importedRolls, searchImportedRolls } from "./importedRolls";
import { parseMarkdownToEntries } from "./lonelog";

describe("imported rolls", () => {
  const md = [
    "=== Sesión 1 ===",
    "[Date] 2025-09-03",
    "? ¿Hay guardias?",
    "d: Recluse — blanco 5 / negro 2 -> Sí",
    "@ Ataco",
    "d: d20 -> 14",
    "tbl: Tema d66=25 -> Fuego",
  ].join("\n");
  const entries = parseMarkdownToEntries(md, "a", 1_762_717_200_000);

  it("are read from the journal, the latest first, with their question and day", () => {
    const rolls = importedRolls(entries, "a");
    expect(rolls.map((r) => [r.kind, r.question])).toEqual([
      ["tabla", null],
      ["dados", null],
      ["oraculo", "¿Hay guardias?"],
    ]);
    expect(rolls[0]).toMatchObject({ sessionTitle: "Sesión 1", day: "2025-09-03" });
    expect(searchImportedRolls(rolls, "guardias").map((r) => r.kind)).toEqual(["oraculo"]);
    expect(importedRolls(entries, "b")).toEqual([]);
  });

  it("leave out what was rolled here: the history has it", () => {
    const own = entries.map((e, i) => ({ ...e, id: `own-id-${i}` }));
    expect(importedRolls(own, "a")).toEqual([]);
    expect(importedRolls(entries.map((e) => ({ ...e, linkedRollId: "h" })), "a")).toEqual([]);
  });
});
