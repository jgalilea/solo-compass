import { describe, expect, it } from "vitest";
import { createSavedRoll, isRollable, normalizeSavedRoll, rollSaved, savedRollLabel, sortSavedRolls } from "./savedRolls";

/** A die roll that always lands on the given faces, in order (1-based). */
function faces(...rolls: [face: number, sides: number][]) {
  let i = 0;
  return () => {
    const [face, sides] = rolls[i++ % rolls.length];
    return (face - 1) / sides;
  };
}

describe("saved rolls", () => {
  it("rolls with its name as the description, with advantage too", () => {
    const attack = { name: "Attack", formula: "d20+5" };
    expect(rollSaved(attack, undefined, faces([14, 20]))).toBe("Attack d20+5 -> 19 (14 + 5)");
    expect(rollSaved(attack, "advantage", faces([3, 20], [17, 20]))).toBe(
      "Attack {d20+5,d20+5}kh1 -> 22 ({(3 + 5)✗, 17 + 5})",
    );
    // With no text of its own, just the formula.
    expect(rollSaved({ name: "", formula: "d20+5" }, undefined, faces([14, 20]))).toBe("d20+5 -> 19 (14 + 5)");
    expect(savedRollLabel({ name: "", formula: "d20+5" })).toBe("d20+5");
    // FATE: four Fudge dice and a skill.
    expect(rollSaved({ name: "Athletics", formula: "4dF+2" }, undefined, faces([6, 6], [1, 6], [3, 6], [5, 6]))).toMatch(
      /^Athletics 4dF\+2 -> \+3 /,
    );
  });

  it("keeps only what can be shown and rolled", () => {
    const roll = createSavedRoll({ name: " Attack ", formula: " d20+5 " }, 7);
    expect(roll).toMatchObject({ name: "Attack", formula: "d20+5", favorite: false, createdAt: 7, updatedAt: 7 });
    expect(normalizeSavedRoll(roll)).toEqual(roll);
    expect(normalizeSavedRoll({ ...roll, formula: "two dice" })).toBeNull();
    // The text is optional: the formula names it.
    expect(normalizeSavedRoll({ ...roll, name: "  " })).toMatchObject({ name: "" });
    expect(normalizeSavedRoll({ id: "x", name: "Old", formula: "d6" })).toMatchObject({ favorite: false, createdAt: 0, updatedAt: 0 });
    expect(isRollable("")).toBe(false);
    expect(isRollable("3d6!")).toBe(true);
  });

  it("lists favorites first, then in the order they were saved", () => {
    const a = { ...createSavedRoll({ name: "A", formula: "d6" }, 1) };
    const b = { ...createSavedRoll({ name: "B", formula: "d6" }, 2), favorite: true };
    const c = { ...createSavedRoll({ name: "C", formula: "d6" }, 3) };
    expect(sortSavedRolls([c, a, b]).map((r) => r.name)).toEqual(["B", "A", "C"]);
  });
});
