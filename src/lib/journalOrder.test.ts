import { describe, expect, it } from "vitest";
import { insertEntryAfter, moveEntryIn, placeAfter, placeMoved } from "./journalOrder";
import type { JournalEntry } from "./lonelog";

function entry(id: string, timestamp: number): JournalEntry {
  return { id, adventureId: "a", timestamp, kind: "note", text: id };
}

/** The ids in journal order once a placement is applied. */
function order(sorted: JournalEntry[], id: string, placement: ReturnType<typeof placeAfter>, isNew = false) {
  const list = isNew ? [...sorted, entry(id, placement.timestamp)] : sorted;
  return list
    .map((e) => ({ ...e, timestamp: e.id === id ? placement.timestamp : (placement.nudged.get(e.id) ?? e.timestamp) }))
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((e) => e.id);
}

describe("placeAfter", () => {
  const journal = [entry("a", 100), entry("b", 200), entry("c", 300)];

  it("goes halfway between its neighbours", () => {
    const placement = placeAfter(journal, "a");
    expect(placement.timestamp).toBe(150);
    expect(placement.nudged.size).toBe(0);
  });

  it("goes first, or last, at either end", () => {
    expect(order(journal, "x", placeAfter(journal, null), true)).toEqual(["x", "a", "b", "c"]);
    expect(placeAfter(journal, "c", undefined, 1000).timestamp).toBe(1000);
  });

  it("nudges entries that share a timestamp to make room", () => {
    const tied = [entry("q", 100), entry("roll", 100), entry("then", 101)];
    const placement = placeAfter(tied, "q");
    expect(order(tied, "x", placement, true)).toEqual(["q", "x", "roll", "then"]);
    // Only as far as needed.
    expect([...placement.nudged.keys()]).toEqual(["roll", "then"]);
  });

  it("keeps finding room after many inserts in the same gap", () => {
    let list = [entry("a", 100), entry("b", 101)];
    for (let i = 0; i < 80; i++) {
      const placement = placeAfter(list, "a");
      list = list
        .map((e) => ({ ...e, timestamp: placement.nudged.get(e.id) ?? e.timestamp }))
        .concat(entry(`x${i}`, placement.timestamp))
        .sort((p, q) => p.timestamp - q.timestamp);
      expect(list[1].id).toBe(`x${i}`);
      expect(new Set(list.map((e) => e.timestamp)).size).toBe(list.length);
    }
  });
});

describe("placeMoved", () => {
  const journal = [entry("a", 100), entry("b", 200), entry("c", 300), entry("d", 400)];

  it("moves an entry one place up or down", () => {
    expect(order(journal, "c", placeMoved(journal, "c", "up")!)).toEqual(["a", "c", "b", "d"]);
    expect(order(journal, "b", placeMoved(journal, "b", "up")!)).toEqual(["b", "a", "c", "d"]);
    expect(order(journal, "b", placeMoved(journal, "b", "down")!)).toEqual(["a", "c", "b", "d"]);
    expect(order(journal, "c", placeMoved(journal, "c", "down")!)).toEqual(["a", "b", "d", "c"]);
    // Moved to the end, it keeps close to its old date instead of "now".
    expect(placeMoved(journal, "c", "down")!.timestamp).toBe(401);
  });

  it("does nothing at either end", () => {
    expect(placeMoved(journal, "a", "up")).toBeNull();
    expect(placeMoved(journal, "d", "down")).toBeNull();
  });

  it("swaps entries logged in the same millisecond", () => {
    const tied = [entry("q", 100), entry("roll", 100)];
    expect(order(tied, "roll", placeMoved(tied, "roll", "up")!)).toEqual(["roll", "q"]);
    expect(order(tied, "q", placeMoved(tied, "q", "down")!)).toEqual(["roll", "q"]);
  });
});

describe("insertEntryAfter", () => {
  const at = (id: string, timestamp: number, adventureId = "a"): JournalEntry => ({
    id,
    adventureId,
    timestamp,
    kind: "note",
    text: id,
  });

  it("puts the new entry right after the anchor, and the next one after that", () => {
    const entries = [at("one", 10), at("two", 20), at("elsewhere", 15, "b")];
    const first = insertEntryAfter(entries, at("new", 99), "one", 99);
    const second = insertEntryAfter(first, at("newer", 99), "new", 99);
    const order = second
      .filter((e) => e.adventureId === "a")
      .sort((x, y) => x.timestamp - y.timestamp)
      .map((e) => e.id);
    expect(order).toEqual(["one", "new", "newer", "two"]);
    expect(second.find((e) => e.id === "elsewhere")?.timestamp).toBe(15);
  });

  it("goes to the end if the anchor was deleted", () => {
    const entries = [at("one", 10)];
    expect(insertEntryAfter(entries, at("new", 50), "gone", 50).map((e) => e.id)).toEqual(["one", "new"]);
  });
});

describe("moveEntryIn", () => {
  it("marks the moved entry as edited, and returns the same list when it can't move", () => {
    const entries: JournalEntry[] = [
      { id: "x", adventureId: "a", timestamp: 1, kind: "note", text: "x" },
      { id: "y", adventureId: "a", timestamp: 2, kind: "note", text: "y" },
    ];
    const moved = moveEntryIn(entries, "y", "up", 500);
    expect(moved.find((e) => e.id === "y")).toMatchObject({ editedAt: 500 });
    expect(moved.find((e) => e.id === "y")!.timestamp).toBeLessThan(1);
    expect(moveEntryIn(entries, "x", "up", 500)).toBe(entries);
  });
});
