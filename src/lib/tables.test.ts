import { afterEach, describe, expect, it, vi } from "vitest";
import { diceMax, lookupEntry, resolveResult, rollForTable, type MeaningTable } from "./tables";

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

describe("results that roll again", () => {
  const table = (id: string, name: string, texts: string[], tag?: string): MeaningTable => ({
    id,
    name,
    description: "",
    dice: `d${texts.length}`,
    game: { name: "Test", ...(tag ? { tag } : {}) },
    entries: texts.map((text, i) => ({ range: [i + 1, i + 1], text })),
  });
  // Faces in order (1-based), for a die of `sides`.
  const faces = (sides: number, ...values: number[]) => {
    const spy = vi.spyOn(Math, "random");
    for (const v of values) spy.mockReturnValueOnce((v - 1) / sides + 0.001);
  };

  it("rolls twice more on the same table, skipping another roll twice", () => {
    const places = table("p", "Places", ["Ruins", "Cave", "Tira dos veces"]);
    faces(3, 3, 1, 2);
    expect(resolveResult(places, 3)).toBe("Tira dos veces → Ruins · Cave");
  });

  it("fills {Table} with a roll on that table, by name or game tag, accents ignored", () => {
    const npcs = table("n", "Nombre", ["Odile", "Bram"], "PNJ");
    const own = table("o", "Guardia", ["Un {pnj: nombre} vigila", "{Nada} aquí"]);
    faces(2, 2);
    expect(resolveResult(own, 1, [npcs, own])).toBe("Un Bram vigila");
    expect(resolveResult(own, 2, [npcs, own])).toBe("{Nada} aquí");
  });

  it("stops following references after a few levels", () => {
    const loop = table("l", "Loop", ["again {Loop}"]);
    expect(resolveResult(loop, 1, [loop])).toBe("again again again again {Loop}");
  });
});
