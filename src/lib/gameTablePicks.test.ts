import { describe, expect, it } from "vitest";
import type { BuiltinDie } from "./dice";
import { gameTableDice, gameTableIds, pickedIds, togglePicked } from "./gameTablePicks";
import type { SavedRoll } from "./savedRolls";

const die = (id: string, favorite: boolean): SavedRoll => ({ id, name: id, formula: "d20", favorite, createdAt: 0, updatedAt: 0 });
const saved = [die("attack", true), die("damage", false)];
const favorites = new Set<BuiltinDie>(["d6", "d20"]);

describe("an adventure's game table", () => {
  it("goes with the favourites until it picks its own", () => {
    expect(pickedIds(undefined)).toBeNull();
    expect(gameTableDice(undefined, favorites, saved)).toEqual({ builtins: ["d6", "d20"], own: [saved[0]] });
    // Back to the favourites after a pick of its own.
    expect(gameTableDice({ ids: null, updatedAt: 5 }, favorites, saved)).toEqual({ builtins: ["d6", "d20"], own: [saved[0]] });
    expect([...gameTableIds(undefined, new Set(["a", "b"]))]).toEqual(["a", "b"]);
  });

  it("then has only what it picked, in the usual order, and loses what's deleted", () => {
    const pick = { ids: ["d20", "d4", "damage", "gone"], updatedAt: 5 };
    expect(gameTableDice(pick, favorites, saved)).toEqual({ builtins: ["d4", "d20"], own: [saved[1]] });
    expect([...gameTableIds({ ids: [], updatedAt: 1 }, new Set(["a"]))]).toEqual([]);
  });

  it("changes one at a time, starting from what's on it", () => {
    expect(togglePicked(["d6", "d20"], "d4")).toEqual(["d6", "d20", "d4"]);
    expect(togglePicked(new Set(["d6", "d20"]), "d6")).toEqual(["d20"]);
  });
});
