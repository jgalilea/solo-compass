import { describe, expect, it } from "vitest";
import { rollFormula, withEdge } from "./diceNotation";
import { DICTIONARIES, LOCALES } from "./i18n";

/** A die roll that always lands on the given faces, in order (1-based). */
function dice(...faces: number[]) {
  let i = 0;
  return (sides = 6) => () => (faces[i++ % faces.length] - 1) / sides;
}

/** Rolls that land on the given faces, each with its own die's sides. */
function faces(...rolls: [face: number, sides: number][]) {
  let i = 0;
  return () => {
    const [face, sides] = rolls[i++ % rolls.length];
    return (face - 1) / sides;
  };
}

describe("withEdge", () => {
  it("rolls a single die twice and keeps one", () => {
    expect(withEdge("d20", "advantage")).toBe("2d20kh1");
    expect(withEdge("1d6", "disadvantage")).toBe("2d6kl1");
    expect(withEdge("d%", "advantage")).toBe("2d%kh1");
  });

  it("rolls anything else twice as a group", () => {
    expect(withEdge("2d6+3", "advantage")).toBe("{2d6+3,2d6+3}kh1");
    expect(withEdge("4dF", "disadvantage")).toBe("{4dF,4dF}kl1");
    expect(rollFormula(withEdge("2d6+3", "advantage"), dice(1, 1, 6, 5)(6))).toBe(
      "{2d6+3,2d6+3}kh1 -> 14 ({(1+1 + 3)✗, 6+5 + 3})",
    );
    expect(rollFormula(withEdge("5d6>=5", "disadvantage"), dice(5, 6, 1, 1, 1, 6, 1, 1, 1, 1)(6))).toBe(
      "{5d6>=5,5d6>=5}kl1 -> 1 ({(5✓ 6✓ 1 1 1)✗, 6✓ 1 1 1 1})",
    );
  });

  it("keeps the description outside", () => {
    expect(withEdge("3d6 // Fuerza", "advantage")).toBe("{3d6,3d6}kh1 // Fuerza");
    expect(rollFormula(withEdge("d20 // Sigilo", "advantage"), dice(4, 17)(20))).toBe("Sigilo 2d20kh1 -> 17 (17, 4✗)");
  });
});

