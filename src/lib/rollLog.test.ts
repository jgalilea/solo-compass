import { describe, expect, it } from "vitest";
import { rollAgain } from "./diceNotation";
import { createDiceRollEntry, normalizeHistoryEntry, tableRollDie, type HistoryEntry, type TableRollEntry } from "./history";
import { findTableDice } from "./historyDice";
import { en } from "./i18n/locales/en";
import { es } from "./i18n/locales/es";
import type { OracleRoll } from "./oracle";
import { rollOracleWith } from "./oracleEngines";
import { readTableDice, tableDice } from "./rolledDice";
import { rollJournalLines, searchHistory } from "./rollLog";

const table = (over: Partial<TableRollEntry> = {}): TableRollEntry => ({
  kind: "tabla", id: "t", timestamp: 1, tableId: "x", tableName: "Ironsworn: Action", rolls: [42], total: 42, dice: "d100", resultText: "Bolster", favorite: false, ...over,
});

describe("a table roll's dice", () => {
  it("are read from the journal's text, a d66 as two d6", () => {
    expect(readTableDice("Ironsworn: Action d100=42")).toEqual([[{ sides: 100, value: 42 }]]);
    expect(readTableDice("Action d66=34, Theme d66=25")).toEqual([
      [{ sides: 6, value: 3 }, { sides: 6, value: 4 }],
      [{ sides: 6, value: 2 }, { sides: 6, value: 5 }],
    ]);
    for (const text of ["Action d66=70", "Loot 2d6=7", "Loot d6=9", "Loot d6=3, 2d6=7", "Loot", "Attack d20+5", "draw=4d"]) {
      expect(readTableDice(text), text).toBeNull();
    }
    expect(tableDice("d66", 66)).toHaveLength(2);
    expect(tableDice("d66", 60)).toBeNull();
  });

  it("are kept in the history; of an older roll, only a d66 is known", () => {
    expect(tableRollDie(table())).toBe("d100");
    expect(tableRollDie(table({ dice: undefined }))).toBeNull();
    expect(tableRollDie(table({ dice: undefined, rolls: [3, 4], total: 34 }))).toBe("d66");
    expect(normalizeHistoryEntry(table())).toEqual(table());
    expect(normalizeHistoryEntry({ ...table(), dice: "2d6" })).not.toHaveProperty("dice");
  });
});

describe("older table rolls", () => {
  it("get their die from their dice, their journal entry or their table", async () => {
    const old = (id: string, over: Partial<TableRollEntry>) => table({ id, dice: undefined, ...over });
    const rolls = [
      old("pair", { rolls: [3, 4], total: 34 }),
      old("logged", { tableName: "Mine", tableId: "gone", total: 7, rolls: [7] }),
      old("gen", { tableName: "Action", tableId: "gone", total: 12, rolls: [12] }),
      old("builtin", { tableId: "loner-who", total: 5, rolls: [5] }),
      old("unfit", { tableId: "loner-who", total: 9, rolls: [9] }),
      old("gone", { tableId: "gone", total: 9, rolls: [9] }),
    ];
    const entry = (linkedRollId: string, text: string) => ({ id: linkedRollId, adventureId: "a", timestamp: 1, kind: "roll" as const, text, linkedRollId });
    const journal = [entry("logged", "tbl: Mine d8=7 -> x"), entry("gen", "gen: G (Action d20=12, Theme d66=25) -> x · y")];
    expect(Object.fromEntries(await findTableDice(en, rolls, journal))).toEqual({ pair: "d66", logged: "d8", gen: "d20", builtin: "d6" });
  });
});

describe("rollJournalLines", () => {
  it("writes a history roll as it would have been logged", () => {
    expect(rollJournalLines(en, table())).toEqual([{ kind: "roll", text: "tbl: Ironsworn: Action d100=42 -> Bolster" }]);
    expect(rollJournalLines(en, table({ dice: undefined }))[0].text).toBe("tbl: Ironsworn: Action 42 -> Bolster");
    expect(rollJournalLines(es, createDiceRollEntry("Ataque d20+5 -> 19 (14 + 5)"))).toEqual([{ kind: "roll", text: "Ataque d20+5 -> 19 (14 + 5)" }]);
    const roll: OracleRoll = rollOracleWith("recluse", "¿Está abierta?", "equilibrado", 0);
    const lines = rollJournalLines(es, roll);
    expect(lines[0]).toEqual({ kind: "question", text: "¿Está abierta?" });
    expect(lines[1].text).toMatch(/^Recluse — blanco \d \/ negro \d -> /);
  });
});

describe("searchHistory", () => {
  it("finds rolls by any of their words, accents ignored", () => {
    const entries: HistoryEntry[] = [table(), createDiceRollEntry("Percepción d20 -> 14"), rollOracleWith("recluse", "¿Está abierta la puerta?", "equilibrado", 0)];
    expect(searchHistory(es, entries, "percepcion")).toEqual([entries[1]]);
    expect(searchHistory(es, entries, "bolster action")).toEqual([entries[0]]);
    expect(searchHistory(es, entries, "PUERTA")).toEqual([entries[2]]);
    expect(searchHistory(es, entries, " ")).toHaveLength(3);
    expect(searchHistory(es, entries, "dragón")).toEqual([]);
  });
});

describe("rollAgain", () => {
  it("makes the same roll, with what it was for", () => {
    expect(rollAgain("Dark attack d20+5 -> 19 (14 + 5)", () => 0)).toBe("Dark attack d20+5 -> 6 (1 + 5)");
    expect(rollAgain("d6 -> 4", () => 0)).toBe("d6 -> 1");
    expect(rollAgain("4d6dl1 -> 14 (6+5+3, 2✗)", () => 0.99)).toMatch(/^4d6dl1 -> 18/);
    expect(rollAgain("draw=Qs -> Queen of Spades")).toBeNull();
  });
});
