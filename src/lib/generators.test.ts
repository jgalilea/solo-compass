import { describe, expect, it } from "vitest";
import { createGenerator, generatorGames, generatorTables, normalizeGenerator, sortGenerators } from "./generators";
import type { MeaningTable } from "./tables";

const table = (id: string) => ({ id, name: id }) as MeaningTable;

describe("generators", () => {
  it("read only what can be shown: a name and its tables, without repeats", () => {
    expect(normalizeGenerator({ id: "g", name: " Place ", tableIds: ["a", "b", "a", 3], createdAt: 2 })).toEqual({
      id: "g",
      name: "Place",
      tableIds: ["a", "b"],
      createdAt: 2,
      updatedAt: 2,
    });
    expect(normalizeGenerator({ id: "g", name: " ", tableIds: ["a"] })).toBeNull();
    expect(normalizeGenerator({ id: "g", name: "Place", tableIds: [] })).toBeNull();
    expect(normalizeGenerator({ id: "g", name: "Place" })).toBeNull();
  });

  it("are made from a draft and listed in the order they were made", () => {
    const a = createGenerator({ name: " A ", tableIds: ["x", "y", "x"] }, 5);
    expect(a).toMatchObject({ name: "A", tableIds: ["x", "y"], createdAt: 5, updatedAt: 5 });
    const b = createGenerator({ name: "B", tableIds: ["x", "y"] }, 1);
    expect(sortGenerators([a, b]).map((g) => g.name)).toEqual(["B", "A"]);
  });

  it("roll their tables in their order, skipping one that's gone", () => {
    const tables = [table("b"), table("a"), table("c")];
    expect(generatorTables({ tableIds: ["a", "gone", "c"] }, tables).map((t) => t.id)).toEqual(["a", "c"]);
  });

  it("say which games to load for their tables", () => {
    const g = createGenerator({ name: "Mixed", tableIds: ["tipo-lugar", "ironsworn-action", "cairn-settlement", "custom-1"] });
    expect(generatorGames([g]).sort()).toEqual(["cairn", "ironsworn", "solo-compass"]);
  });
});
