import { describe, expect, it } from "vitest";
import { matchingEntries } from "./tableSearch";
import type { MeaningTable } from "./tables";
import { normalizeForSearch } from "./text";

const table: MeaningTable = {
  id: "costa",
  name: "Costa",
  description: "",
  dice: "d6",
  game: { name: "Solo Compass" },
  entries: [
    { range: [1, 1], text: "Un faro apagado" },
    { range: [2, 2], text: "Redes rotas" },
    { range: [3, 4], text: "El Faro de la Ánima" },
    { range: [5, 5], text: "Gaviotas" },
    { range: [6, 6], text: "Otro faro, lejos" },
  ],
};

describe("searching the tables' results", () => {
  it("finds the results with the search, accents and case aside, in the table's order", () => {
    const q = normalizeForSearch("faro");
    expect(matchingEntries(table, q).map((e) => e.range)).toEqual([[1, 1], [3, 4], [6, 6]]);
    expect(matchingEntries(table, normalizeForSearch("anima"))).toEqual([table.entries[2]]);
    expect(matchingEntries(table, q, 1)).toEqual([table.entries[0]]);
  });

  it("nothing for an empty search or one no result has", () => {
    expect(matchingEntries(table, "")).toEqual([]);
    expect(matchingEntries(table, normalizeForSearch("dragón"))).toEqual([]);
  });
});
