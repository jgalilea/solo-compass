import { afterEach, describe, expect, it, vi } from "vitest";
import { deckCards, drawCard } from "./cards";
import { BUILTIN_DICE } from "./dice";
import { readRolledDice, rollFormula, withEdge } from "./diceNotation";
import { throwOracle, oracleDicePlan, oracleLevels } from "./oracleEngines";
import { ORACLES } from "./oracles";
import { rollOracle } from "./oracle";
import { tableDice } from "./rolledDice";
import { diceValues, rollForTable, type DiceType } from "./tables";

/**
 * Nothing the app rolls can come up impossible: every way of rolling is
 * thrown many times (the same ones every run), and at both ends of chance.
 */

/** A repeatable Math.random, in [0, 1). */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const LOWEST = () => 0;
const HIGHEST = () => 1 - Number.EPSILON / 2;
const ROLLS = 3000;

const total = (line: string) => Number(line.split(" -> ")[1].split(" ")[0]);
const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);
const D66 = diceValues("d66");

/** Every total a formula gives, checked die by die as it's read back to draw it. */
function totals(formula: string, sides?: readonly number[]): number[] {
  const random = seeded(formula.length * 7919 + formula.charCodeAt(formula.length - 1));
  const seen = new Set<number>();
  // One that rerolls needs its luck to change.
  const ends = /[ru]/.test(formula) ? [] : [LOWEST, HIGHEST];
  for (let i = 0; i < ROLLS; i++) {
    const line = rollFormula(formula, ends[i] ?? random)!;
    expect(line, formula).not.toBeNull();
    seen.add(total(line));
    if (!sides) continue;
    const dice = readRolledDice(line, Infinity);
    if (!dice) throw new Error(`Not read back: ${line}`);
    for (const die of dice) {
      const faces = die.sides ? range(1, die.sides) : [-1, 0, 1];
      if (!sides.includes(die.sides) || !faces.includes(die.value))
        throw new Error(`Impossible die in ${line}`);
    }
  }
  return [...seen].sort((a, b) => a - b);
}

describe("single dice", () => {
  it.each([2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 20, 24, 30, 50, 100])(
    "a d%i gives each of its faces and nothing else",
    (n) => {
      expect(totals(`d${n}`, [n])).toEqual(range(1, n));
      expect(totals(`1d${n}`, [n])).toEqual(range(1, n));
      expect(totals(`d(${n})`, [n])).toEqual(range(1, n));
    },
  );

  it("every button's die", () => {
    const expected: Record<string, number[]> = { "d%": range(1, 100), "4dF": range(-4, 4) };
    for (const die of BUILTIN_DICE)
      expect(
        totals(die, [die === "4dF" ? 0 : die === "d%" ? 100 : Number(die.slice(1))]),
        die,
      ).toEqual(expected[die] ?? range(1, Number(die.slice(1))));
  });

  it("Fudge dice, both kinds", () => {
    for (const f of ["dF", "dF.1", "dF.2"]) expect(totals(f), f).toEqual([-1, 0, 1]);
  });

  it("a d66 is only ever two d6, and a d(66) any of its 66 faces", () => {
    expect(D66).toHaveLength(36);
    expect(totals("d66", [6])).toEqual(D66);
    expect(totals("1d66", [6])).toEqual(D66);
    expect(totals("D66", [6])).toEqual(D66);
    expect(totals("d(66)", [66])).toEqual(range(1, 66));
  });
});

