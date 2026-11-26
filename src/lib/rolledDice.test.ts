import { describe, expect, it } from "vitest";
import { readRolledDice, rollFormula } from "./diceNotation";
import { formatOracleDice } from "./i18n/answerText";
import { en } from "./i18n/locales/en";
import { es } from "./i18n/locales/es";
import { oracleDice } from "./oracle";
import { ORACLES } from "./oracles";
import { oracleLevels, rollOracleWith } from "./oracleEngines";
import { MAX_DRAWN_DICE, readOracleDice, rolledTotal, rolledWhat, fixOldOracle } from "./rolledDice";

const d6 = (value: number, mark?: string) => ({ sides: 6, value, ...(mark ? { mark } : {}) });

describe("the dice of a roll, read from its text", () => {
  it("have their faces: one d100, Fudge dice, a mix with a number", () => {
    expect(readRolledDice("d20 -> 14")).toEqual([{ sides: 20, value: 14 }]);
    expect(readRolledDice("d% -> 73")).toEqual([{ sides: 100, value: 73 }]);
    expect(readRolledDice("4dF -> +1 (+ 0 + −)")).toEqual([1, 0, 1, -1].map((value) => ({ sides: 0, value })));
    expect(readRolledDice("Dark omen 1d8+1d6-2 -> 7 (5 + 4 − 2)")).toEqual([{ sides: 8, value: 5 }, d6(4)]);
    expect(readRolledDice("2d6+3 -> 9 (4+2 + 3)")).toEqual([d6(4), d6(2)]);
    expect(readRolledDice("(2d6+1)*2 -> 14 ((4+2 + 1) × 2)")).toEqual([d6(4), d6(2)]);
  });

  it("mark what's left out, successes, failures and criticals", () => {
    expect(readRolledDice("4d6dl1 -> 14 (6+5+3, 2✗)")).toEqual([d6(6), d6(5), d6(3), d6(2, "out")]);
    expect(readRolledDice("1d6r -> 4 (1→4)")).toEqual([d6(1, "out"), d6(4)]);
    expect(readRolledDice("3d6>=5f=1 -> 0 (6✓ 1✗ 3)")).toEqual([d6(6, "hit"), d6(1, "miss"), d6(3)]);
    expect(readRolledDice("2d20cscf -> 21 (20▲+1▼)")?.map((d) => d.mark)).toEqual(["high", "low"]);
    expect(readRolledDice("{2d6+3,2d6+3}kh1 -> 14 ({(1+1 + 3)✗, 6+5 + 3})")).toEqual([d6(1, "out"), d6(1, "out"), d6(6), d6(5)]);
    expect(readRolledDice("{4d6dl1,1d8}kh1 -> 14 ({6+5+3, 2✗, 4✗})")).toEqual([
      d6(6), d6(5), d6(3), d6(2, "out"), { sides: 8, value: 4, mark: "out" },
    ]);
  });

  it("are found in whatever the app writes", () => {
    const formulas: [string, number][] = [
      ["d4", 1], ["3d8", 3], ["d%", 1], ["4dF", 4], ["4dF+2", 4], ["dF-1", 1], ["2d6+1d4+3", 3], ["4d6kh3", 4], ["2d20kl1", 2],
      ["4d6dl1+2", 4], ["5d6>=5", 5], ["5d6>4f<3", 5], ["3d6>=5+1", 3], ["4d6s", 4], ["3d6min3", 3], ["2d10max4", 2],
      ["(1d6+2)*3", 1], ["2d6*2", 2], ["-1d6+10", 1], ["{4d6,2d10}k1", 6], ["{d20,d20}kh1", 2], ["{3d6+2d8}k2", 5], ["{1d6,1d6,1d6}>=4", 3],
      ["(4-2)d10", 2], ["3d(2*6)", 3], ["{2d6+3,2d6+3}kl1", 4], ["2d20cscf", 2], ["{1d6,2d6}>=4f<3", 3],
      ["{4dF+1,4dF+1}kh1", 8], ["{3d6>=5,3d6>=5}kh1", 6],
    ];
    for (const [formula, count] of formulas) {
      for (let n = 0; n < 200; n++) {
        const text = rollFormula(`${formula} // Two words`)!;
        const dice = readRolledDice(text);
        expect(dice, text).toHaveLength(count);
        for (const die of dice!) {
          expect(die.value, text).toBeGreaterThanOrEqual(die.sides ? 1 : -1);
          expect(die.value, text).toBeLessThanOrEqual(die.sides || 1);
        }
        // Plain sums: the dice that count add up to the total.
        if (/^\d*d\d+(kh\d|kl\d|dl\d|s|min\d|max\d)?$/.test(formula)) {
          const sum = dice!.filter((d) => d.mark !== "out").reduce((a, d) => a + d.value, 0);
          expect(String(sum), text).toBe(rolledTotal(text));
        }
      }
    }
    for (const formula of ["3d6!", "3d6!!", "3d6!p", "4d6r<3", "4d6ro", "4d6u", "5d6!>=5", "3d6!!>=5", "2d6!+3", "{3d6!,2d8}kh1"]) {
      for (let n = 0; n < 200; n++) {
        const text = rollFormula(formula)!;
        const dice = readRolledDice(text);
        const thrown = text.slice(text.indexOf("(")).match(/\d+/g)?.length ?? 1;
        if (thrown <= MAX_DRAWN_DICE) expect(dice, text).not.toBeNull();
      }
    }
  });

  it("aren't drawn when they're too many, don't fit or can't be known", () => {
    expect(readRolledDice(rollFormula(`${MAX_DRAWN_DICE}d6`)!)).toHaveLength(MAX_DRAWN_DICE);
    expect(readRolledDice(rollFormula(`${MAX_DRAWN_DICE + 1}d6`)!)).toBeNull();
    for (const text of ["d5000 -> 4321", "2d6 -> 9", "Forest d66=42 -> A wolf", "draw=Qs -> Queen of Spades", "gen: x -> y", "d20", "d20 -> crit!", "2d6+3 -> 9 (odd)", "1d(1d6) -> 3 (3)"]) {
      expect(readRolledDice(text), text).toBeNull();
    }
  });

  it("split into what was rolled and its total", () => {
    expect(rolledWhat("Attack d20+5 -> 19 (14 + 5)")).toBe("Attack d20+5");
    expect(rolledTotal("4dF -> +1 (+ 0 + −)")).toBe("+1");
  });
});

