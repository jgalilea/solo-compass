import { describe, expect, it } from "vitest";
import { rollFormula } from "./dice";
import { DICTIONARIES, LOCALES } from "./i18n";

/** A die roll that always lands on the given faces, in order (1-based). */
function dice(...faces: number[]) {
  let i = 0;
  return (sides = 6) => () => (faces[i++ % faces.length] - 1) / sides;
}

describe("rollFormula", () => {
  it("adds dice and modifiers", () => {
    expect(rollFormula("2d6 + 3", dice(4, 2)(6))).toBe("2d6+3 -> 9 (4+2 + 3)");
    expect(rollFormula("1d6+1d6-1", dice(5, 3)(6))).toBe("1d6+1d6-1 -> 7 (5 + 3 − 1)");
    expect(rollFormula("3D6", dice(1, 2, 3)(6))).toBe("3d6 -> 6 (1+2+3)");
  });

  it("a single die is written like the buttons", () => {
    expect(rollFormula("d20", dice(14)(20))).toBe("d20 -> 14");
    expect(rollFormula("d%", dice(42)(100))).toBe("d% -> 42");
  });

  it("keeps the highest or lowest dice", () => {
    expect(rollFormula("4d6kh3", dice(2, 6, 5, 3)(6))).toBe("4d6kh3 -> 14 (6+5+3, 2✗)");
    expect(rollFormula("2d20kl1", dice(17, 5)(20))).toBe("2d20kl1 -> 5 (5, 17✗)");
  });

  it("counts successes in a pool", () => {
    expect(rollFormula("5d6>=5", dice(6, 5, 3, 2, 1)(6))).toBe("5d6>=5 -> 2 (6✓ 5✓ 3 2 1)");
  });

  it("explodes a die on its highest face", () => {
    expect(rollFormula("3d6!", dice(6, 2, 4, 1)(6))).toBe("3d6! -> 13 (6!+2+4+1)");
    expect(rollFormula("d6!", dice(6, 6, 3)(6))).toBe("d6! -> 15 (6!+6!+3)");
    // Nothing exploded: written like any single die.
    expect(rollFormula("d6!", dice(4)(6))).toBe("d6! -> 4");
    // Savage Worlds-style keep: the exploded die counts as its total.
    expect(rollFormula("2d6!kh1", dice(6, 1, 3)(6))).toBe("2d6!kh1 -> 7 (6!+1, 3✗)");
  });

  it("counts each reroll of an exploding pool as one more die", () => {
    expect(rollFormula("3d10!>=8", dice(10, 9, 2, 5)(10))).toBe("3d10!>=8 -> 2 (10!✓ 9✓ 2 5)");
  });

  it("rolls Fudge dice", () => {
    // Faces 1, 2, 3 of a dF are −, 0, +.
    expect(rollFormula("4dF", dice(3, 2, 3, 1)(3))).toBe("4dF -> +1 (+ 0 + −)");
  });

  it("returns null for what it can't read", () => {
    for (const bad of ["", "hola", "2d", "d1", "3", "2d6 3", "4d6kh5", "2d6+1d4>=3", "1000d6", "2d6kh1>=4", "4dF!"]) {
      expect(rollFormula(bad), bad).toBeNull();
    }
  });
});

describe("dice help", () => {
  it("only shows examples rollFormula can write", () => {
    for (const locale of LOCALES) {
      for (const { example } of DICTIONARIES[locale].diceHelp.formulas) {
        const formula = example.split(" -> ")[0];
        expect(rollFormula(formula)?.startsWith(`${formula} -> `), example).toBe(true);
      }
    }
  });

  it("writes a Fudge formula with a modifier as its example says", () => {
    expect(rollFormula("4dF+1", dice(3, 2, 3, 1)(3))).toBe("4dF+1 -> +2 (+ 0 + − + 1)");
  });
});
