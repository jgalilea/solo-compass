import { describe, expect, it } from "vitest";
import type { HistoryEntry } from "./history";
import type { JournalEntry } from "./lonelog";
import { activityLevel, computeAdventureStats, lastYearByMonth, longestStreak } from "./journalStats";

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

describe("play activity", () => {
  const at = (y: number, m: number, d: number, id = `w-${y}${m}${d}-${Math.random()}`): JournalEntry => ({
    id,
    adventureId: "a1",
    timestamp: new Date(y, m - 1, d, 20).getTime(),
    kind: "note",
    text: "x",
  });

  it("counts what was written each day, but not what was imported", () => {
    const stats = computeAdventureStats(
      [at(2026, 11, 8), at(2026, 11, 8), at(2026, 11, 9), at(2026, 11, 9, "1762717200000-3-abc123")],
      new Map(),
    );
    expect(stats.activity).toEqual({ "2026-11-08": 2, "2026-11-09": 1 });
  });

  it("finds the longest run of days in a row, across months", () => {
    expect(longestStreak([])).toBe(0);
    expect(longestStreak(["2026-01-05"])).toBe(1);
    expect(longestStreak(["2026-01-30", "2026-01-31", "2026-02-01", "2026-02-03", "2026-02-04"])).toBe(3);
    expect(longestStreak(["2026-03-28", "2026-03-29", "2026-03-30", "2026-03-29"])).toBe(3);
  });

  it("lays out the last twelve months, one row each, with every day", () => {
    const months = lastYearByMonth({ "2026-11-09": 3, "2025-12-31": 1 }, new Date(2026, 10, 9));
    expect(months.map((m) => `${m.year}-${m.month + 1}`)).toEqual([
      "2025-12", "2026-1", "2026-2", "2026-3", "2026-4", "2026-5", "2026-6", "2026-7", "2026-8", "2026-9", "2026-10", "2026-11",
    ]);
    expect(months[0].days.at(-1)).toEqual({ iso: "2025-12-31", day: 31, count: 1, future: false });
    expect(months[2].days).toHaveLength(28);
    expect(months[11].days[8]).toEqual({ iso: "2026-11-09", day: 9, count: 3, future: false });
    expect(months[11].days[9].future).toBe(true);
  });

  it("grades each day against the busiest one", () => {
    expect([0, 1, 5, 10, 20].map((n) => activityLevel(n, 20))).toEqual([0, 1, 1, 2, 4]);
    expect(activityLevel(1, 1)).toBe(4);
  });
});