describe("an oracle's dice, read from the journal", () => {
  it("are every die thrown at every likelihood, the ones that didn't count left out, in either language", () => {
    for (const t of [es, en]) {
      for (const { id } of ORACLES) {
        for (const level of oracleLevels(id)) {
          const roll = rollOracleWith(id, "Is it?", level);
          expect(readOracleDice(`Name: ${formatOracleDice(t, roll)}`), `${id} ${level}`).toEqual(
            oracleDice(roll).flatMap((g) =>
              g.rolls.map((value) => ({ role: g.role, sides: g.sides, value, ...(g.rolls.length > 1 && value !== g.kept ? { out: true } : {}) })),
            ),
          );
        }
      }
    }
    // Recluse at "Very likely": three white dice, the highest counts.
    expect(readOracleDice("Recluse: blanco 5 (2, 5, 1) / negro 3")).toEqual([
      { role: "white", sides: 6, value: 2, out: true },
      { role: "white", sides: 6, value: 5 },
      { role: "white", sides: 6, value: 1, out: true },
      { role: "black", sides: 6, value: 3 },
    ]);
    // Before 1.6.3 only the ones that counted were written: still read.
    expect(readOracleDice("Recluse: blanco 5 / negro 3")).toEqual([
      { role: "white", sides: 6, value: 5 },
      { role: "black", sides: 6, value: 3 },
    ]);
    expect(readOracleDice("Recluse: blanco 5 (2, 3) / negro 3")).toBeNull();
    expect(readOracleDice("Attack d20")).toBeNull();
    expect(readOracleDice("Name: something else")).toBeNull();
  });
});

describe("fixOldOracle", () => {
  it("writes an old oracle roll with its colon, and nothing else", () => {
    expect(fixOldOracle("Recluse — blanco 3 / negro 5 -> No, pero.")).toBe("Recluse: blanco 3 / negro 5 -> No, pero.");
    expect(fixOldOracle("Ironsworn — d100 67 vs 26+ -> Sí")).toBe("Ironsworn: d100 67 vs 26+ -> Sí");
    for (const text of ["Loot — d20 -> 5", "tbl: A — b d6=1 -> x", "Recluse: white 1 / black 2 -> No — really"]) expect(fixOldOracle(text)).toBe(text);
    expect(readOracleDice("Recluse — blanco 3 / negro 5")).toEqual(readOracleDice("Recluse: blanco 3 / negro 5"));
    expect(readOracleDice("Ironsworn: Action d100=42")).toBeNull();
  });
});
