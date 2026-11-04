import { describe, expect, it } from "vitest";
import type { HistoryEntry } from "./history";
import type { JournalEntry } from "./lonelog";
import { computeAdventureStats } from "./journalStats";

let ts = Date.UTC(2026, 10, 1, 12);
function entry(kind: JournalEntry["kind"], text: string, linkedRollId?: string): JournalEntry {
  ts += 60_000;
  return { id: String(ts), adventureId: "a", kind, text, timestamp: ts, linkedRollId };
}

describe("adventure stats", () => {
  it("counts sessions, words, oracle answers, tables and own dice", () => {
    const oracleRoll = {
      kind: "oraculo",
      id: "h1",
      answer: "no",
      qualifier: "y",
    } as HistoryEntry;
    const entries = [
      entry("session", "Sesión 1"),
      entry("note", "Llego a la posada del cruce"),
      entry("question", "¿Hay alguien?"),
      entry("roll", "Recluse — blanco 5 / negro 2 -> Sí, pero."),
      entry("question", "¿Me ven?"),
      entry("roll", "Recluse — blanco 1 / negro 6 -> No", "h1"),
      entry("roll", "Evento aleatorio 1/4 -> Aparece un rastro."),
      entry("roll", "Evento aleatorio 3/3 -> Algo te sigue."),
      entry("roll", "Inspiración (Acción 3/4, Tema 2/5) -> Revelar · Secreto"),
      entry("roll", "Regatear d20 -> 7"),
      entry("roll", "d10 -> 9, d10 -> 5"),
      entry("session", "Sesión 2"),
    ];
    const stats = computeAdventureStats(entries, new Map([["h1", oracleRoll]]));
    expect(stats).toMatchObject({
      sessions: 2,
      entries: 10,
      words: 10,
      questions: 2,
      oracle: { total: 2, si: 1, no: 1, contradiccion: 0, and: 1, but: 1 },
      tableRolls: 3,
      topTable: { name: "Evento aleatorio", count: 2 },
      diceRolls: 2,
      daysPlayed: 1,
    });
  });

  it("an empty adventure has no dates", () => {
    expect(computeAdventureStats([], new Map())).toMatchObject({ entries: 0, first: null, topTable: null });
  });
});
