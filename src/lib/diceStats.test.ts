import { describe, expect, it } from "vitest";
import { computeDiceStats as compute } from "./diceStats";
import type { JournalEntry } from "./lonelog";

let time = 0;
const entry = (kind: JournalEntry["kind"], text: string): JournalEntry => ({ id: String(++time), adventureId: "a", timestamp: time, kind, text });
const computeDiceStats = (rolls: string[]) => compute(rolls.map((text) => entry("roll", text)));

const counts = (text: string[], sides: number) =>
  computeDiceStats(text).dice.find((d) => d.sides === sides)?.bars.map((b) => b.count);

describe("dice stats", () => {
  it("counts every die thrown, dropped and rerolled ones too", () => {
    const stats = computeDiceStats(["Attack 2d20kh1 -> 12 (12, 5✗)", "d6 -> 4, 4d6r<3 -> 13 (3+2→4+3+3)"]);
    expect(stats.total).toBe(8);
    expect(stats.dice.map((d) => [d.sides, d.count])).toEqual([[6, 6], [20, 2]]);
    expect(stats.dice[1]).toMatchObject({ average: 8.5, expected: 10.5 });
    expect(counts(["d6 -> 4, 4d6r<3 -> 13 (3+2→4+3+3)"], 6)).toEqual([0, 1, 3, 2, 0, 0]);
  });

  it("takes a d66 as two d6, a Fudge die as its three faces and a d100 in tens", () => {
    expect(counts(["d66 -> 26"], 6)).toEqual([0, 1, 0, 0, 0, 1]);
    expect(counts(["4dF -> 0 (− 0 + 0)"], 0)).toEqual([1, 2, 1]);
    expect(counts(["d100 -> 100", "d% -> 1", "d% -> 10"], 100)).toEqual([2, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
  });

  it("leaves out what isn't a die of one's own, or is written changed", () => {
    const texts = [
      "Recluse — blanco 3 / negro 5 -> No",
      "tbl: Theme d66=25 -> Fire",
      "draw=Qs -> Queen of Spades",
      "4d6min3 -> 15 (3↑+4+3↑+5)",
      "6d6!p -> 26 (2+5+6!+1+3+4+5)",
      "d20 -> Success, barely",
      "d6 -> 9",
    ];
    expect(computeDiceStats(texts)).toMatchObject({ total: 0, dice: [], trend: null });
  });

  it("says dice run high or low only past what chance usually gives", () => {
    const rolls = (n: number, value: (i: number) => number) => Array.from({ length: n }, (_, i) => `d6 -> ${value(i)}`);
    expect(computeDiceStats(rolls(19, () => 6)).trend).toBeNull();
    expect(computeDiceStats(rolls(24, () => 6)).trend).toBe("high");
    expect(computeDiceStats(rolls(24, () => 1)).trend).toBe("low");
    expect(computeDiceStats(rolls(24, (i) => (i % 6) + 1)).trend).toBe("normal");
  });

  it("counts big handfuls too", () => {
    const faces = Array.from({ length: 30 }, (_, i) => (i % 6) + 1);
    expect(computeDiceStats([`30d6 -> 105 (${faces.join("+")})`]).total).toBe(30);
  });

  it("finds the runs, the extremes and the face that comes up most", () => {
    const stats = computeDiceStats(["d20 -> 20", "d6 -> 5", "d20 -> 11", "d6 -> 1", "d6 -> 2", "d20 -> 17", "d20 -> 17", "d20 -> 17, d20 -> 17"]);
    expect(stats).toMatchObject({ highRun: 4, lowRun: 2, top: 1, bottom: 1, favourite: { sides: 20, face: 17, count: 4 } });
    expect(stats.extremes).toBeCloseTo(6 / 20 + 3 / 6);
    // One right on the average breaks both runs.
    expect(computeDiceStats(["3d6 -> 6 (1+1+4)", "d5 -> 3", "d6 -> 6"])).toMatchObject({ highRun: 1, lowRun: 2 });
  });

  it("compares the sessions with enough dice", () => {
    const session = (title: string, value: number, n = 6) => [entry("session", title), ...Array.from({ length: n }, () => entry("roll", `d6 -> ${value}`))];
    expect(compute([...session("Uno", 2), ...session("Dos", 6), ...session("Tres", 1, 2)]).sessions).toMatchObject({
      best: { title: "Dos" },
      worst: { title: "Uno" },
    });
    expect(compute(session("Uno", 2)).sessions).toBeNull();
  });
});

describe("across adventures", () => {
  it("compares adventures, not sessions, even with the same name", () => {
    const roll = (adventureId: string, text: string): JournalEntry => ({ ...entry("roll", text), adventureId });
    const all = [roll("a", "6d6 -> 36 (6+6+6+6+6+6)"), entry("session", "S"), roll("b", "6d6 -> 6 (1+1+1+1+1+1)")];
    const { sessions, total } = compute(all, () => "Same");
    expect(total).toBe(12);
    expect(sessions!.best.score).toBeGreaterThan(0);
    expect(sessions!.worst.score).toBeLessThan(0);
  });

  it("counts a d66 as two d6 and a d(66) as itself", () => {
    expect(computeDiceStats(["d66 -> 34", "d(66) -> 38"]).dice.map((d) => [d.sides, d.count])).toEqual([[6, 2], [66, 1]]);
  });
});
