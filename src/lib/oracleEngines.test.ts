import { describe, expect, it } from "vitest";
import {
  fitLikelihood,
  lonerTwistCounter,
  nextTwistCounter,
  oracleLevels,
  oracleOdds,
  rollOracleWith,
  throwOracle,
  type OracleId,
} from "./oracleEngines";
import { oracleDice } from "./oracle";

const ORACLE_IDS: OracleId[] = ["recluse", "loner", "ironsworn", "opse"];

/** Always rolls the given faces, in order. */
function fixed(...faces: number[]) {
  let i = 0;
  return () => faces[i++];
}

describe("oracleOdds", () => {
  it("adds up to one for every oracle and likelihood", () => {
    for (const id of ORACLE_IDS) {
      for (const level of oracleLevels(id)) {
        const odds = oracleOdds(id, level);
        expect(odds.yes + odds.no + odds.contradiction).toBeCloseTo(1, 10);
      }
    }
  });

  it("matches Recluse's even odds worked out by hand", () => {
    const odds = oracleOdds("recluse", "equilibrado");
    expect(odds.yes).toBeCloseTo(15 / 36);
    expect(odds.no).toBeCloseTo(15 / 36);
    expect(odds.contradiction).toBeCloseTo(6 / 36);
    // Both low and different: 3·2 = 6 of 36; both high, the same.
    expect(odds.but).toBeCloseTo(6 / 36);
    expect(odds.and).toBeCloseTo(6 / 36);
  });

  it("gives Ironsworn's thresholds exactly, with a match one time in ten", () => {
    const expected = { "muy-improbable": 0.1, improbable: 0.25, equilibrado: 0.5, probable: 0.75, "muy-probable": 0.9 };
    for (const [level, yes] of Object.entries(expected)) {
      const odds = oracleOdds("ironsworn", level as keyof typeof expected);
      expect(odds.yes).toBeCloseTo(yes);
      expect(odds.special).toBeCloseTo(0.1);
      expect(odds.and + odds.but).toBe(0);
    }
  });

  it("gives One Page Solo Engine's answer die and modifier die on their own", () => {
    expect(oracleOdds("opse", "probable").yes).toBeCloseTo(4 / 6);
    expect(oracleOdds("opse", "equilibrado").yes).toBeCloseTo(3 / 6);
    expect(oracleOdds("opse", "improbable").yes).toBeCloseTo(2 / 6);
    expect(oracleOdds("opse", "equilibrado").and).toBeCloseTo(1 / 6);
    expect(oracleOdds("opse", "equilibrado").but).toBeCloseTo(1 / 6);
  });

  it("counts Loner's doubles as yes, but, never as a contradiction", () => {
    const odds = oracleOdds("loner", "equilibrado");
    expect(odds.special).toBeCloseTo(1 / 6);
    expect(odds.contradiction).toBe(0);
    expect(odds.yes).toBeCloseTo(21 / 36);
    // Advantage makes yes likelier, disadvantage less.
    expect(oracleOdds("loner", "probable").yes).toBeGreaterThan(odds.yes);
    expect(oracleOdds("loner", "improbable").yes).toBeLessThan(odds.yes);
  });
});

describe("throwOracle", () => {
  it("reads Loner's chance and risk dice", () => {
    expect(throwOracle("loner", "equilibrado", fixed(5, 4))).toMatchObject({ answer: "si", qualifier: "y" });
    expect(throwOracle("loner", "equilibrado", fixed(2, 3))).toMatchObject({ answer: "no", qualifier: "pero" });
    expect(throwOracle("loner", "equilibrado", fixed(3, 3))).toMatchObject({ answer: "si", qualifier: "pero", special: "double" });
    // Disadvantage: two risk dice, the highest counts.
    const roll = throwOracle("loner", "improbable", fixed(4, 2, 5));
    expect(roll.dice[1]).toMatchObject({ role: "risk", rolls: [2, 5], kept: 5 });
    expect(roll.answer).toBe("no");
  });

  it("reads Ironsworn's d100 and its matches, 100 included", () => {
    expect(throwOracle("ironsworn", "probable", fixed(26))).toMatchObject({ answer: "si" });
    expect(throwOracle("ironsworn", "probable", fixed(25))).toMatchObject({ answer: "no" });
    expect(throwOracle("ironsworn", "equilibrado", fixed(77)).special).toBe("match");
    expect(throwOracle("ironsworn", "equilibrado", fixed(100)).special).toBe("match");
    expect(throwOracle("ironsworn", "equilibrado", fixed(10)).special).toBeUndefined();
  });

  it("reads One Page Solo Engine's modifier die", () => {
    expect(throwOracle("opse", "equilibrado", fixed(4, 1))).toMatchObject({ answer: "si", qualifier: "pero" });
    expect(throwOracle("opse", "equilibrado", fixed(3, 6))).toMatchObject({ answer: "no", qualifier: "y" });
    expect(throwOracle("opse", "probable", fixed(3, 3))).toMatchObject({ answer: "si", qualifier: null });
  });
});

describe("likelihoods", () => {
  it("falls back to even when an oracle doesn't offer the one picked", () => {
    expect(fitLikelihood("loner", "muy-probable")).toBe("equilibrado");
    expect(fitLikelihood("ironsworn", "muy-probable")).toBe("muy-probable");
    expect(rollOracleWith("opse", "?", "muy-improbable").likelihood).toBe("equilibrado");
  });
});

describe("Loner's Twist Counter", () => {
  it("brings a twist on the third double and starts again", () => {
    expect(nextTwistCounter(0)).toEqual({ counter: 1, twist: false });
    expect(nextTwistCounter(1)).toEqual({ counter: 2, twist: false });
    expect(nextTwistCounter(2)).toEqual({ counter: 0, twist: true });
  });

  it("is read from the latest Loner double in the history", () => {
    const history = [
      { kind: "oraculo", oracle: "loner" },
      { kind: "tabla" },
      { kind: "oraculo", oracle: "loner", twist: { counter: 2 } },
      { kind: "oraculo", oracle: "loner", twist: { counter: 1 } },
    ];
    expect(lonerTwistCounter(history)).toBe(2);
    expect(lonerTwistCounter([])).toBe(0);
  });
});

describe("rollOracleWith", () => {
  it("keeps Recluse rolls readable by older copies of the app", () => {
    const roll = rollOracleWith("recluse", "  ¿Llueve?  ", "probable");
    expect(roll.oracle).toBe("recluse");
    expect(roll.white?.rolls).toHaveLength(2);
    expect(roll.question).toBe("¿Llueve?");
    expect(oracleDice(roll).map((g) => g.role)).toEqual(["white", "black"]);
  });

  it("saves every die for the other oracles", () => {
    const roll = rollOracleWith("ironsworn", "?", "equilibrado");
    expect(roll.dice).toEqual([expect.objectContaining({ role: "percentile", sides: 100 })]);
    expect(roll.white).toBeUndefined();
  });
});