describe("formulas", () => {
  it("a d66 stays one in any formula", () => {
    for (const edge of ["advantage", "disadvantage"] as const)
      expect(totals(withEdge("d66", edge), [6]).every((n) => D66.includes(n))).toBe(true);
    expect(totals("d66+100", [6])).toEqual(D66.map((n) => n + 100));
    for (const f of ["2d66kh1", "3d66kl1", "d66r<20", "d66ro", "{d66,d66}kh1"])
      expect(
        totals(f, [6]).every((n) => D66.includes(n)),
        f,
      ).toBe(true);
    expect(totals("d66r<20", [6])[0]).toBe(21);
    const pair = totals("2d66", [6]);
    expect([pair[0], pair.at(-1)]).toEqual([22, 132]);
  });

  // [formula, lowest, highest, its dice]
  it.each<[string, number, number, number[]]>([
    ["2d6", 2, 12, [6]],
    ["3d6+2", 5, 20, [6]],
    ["2d6-3", -1, 9, [6]],
    ["1d8+1d6", 2, 14, [8, 6]],
    ["4d6kh3", 3, 18, [6]],
    ["4d6dl1", 3, 18, [6]],
    ["2d20kh1", 1, 20, [20]],
    ["2d20kl1", 1, 20, [20]],
    ["5d6>=5", 0, 5, [6]],
    ["4d6>4f<3", -4, 4, [6]],
    ["4dF", -4, 4, [0]],
    ["4dF+2", -2, 6, [0]],
    ["2d10u", 3, 19, [10]],
    ["d6r", 2, 6, [6]],
    ["2d20cs>=19", 2, 40, [20]],
    ["4d6sd", 4, 24, [6]],
    ["1d6*10", 10, 60, [6]],
    ["(1d6+2)*3", 9, 24, [6]],
    ["{4d6,2d10}k1", 4, 24, [6, 10]],
    ["(4-2)d10", 2, 20, [10]],
    ["3d(2*6)", 3, 36, [12]],
  ])("%s stays between %i and %i", (formula, low, high, sides) => {
    const all = totals(formula, sides);
    expect(all[0]).toBeGreaterThanOrEqual(low);
    expect(all.at(-1)).toBeLessThanOrEqual(high);
    expect(all.every((n) => Number.isInteger(n))).toBe(true);
  });

  it("exploding, minimum and maximum dice never go below what they can", () => {
    const random = seeded(1);
    const lowest = (f: string) =>
      Math.min(...Array.from({ length: ROLLS }, () => total(rollFormula(f, random)!)));
    expect(lowest("3d6!")).toBe(3);
    expect(lowest("d6!!")).toBe(1);
    expect(lowest("d6!p")).toBe(1);
    expect(lowest("2d6min3")).toBe(6);
    const all = Array.from({ length: ROLLS }, () => total(rollFormula("2d6max4", random)!));
    expect(Math.max(...all)).toBe(8);
    // A die that explodes on its 6 can't end exactly on it.
    expect(
      Array.from({ length: ROLLS }, () => total(rollFormula("d6!!", random)!)).some(
        (n) => n % 6 === 0,
      ),
    ).toBe(false);
  });

  it("doesn't favour any face", () => {
    for (const [formula, faces] of [
      ["d6", range(1, 6)],
      ["d20", range(1, 20)],
      ["d66", D66],
      ["d%", range(1, 100)],
    ] as const) {
      const random = seeded(99);
      const counts = new Map<number, number>();
      const n = faces.length * 1000;
      for (let i = 0; i < n; i++) {
        const t = total(rollFormula(formula, random)!);
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
      for (const face of faces)
        expect(Math.abs((counts.get(face) ?? 0) - 1000), `${formula} ${face}`).toBeLessThan(160);
    }
  });

  it("refuses dice that can't exist", () => {
    for (const f of ["d0", "0d6", "d(0)", "d(1-2)", "d(5/2)", "-1d6x", "d", "2d", "d6.5"])
      expect(rollFormula(f), f).toBeNull();
  });

  it("doesn't draw a die that says something it doesn't have", () => {
    for (const line of [
      "d6 -> 7",
      "d6 -> 0",
      "d20 -> 21",
      "2d6 -> 9 (2+7)",
      "d66 -> 70",
      "d66 -> 0",
      "d(66) -> 67",
      "d% -> 101",
    ])
      expect(readRolledDice(line), line).toBeNull();
  });
});

describe("tables, oracles and cards", () => {
  afterEach(() => vi.restoreAllMocks());
  const withRandom = (random: () => number, run: () => void) => {
    vi.spyOn(Math, "random").mockImplementation(random);
    run();
    vi.restoreAllMocks();
  };

  it.each<DiceType>(["d4", "d6", "d8", "d10", "d12", "d20", "d66", "d100", "d300"])(
    "a table's %s gives each of its values and nothing else",
    (die) => {
      const seen = new Set<number>();
      const roll = () => {
        const { rolls, total: value } = rollForTable(die);
        seen.add(value);
        expect(tableDice(die, value)!.map((d) => d.value)).toEqual(rolls);
      };
      withRandom(LOWEST, roll);
      withRandom(HIGHEST, roll);
      withRandom(seeded(5), () => {
        for (let i = 0; i < ROLLS * 2; i++) roll();
      });
      expect([...seen].sort((a, b) => a - b)).toEqual(diceValues(die));
    },
  );

  it("no table die reads an impossible value", () => {
    for (const bad of [0, 7, 10, 17, 20, 37, 60, 67, 99])
      expect(tableDice("d66", bad), String(bad)).toBeNull();
    expect(tableDice("d6", 7)).toBeNull();
    expect(tableDice("d6", 0)).toBeNull();
  });

  it("every oracle throws its own dice, at every likelihood", () => {
    const throws = [LOWEST, HIGHEST, seeded(11)];
    for (const { id } of ORACLES) {
      for (const level of oracleLevels(id)) {
        const plan = oracleDicePlan(id, level);
        for (const random of throws) {
          withRandom(random, () => {
            for (let i = 0; i < 300; i++) {
              const { dice } = throwOracle(id, level);
              expect(
                dice.map(({ role, sides, rolls }) => ({ role, sides, count: rolls.length })),
              ).toEqual(plan);
              for (const { rolls, sides, kept } of dice) {
                expect(rolls.every((v) => Number.isInteger(v) && v >= 1 && v <= sides)).toBe(true);
                expect(rolls).toContain(kept);
              }
            }
          });
        }
      }
    }
    withRandom(seeded(3), () => {
      for (let i = 0; i < 300; i++)
        for (const g of [rollOracle("?", "probable").white, rollOracle("?", "probable").black])
          expect(g.rolls.every((v) => v >= 1 && v <= 6)).toBe(true);
    });
  });

  it("only draws cards of the deck, none twice", () => {
    for (const deck of ["poker", "tarot"] as const) {
      const options = { jokers: true, reversed: false, majorOnly: false };
      const all = deckCards(deck, options);
      for (const random of [LOWEST, HIGHEST, seeded(8)]) {
        const drawn: string[] = [];
        for (
          let card = drawCard(deck, options, drawn, random);
          card;
          card = drawCard(deck, options, drawn, random)
        )
          drawn.push(card);
        expect([...drawn].sort()).toEqual([...all].sort());
      }
    }
  });
});
