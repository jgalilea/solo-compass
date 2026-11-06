import { describe, expect, it } from "vitest";
import { rollFormula } from "./dice";

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

  it("rolls Fudge dice", () => {
    // Faces 1, 2, 3 of a dF are −, 0, +.
    expect(rollFormula("4dF", dice(3, 2, 3, 1)(3))).toBe("4dF -> +1 (+ 0 + −)");
  });

  it("returns null for what it can't read", () => {
    for (const bad of ["", "hola", "2d", "d1", "3", "2d6 3", "4d6kh5", "2d6+1d4>=3", "1000d6", "2d6kh1>=4"]) {
      expect(rollFormula(bad), bad).toBeNull();
    }
  });
});
