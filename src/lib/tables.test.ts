import { afterEach, describe, expect, it, vi } from "vitest";
import { DICTIONARIES, LOCALES } from "./i18n";
import { diceMax, getMeaningTables, lookupEntry, rollForTable } from "./tables";

afterEach(() => {
  vi.restoreAllMocks();
});

const EXPECTED_ENTRIES = { d6: 6, d66: 36, d20: 20 } as const;

describe("tablas de significado", () => {
  it.each(LOCALES)("en «%s» cada tabla tiene un texto por cada valor del dado", (locale) => {
    const t = DICTIONARIES[locale];
    for (const table of getMeaningTables(t)) {
      expect(table.entries, table.id).toHaveLength(EXPECTED_ENTRIES[table.dice]);
      expect(table.entries.some((e) => e.text === t.tables.noEntryFallback), table.id).toBe(false);
    }
  });

  it("los dos idiomas tienen las mismas tablas con el mismo número de entradas", () => {
    const [a, b] = LOCALES.map((l) => DICTIONARIES[l].tables.entries);
    for (const key of Object.keys(a) as (keyof typeof a)[]) {
      expect(b[key], key).toHaveLength(a[key].length);
    }
  });

  it("d66 se lee como decenas y unidades y siempre encuentra entrada", () => {
    const spy = vi.spyOn(Math, "random");
    spy.mockReturnValueOnce(2 / 6 + 0.01).mockReturnValueOnce(5 / 6 + 0.01);
    expect(rollForTable("d66")).toEqual({ rolls: [3, 6], total: 36 });

    const table = getMeaningTables(DICTIONARIES.es).find((t) => t.dice === "d66")!;
    for (let tens = 1; tens <= 6; tens++) {
      for (let ones = 1; ones <= 6; ones++) {
        expect(lookupEntry(table, tens * 10 + ones)).toBeDefined();
      }
    }
    expect(lookupEntry(table, 17)).toBeUndefined();
  });

  it.each(["d6", "d20"] as const)("%s tira entre 1 y su máximo", (dice) => {
    for (let i = 0; i < 500; i++) {
      const { rolls, total } = rollForTable(dice);
      expect(rolls).toEqual([total]);
      expect(total).toBeGreaterThanOrEqual(1);
      expect(total).toBeLessThanOrEqual(diceMax(dice));
    }
  });
});