describe("rollFormula", () => {
  it("adds dice and modifiers", () => {
    expect(rollFormula("2d6 + 3", dice(4, 2)(6))).toBe("2d6+3 -> 9 (4+2 + 3)");
    expect(rollFormula("1d6+1d6-1", dice(5, 3)(6))).toBe("1d6+1d6-1 -> 7 (5 + 3 − 1)");
    expect(rollFormula("3D6", dice(1, 2, 3)(6))).toBe("3d6 -> 6 (1+2+3)");
  });

  it("a single die is written like the buttons", () => {
    expect(rollFormula("d20", dice(14)(20))).toBe("d20 -> 14");
    expect(rollFormula("d%", dice(42)(100))).toBe("d% -> 42");
    expect(rollFormula("4d%", dice(42, 7, 100, 1)(100))).toBe("4d% -> 150 (42+7+100+1)");
  });

  it("keeps the highest or lowest dice", () => {
    expect(rollFormula("4d6kh3", dice(2, 6, 5, 3)(6))).toBe("4d6kh3 -> 14 (6+5+3, 2✗)");
    expect(rollFormula("4d6k3", dice(2, 6, 5, 3)(6))).toBe("4d6k3 -> 14 (6+5+3, 2✗)");
    expect(rollFormula("2d20kl1", dice(17, 5)(20))).toBe("2d20kl1 -> 5 (5, 17✗)");
    // Keeping more than there are keeps them all.
    expect(rollFormula("2d20kh3", dice(17, 5)(20))).toBe("2d20kh3 -> 22 (17+5)");
  });

  it("counts successes in a pool", () => {
    expect(rollFormula("5d6>=5", dice(6, 5, 3, 2, 1)(6))).toBe("5d6>=5 -> 2 (6✓ 5✓ 3 2 1)");
    expect(rollFormula("2d6=6", dice(4, 6)(6))).toBe("2d6=6 -> 1 (4 6✓)");
    expect(rollFormula("4d3>1", dice(1, 3, 2, 1)(3))).toBe("4d3>1 -> 2 (1 3✓ 2✓ 1)");
  });

  it("counts successes among the kept dice only", () => {
    expect(rollFormula("4d6kh3>=4", dice(2, 6, 5, 3)(6))).toBe("4d6kh3>=4 -> 2 (6✓ 5✓ 3, 2✗)");
  });

  it("explodes a die on its highest face, each reroll one more die", () => {
    expect(rollFormula("3d6!", dice(6, 2, 4, 1)(6))).toBe("3d6! -> 13 (6!+2+4+1)");
    expect(rollFormula("d6!", dice(6, 6, 3)(6))).toBe("d6! -> 15 (6!+6!+3)");
    // Nothing exploded: written like any single die.
    expect(rollFormula("d6!", dice(4)(6))).toBe("d6! -> 4");
    // Keeping picks among all the rolls, rerolls included.
    expect(rollFormula("2d6!kh1", dice(6, 1, 3)(6))).toBe("2d6!kh1 -> 6 (6!, 3✗ 1✗)");
  });

  it("explodes on a condition attached to the !", () => {
    expect(rollFormula("2d6!>4", dice(5, 2, 3)(6))).toBe("2d6!>4 -> 10 (5!+2+3)");
    expect(rollFormula("d6!=5", dice(5, 6)(6))).toBe("d6!=5 -> 11 (5!+6)");
    expect(rollFormula("d6!<>4", dice(2, 4)(6))).toBe("d6!<>4 -> 6 (2!+4)");
    // Attached to the "!", ">=8" is when it explodes, not a target.
    expect(rollFormula("5d10!>=8", dice(8, 1, 2, 3, 4, 5)(10))).toBe("5d10!>=8 -> 23 (8!+1+2+3+4+5)");
  });

  it("counts a target written before the ! and explodes on the highest face", () => {
    expect(rollFormula("3d10>=8!", dice(10, 9, 2, 5)(10))).toBe("3d10>=8! -> 2 (10!✓ 9✓ 2 5)");
  });

  it("penetrating rerolls count one less", () => {
    expect(rollFormula("2d6!p", dice(6, 6, 6, 4, 1)(6))).toBe("2d6!p -> 20 (6!+5!+5!+3+1)");
  });

  it("rolls Fudge dice, standard and variant", () => {
    // Faces 1, 2, 3 of a dF are −, 0, +.
    expect(rollFormula("4dF", dice(3, 2, 3, 1)(3))).toBe("4dF -> +1 (+ 0 + −)");
    expect(rollFormula("dF.2", dice(1)(3))).toBe("dF.2 -> -1 (−)");
    // dF.1: one −, four blanks, one +.
    expect(rollFormula("2dF.1", dice(1, 6)(6))).toBe("2dF.1 -> 0 (− +)");
    expect(rollFormula("2dF.1", dice(3, 6)(6))).toBe("2dF.1 -> +1 (0 +)");
  });

  it("returns null for what it can't read", () => {
    for (const bad of ["", "hola", "2d", "d0", "0d6", "3", "2d6 3", "1000d6", "4d6f<3", "2d6>3>4", "(2d6", "{2d6", "2d6+", "d6/0"]) {
      expect(rollFormula(bad), bad).toBeNull();
    }
  });
});

