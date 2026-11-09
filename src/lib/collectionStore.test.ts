import "fake-indexeddb/auto";
import { get, set } from "idb-keyval";
import { describe, expect, it } from "vitest";
import { createCollection, diffById } from "./collectionStore";

type Item = { id: string; v: number };
const normalize = (x: unknown): Item | null =>
  !!x && typeof x === "object" && typeof (x as Item).id === "string" && typeof (x as Item).v === "number" ? (x as Item) : null;
let count = 0;
const nextName = () => `test-${++count}`;

describe("diffById", () => {
  it("puts new and changed records and removes the ones gone", () => {
    const a = { id: "a", v: 1 };
    const b = { id: "b", v: 1 };
    const changed = { id: "b", v: 2 };
    const c = { id: "c", v: 1 };
    expect(diffById([a, b], [a, changed, c])).toEqual({ put: [changed, c], remove: [] });
    expect(diffById([a, b, c], [b])).toEqual({ put: [], remove: ["a", "c"] });
  });
});

describe("createCollection", () => {
  it("keeps what two tabs save at once, each from its own old copy", async () => {
    const name = nextName();
    const tabA = createCollection({ name, normalize });
    const tabB = createCollection({ name, normalize });
    await tabA.save({ put: [{ id: "a", v: 1 }], remove: [] });
    await tabB.save({ put: [{ id: "b", v: 1 }], remove: [] });
    const all = await tabA.load();
    expect(all.map((x) => x.id).sort()).toEqual(["a", "b"]);
  });

  it("removes only the ids it's told to", async () => {
    const store = createCollection({ name: nextName(), normalize });
    await store.save({ put: [{ id: "a", v: 1 }, { id: "b", v: 1 }], remove: [] });
    await store.save({ put: [{ id: "c", v: 1 }], remove: ["a"] });
    expect((await store.load()).map((x) => x.id).sort()).toEqual(["b", "c"]);
  });

  it("moves the old single array over once, without the records it can't read", async () => {
    await set("legacy-list", [{ id: "a", v: 1 }, { id: "broken" }, null, { id: "b", v: 2 }]);
    const store = createCollection({
      name: nextName(),
      legacyKey: "legacy-list",
      normalize,
      fromLegacy: (items) => items.map((x) => ({ ...x, v: x.v * 10 })),
    });
    expect((await store.load()).sort((x, y) => x.id.localeCompare(y.id))).toEqual([
      { id: "a", v: 10 },
      { id: "b", v: 20 },
    ]);
    expect(await get("legacy-list")).toBeUndefined();
    expect(await store.load()).toHaveLength(2);
  });

  it("drops records it can't read when loading", async () => {
    const store = createCollection<Item>({ name: nextName(), normalize });
    await store.save({ put: [{ id: "a", v: 1 }, { id: "b" } as unknown as Item], remove: [] });
    expect(await store.load()).toEqual([{ id: "a", v: 1 }]);
  });

  it("replaces everything with the given records", async () => {
    const store = createCollection({ name: nextName(), normalize });
    await store.save({ put: [{ id: "a", v: 1 }, { id: "b", v: 1 }], remove: [] });
    await store.replace([{ id: "c", v: 3 }]);
    expect(await store.load()).toEqual([{ id: "c", v: 3 }]);
  });
});
