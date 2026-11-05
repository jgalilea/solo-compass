import { afterEach, describe, expect, it, vi } from "vitest";
import { diceMax, lookupEntry, rollForTable, type MeaningTable } from "./tables";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("dice and lookup", () => {
  it("d66 reads as tens and units", () => {
    const spy = vi.spyOn(Math, "random");
    spy.mockReturnValueOnce(2 / 6 + 0.01).mockReturnValueOnce(5 / 6 + 0.01);
    expect(rollForTable("d66")).toEqual({ rolls: [3, 6], total: 36 });
  });

  it("looks a value up by its range", () => {
    const table = {
      entries: [
        { range: [1, 3], text: "Rats" },
        { range: [4, 6], text: "Bats" },
      ],
    } as MeaningTable;
    expect(lookupEntry(table, 3)?.text).toBe("Rats");
    expect(lookupEntry(table, 4)?.text).toBe("Bats");
    expect(lookupEntry(table, 7)).toBeUndefined();
  });

  it.each(["d6", "d20", "d100"] as const)("%s tira entre 1 y su máximo", (dice) => {
    for (let i = 0; i < 500; i++) {
      const { rolls, total } = rollForTable(dice);
      expect(rolls).toEqual([total]);
      expect(total).toBeGreaterThanOrEqual(1);
      expect(total).toBeLessThanOrEqual(diceMax(dice));
    }
  });
});
