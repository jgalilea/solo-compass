import { describe, expect, it } from "vitest";
import { mergeData, type MergeData } from "./backupMerge";
import type { Adventure } from "./journal";
import type { JournalEntry } from "./lonelog";
import type { HistoryEntry } from "./history";

const adventure = (id: string, extra: Partial<Adventure> = {}): Adventure => ({
  id,
  name: id,
  createdAt: 1,
  updatedAt: 1,
  favorite: false,
  status: "ongoing",
  ...extra,
});
const entry = (id: string, adventureId: string, text: string, extra: Partial<JournalEntry> = {}): JournalEntry => ({
  id,
  adventureId,
  timestamp: 10,
  kind: "note",
  text,
  ...extra,
});
const roll = (id: string, timestamp: number) => ({ id, timestamp, kind: "tabla" }) as unknown as HistoryEntry;
const data = (d: Partial<MergeData>): MergeData => ({
  history: [],
  adventures: [],
  entries: [],
  customTables: [],
  deleted: [],
  ...d,
});

describe("mergeData", () => {
  it("keeps what's only on either side", () => {
    const merged = mergeData(
      data({ adventures: [adventure("a")], entries: [entry("e1", "a", "phone")], history: [roll("r1", 5)] }),
      data({ adventures: [adventure("a"), adventure("b")], entries: [entry("e2", "a", "pc"), entry("e3", "b", "pc")], history: [roll("r2", 9)] }),
    );
    expect(merged.adventures.map((a) => a.id)).toEqual(["a", "b"]);
    expect(merged.entries.map((e) => e.id)).toEqual(["e1", "e2", "e3"]);
    expect(merged.history.map((h) => h.id)).toEqual(["r2", "r1"]);
  });

  it("the newer change wins: entry edits, adventures and their notes apart", () => {
    const merged = mergeData(
      data({
        adventures: [adventure("a", { name: "Old", updatedAt: 1, notes: "new notes", notesUpdatedAt: 50 })],
        entries: [entry("e1", "a", "edited here", { editedAt: 30 })],
      }),
      data({
        adventures: [adventure("a", { name: "Renamed", updatedAt: 40, notes: "old notes", notesUpdatedAt: 20 })],
        entries: [entry("e1", "a", "edited there", { editedAt: 20 })],
      }),
    );
    expect(merged.adventures[0]).toMatchObject({ name: "Renamed", notes: "new notes" });
    expect(merged.entries[0].text).toBe("edited here");
  });

  it("each description apart: the newer wins, and what's only on one side stays", () => {
    const merged = mergeData(
      data({ adventures: [adventure("a", { descriptions: { "npc:bram": { text: "new", updatedAt: 9 }, "npc:odile": { text: "mine", updatedAt: 1 } } })] }),
      data({ adventures: [adventure("a", { descriptions: { "npc:bram": { text: "old", updatedAt: 3 }, "place:mill": { text: "theirs", updatedAt: 2 } } })] }),
    );
    expect(merged.adventures[0].descriptions).toEqual({
      "npc:bram": { text: "new", updatedAt: 9 },
      "npc:odile": { text: "mine", updatedAt: 1 },
      "place:mill": { text: "theirs", updatedAt: 2 },
    });
  });

  it("notes from before they had a date aren't lost to empty ones", () => {
    const merged = mergeData(data({ adventures: [adventure("a")] }), data({ adventures: [adventure("a", { notes: "x" })] }));
    expect(merged.adventures[0].notes).toBe("x");
  });

  it("what either side deleted stays deleted, with its adventure's entries", () => {
    const merged = mergeData(
      data({ adventures: [adventure("a")], entries: [entry("e1", "a", "1"), entry("e2", "a", "2")], deleted: [{ id: "e2", at: 5 }] }),
      data({
        adventures: [adventure("a"), adventure("b")],
        entries: [entry("e1", "a", "1"), entry("e2", "a", "2"), entry("e3", "b", "3")],
        history: [roll("r1", 1)],
        deleted: [{ id: "b", at: 7 }, { id: "r1", at: 7 }],
      }),
    );
    expect(merged.adventures.map((a) => a.id)).toEqual(["a"]);
    expect(merged.entries.map((e) => e.id)).toEqual(["e1"]);
    expect(merged.history).toEqual([]);
    expect(merged.deleted.map((d) => d.id).sort()).toEqual(["b", "e2", "r1"]);
  });
});
