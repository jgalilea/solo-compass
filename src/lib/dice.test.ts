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

/** Rolls that land on the given faces, each with its own die's sides. */
function faces(...rolls: [face: number, sides: number][]) {
  let i = 0;
  return () => {
    const [face, sides] = rolls[i++ % rolls.length];
    return (face - 1) / sides;
  };
}

describe("rollFormula, Lonelog's dice notation add-on", () => {
  it("drops the lowest or highest dice", () => {
    expect(rollFormula("4d6dl1", dice(2, 6, 5, 3)(6))).toBe("4d6dl1 -> 14 (6+5+3, 2✗)");
    expect(rollFormula("4d6d1", dice(2, 6, 5, 3)(6))).toBe("4d6d1 -> 14 (6+5+3, 2✗)");
    expect(rollFormula("4d6dh1", dice(2, 6, 5, 3)(6))).toBe("4d6dh1 -> 10 (2+3+5, 6✗)");
    expect(rollFormula("2d6dl2")).toBeNull();
  });

  it("compounds an explosion into one die", () => {
    expect(rollFormula("d6!!", dice(6, 6, 2)(6))).toBe("d6!! -> 14 (6!+6!+2)");
    // In a pool it counts once, with its total.
    expect(rollFormula("2d6!!>=5", dice(6, 1, 3)(6))).toBe("2d6!!>=5 -> 1 (7!!✓ 3)");
  });

  it("takes failures away from a pool's successes", () => {
    expect(rollFormula("4d6>4f<3", dice(6, 5, 2, 1)(6))).toBe("4d6>4f<3 -> 0 (6✓ 5✓ 2✗ 1✗)");
    expect(rollFormula("4d6f<3")).toBeNull();
  });

  it("writes a description before the roll", () => {
    expect(rollFormula("4d6dl1 // Strength", dice(2, 6, 5, 3)(6))).toBe("Strength 4d6dl1 -> 14 (6+5+3, 2✗)");
    expect(rollFormula("2d6 # Damage", dice(3, 4)(6))).toBe("Damage 2d6 -> 7 (3+4)");
  });
});

describe("dice help", () => {
  it("only shows examples rollFormula can write", () => {
    for (const locale of LOCALES) {
      for (const { examples } of DICTIONARIES[locale].diceHelp.formulas) {
        for (const { line } of examples) {
          const formula = line.split(" -> ")[0];
          expect(rollFormula(formula)?.startsWith(`${formula} -> `), line).toBe(true);
        }
      }
    }
  });

  it("writes each example exactly as the help shows it", () => {
    const lines = DICTIONARIES.es.diceHelp.formulas.flatMap((f) => f.examples.map((e) => e.line));
    const rolls: Record<string, [number, number][]> = {
      "2d6+3": [[4, 6], [2, 6]],
      "d20+5": [[12, 20]],
      "1d8+1d6-1": [[5, 8], [3, 6]],
      "4d6kh3": [[2, 6], [6, 6], [5, 6], [3, 6]],
      "2d20kh1": [[17, 20], [4, 20]],
      "2d20kl1": [[4, 20], [17, 20]],
      "5d6>=5": [[6, 6], [5, 6], [3, 6], [2, 6], [1, 6]],
      "6d10>=8": [[9, 10], [2, 10], [8, 10], [10, 10], [5, 10], [7, 10]],
      "4d6<=2": [[5, 6], [2, 6], [6, 6], [4, 6]],
      "3d6!": [[6, 6], [2, 6], [4, 6], [1, 6]],
      "1d8!+1d6!": [[8, 8], [3, 8], [2, 6]],
      "3d10!>=8": [[10, 10], [9, 10], [4, 10], [8, 10]],
      "4dF+1": [[3, 3], [2, 3], [3, 3], [1, 3]],
      "4d6dl1": [[2, 6], [6, 6], [5, 6], [3, 6]],
      "4d6>4f<3": [[6, 6], [5, 6], [2, 6], [4, 6]],
      "d6!!": [[6, 6], [6, 6], [2, 6]],
      "d%": [[42, 100]],
    };
    for (const line of lines) {
      const formula = line.split(" -> ")[0];
      expect(rolls[formula], formula).toBeDefined();
      expect(rollFormula(formula, faces(...rolls[formula]))).toBe(line);
    }
    // Both languages show the same lines.
    expect(DICTIONARIES.en.diceHelp.formulas.flatMap((f) => f.examples.map((e) => e.line))).toEqual(lines);
  });

  it("refuses what its limits say it doesn't take", () => {
    for (const bad of ["5d6+1>=5", "4d6kh3>=4", "2d20kh3", "4dF!", "4dF>=1", "101d6", "d1001"]) {
      expect(rollFormula(bad), bad).toBeNull();
    }
    expect(rollFormula("2D6 + 3")?.startsWith("2d6+3 -> ")).toBe(true);
    expect(rollFormula("100d1000")).not.toBeNull();
  });
});