describe("rollFormula, the rest of Lonelog's dice notation", () => {
  it("drops the lowest or highest dice, both at once too", () => {
    expect(rollFormula("4d6dl1", dice(2, 6, 5, 3)(6))).toBe("4d6dl1 -> 14 (6+5+3, 2✗)");
    expect(rollFormula("4d6d1", dice(2, 6, 5, 3)(6))).toBe("4d6d1 -> 14 (6+5+3, 2✗)");
    expect(rollFormula("4d6dh1", dice(2, 6, 5, 3)(6))).toBe("4d6dh1 -> 10 (2+3+5, 6✗)");
    expect(rollFormula("4d10dh1dl2", dice(7, 1, 9, 4)(10))).toBe("4d10dh1dl2 -> 7 (7, 1✗ 4✗ 9✗)");
    // The spec's example: keep and drop see the whole pool.
    expect(rollFormula("3d10k1dh1", dice(7, 1, 2)(10))).toBe("3d10k1dh1 -> 0 (7✗ 2✗ 1✗)");
  });

  it("compounds an explosion into one die", () => {
    expect(rollFormula("d6!!", dice(6, 6, 2)(6))).toBe("d6!! -> 14 (6!+6!+2)");
    // In a pool it counts once, with its total.
    expect(rollFormula("2d6>=5!!", dice(6, 1, 3)(6))).toBe("2d6>=5!! -> 1 (7!!✓ 3)");
    // "!!=4" is compounding on 4, not "explode on anything but 4".
    expect(rollFormula("2d6!!=4", dice(4, 2, 5)(6))).toBe("2d6!!=4 -> 11 (4!+2+5)");
  });

  it("takes failures away from a pool's successes", () => {
    expect(rollFormula("4d6>4f<3", dice(6, 5, 2, 1)(6))).toBe("4d6>4f<3 -> 0 (6✓ 5✓ 2✗ 1✗)");
  });

  it("raises to a minimum and lowers to a maximum", () => {
    expect(rollFormula("4d6min3", dice(1, 4, 3, 2)(6))).toBe("4d6min3 -> 13 (3↑+4+3+3↑)");
    expect(rollFormula("4d6max3", dice(5, 6, 3, 2)(6))).toBe("4d6max3 -> 11 (3↓+3↓+3+2)");
  });

  it("rerolls until the condition misses, or once", () => {
    expect(rollFormula("d6r", dice(1, 1, 4)(6))).toBe("d6r -> 4 (1→1→4)");
    expect(rollFormula("d6ro", dice(1, 1)(6))).toBe("d6ro -> 1 (1→1)");
    expect(rollFormula("4d10r<=3", dice(2, 7, 3, 5, 9, 8)(10))).toBe("4d10r<=3 -> 29 (2→9+7+3→8+5)");
  });

  it("rerolls repeated results", () => {
    expect(rollFormula("2d10u", dice(7, 7, 4)(10))).toBe("2d10u -> 11 (7+7→4)");
    expect(rollFormula("3d6u=5", dice(5, 2, 2)(6))).toBe("3d6u=5 -> 9 (5+2+2)");
  });

  it("marks criticals without changing the result", () => {
    expect(rollFormula("2d20cs", dice(4, 20)(20))).toBe("2d20cs -> 24 (4+20▲)");
    expect(rollFormula("2d20cf", dice(4, 1)(20))).toBe("2d20cf -> 5 (4+1▼)");
    expect(rollFormula("d20cs>18cf<3", dice(1)(20))).toBe("d20cs>18cf<3 -> 1 (1▼)");
  });

  it("sorts the dice as written", () => {
    expect(rollFormula("4d6s", dice(4, 3, 5, 1)(6))).toBe("4d6s -> 13 (1+3+4+5)");
    expect(rollFormula("4d6sa", dice(4, 3, 5, 1)(6))).toBe("4d6sa -> 13 (1+3+4+5)");
    expect(rollFormula("4d6sd", dice(4, 3, 5, 1)(6))).toBe("4d6sd -> 13 (5+4+3+1)");
  });

  it("applies modifiers in the spec's order, whatever order they're written in", () => {
    // Exploding (3) before keeping (6): the 10's reroll is one more die to choose from.
    expect(rollFormula("5d10!k2", dice(10, 3, 1, 8, 2, 4)(10))).toBe("5d10!k2 -> 18 (10!+8, 4✗ 3✗ 2✗ 1✗)");
    expect(rollFormula("5d10k2!", dice(10, 3, 1, 8, 2, 4)(10))).toBe("5d10k2! -> 18 (10!+8, 4✗ 3✗ 2✗ 1✗)");
  });

  it("does arithmetic with precedence and parentheses", () => {
    expect(rollFormula("1d6+2*3", dice(4)(6))).toBe("1d6+2*3 -> 10 (4 + 2 × 3)");
    expect(rollFormula("(1d6+2)*3", dice(4)(6))).toBe("(1d6+2)*3 -> 18 ((4 + 2) × 3)");
    expect(rollFormula("2d6*2", dice(4, 2)(6))).toBe("2d6*2 -> 12 ((4+2) × 2)");
    expect(rollFormula("d20%2", dice(15)(20))).toBe("d20%2 -> 1 (15 % 2)");
    expect(rollFormula("d4^2", dice(3)(4))).toBe("d4^2 -> 9 (3 ^ 2)");
    expect(rollFormula("d4**2", dice(3)(4))).toBe("d4**2 -> 9 (3 ^ 2)");
    expect(rollFormula("2d10/4", dice(9, 4)(10))).toBe("2d10/4 -> 3.25 ((9+4) ÷ 4)");
    expect(rollFormula("-d6+10", dice(2)(6))).toBe("-d6+10 -> 8 (−2 + 10)");
  });

  it("works out how many dice or sides from an expression", () => {
    expect(rollFormula("(4-2)d10", dice(3, 8)(10))).toBe("(4-2)d10 -> 11 (3+8)");
    expect(rollFormula("3d(2*6)", dice(12, 1, 6)(12))).toBe("3d(2*6) -> 19 (12+1+6)");
    expect(rollFormula("(0)d6")).toBeNull();
  });

  it("rolls groups: added, kept by total or counted", () => {
    expect(rollFormula("{4d6, 2d10, d4}", faces([2, 6], [6, 6], [4, 6], [2, 6], [7, 10], [4, 10], [1, 4]))).toBe(
      "{4d6,2d10,d4} -> 26 ({2+6+4+2, 7+4, 1})",
    );
    expect(rollFormula("{4d6,2d10}k1", faces([5, 6], [4, 6], [3, 6], [1, 6], [7, 10], [4, 10]))).toBe(
      "{4d6,2d10}k1 -> 13 ({5+4+3+1, (7+4)✗})",
    );
    expect(rollFormula("{3d20+5}>40", faces([11, 20], [7, 20], [19, 20]))).toBe("{3d20+5}>40 -> 1 ({(11+7+19 + 5)✓})");
    expect(rollFormula("{2d6,d20}>=10f<3", faces([1, 6], [1, 6], [15, 20]))).toBe("{2d6,d20}>=10f<3 -> 0 ({(1+1)✗, 15✓})");
    expect(rollFormula("{2d6,d20}sd", faces([1, 6], [1, 6], [15, 20]))).toBe("{2d6,d20}sd -> 17 ({15, 1+1})");
  });

  it("a group of one keeps or drops single dice", () => {
    expect(rollFormula("{2d6+1d8}k2", faces([2, 6], [5, 6], [7, 8]))).toBe("{2d6+1d8}k2 -> 12 ({5, 2✗ + 7})");
  });

  it("writes a description before the roll, in every form", () => {
    expect(rollFormula("4d6dl1 // Strength", dice(2, 6, 5, 3)(6))).toBe("Strength 4d6dl1 -> 14 (6+5+3, 2✗)");
    expect(rollFormula("2d6 # Damage", dice(3, 4)(6))).toBe("Damage 2d6 -> 7 (3+4)");
    expect(rollFormula("4d6 /* Ice damage 5d10+7 */", dice(1, 2, 3, 4)(6))).toBe("Ice damage 5d10+7 4d6 -> 10 (1+2+3+4)");
    expect(rollFormula("2d10 [ Fire damage ]", dice(3, 4)(10))).toBe("Fire damage 2d10 -> 7 (3+4)");
  });

  it("keeps a typo from freezing the app", () => {
    expect(rollFormula("d1!")).toBe(`d1! -> 1001 (${Array(1000).fill("1!").join("+")}+1)`);
    expect(rollFormula("999d6!>0")).toBeNull();
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
      "3d10>=8!": [[10, 10], [9, 10], [4, 10], [8, 10]],
      "4dF+1": [[3, 3], [2, 3], [3, 3], [1, 3]],
      "4d6dl1": [[2, 6], [6, 6], [5, 6], [3, 6]],
      "4d6>4f<3": [[6, 6], [5, 6], [2, 6], [4, 6]],
      "d6!!": [[6, 6], [6, 6], [2, 6]],
      "d%": [[42, 100]],
      "d6r": [[1, 6], [4, 6]],
      "2d10u": [[7, 10], [7, 10], [4, 10]],
      "4d6min2": [[1, 6], [5, 6], [1, 6], [4, 6]],
      "2d20cs>=19": [[19, 20], [6, 20]],
      "4d6sd": [[3, 6], [6, 6], [1, 6], [5, 6]],
      "(1d6+2)*3": [[4, 6]],
      "1d6*10": [[4, 6]],
      "{4d6,2d10}k1": [[5, 6], [4, 6], [3, 6], [1, 6], [7, 10], [4, 10]],
      "{3d20+5}>=40": [[11, 20], [17, 20], [19, 20]],
    };
    for (const line of lines) {
      const formula = line.split(" -> ")[0];
      expect(rolls[formula], formula).toBeDefined();
      expect(rollFormula(formula, faces(...rolls[formula]))).toBe(line);
    }
    // Both languages show the same lines.
    expect(DICTIONARIES.en.diceHelp.formulas.flatMap((f) => f.examples.map((e) => e.line))).toEqual(lines);
  });

  it("every formula a card or a game names can be rolled", () => {
    // "(1d8+3)." → "1d8+3": the sentence's own brackets and punctuation off.
    const clean = (token: string) => {
      let t = token.replace(/[.,;:»]+$/, "");
      const open = (c: string) => t.split(c).length - 1;
      while (t.endsWith(")") && open(")") > open("(")) t = t.slice(0, -1);
      while (t.startsWith("(") && open("(") > open(")")) t = t.slice(1);
      return t;
    };
    for (const locale of LOCALES) {
      for (const { formula, parts, usedIn } of DICTIONARIES[locale].diceHelp.formulas) {
        const text = [usedIn, ...parts.map((p) => p.text)].join(" ").replace(/\{(\S+), /g, "{$1,");
        const named = [...formula.split(" · "), ...(text.match(/\S*\dd[\d%F(]\S*|\S*\bd[\d%F(]\S*/g) ?? []).map(clean)];
        for (const f of named) expect(rollFormula(f), `${locale}: ${f}`).not.toBeNull();
      }
    }
  });

  it("holds to the limits it states", () => {
    expect(rollFormula("2D6 + 3")?.startsWith("2d6+3 -> ")).toBe(true);
    expect(rollFormula("999d6")).not.toBeNull();
    expect(rollFormula("1000d6")).toBeNull();
    expect(rollFormula("3d10!>=8", dice(8, 1, 1, 1)(10))).toBe("3d10!>=8 -> 11 (8!+1+1+1)");
  });
});
