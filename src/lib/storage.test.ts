import "fake-indexeddb/auto";
import { set } from "idb-keyval";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { restoreBackup } from "./backup";
import { recentDeletions } from "./deletions";
import { createDiceRollEntry, loadHistory, normalizeHistoryEntry } from "./history";
import { DICTIONARIES } from "./i18n";
import {
  loadAdventures,
  loadJournalEntries,
  normalizeAdventure,
  normalizeJournalEntry,
  orderAdventures,
  saveAdventureChanges,
  type Adventure,
} from "./journal";

const t = DICTIONARIES.es;
const adventure = (id: string, createdAt = 1): Adventure => ({
  id,
  name: id,
  createdAt,
  updatedAt: createdAt,
  favorite: false,
  status: "ongoing",
});

// The storage modules only touch IndexedDB in a browser.
beforeAll(() => {
  vi.stubGlobal("window", globalThis);
});

describe("normalizeAdventure", () => {
  it("fills in what older data lacks and keeps unknown fields", () => {
    expect(normalizeAdventure({ id: "a", name: "A", createdAt: 5, extra: 1 })).toEqual({
      id: "a",
      name: "A",
      createdAt: 5,
      updatedAt: 5,
      favorite: false,
      status: "ongoing",
      extra: 1,
    });
  });

  it("rejects what has no id or name, and drops broken descriptions", () => {
    expect(normalizeAdventure({ name: "A" })).toBeNull();
    expect(normalizeAdventure(null)).toBeNull();
    const a = normalizeAdventure({
      id: "a",
      name: "A",
      descriptions: { good: { text: "Old", updatedAt: 1 }, bad: { text: 3 } },
    });
    expect(a?.descriptions).toEqual({ good: { text: "Old", updatedAt: 1 } });
  });
});

describe("normalizeJournalEntry", () => {
  const entry = { id: "e", adventureId: "a", timestamp: 1, kind: "note", text: "Hi" };

  it("keeps a usable entry", () => {
    expect(normalizeJournalEntry(entry)).toEqual(entry);
  });

  it("rejects one without text, with an unknown kind or without a date", () => {
    expect(normalizeJournalEntry({ ...entry, text: undefined })).toBeNull();
    expect(normalizeJournalEntry({ ...entry, kind: "spell" })).toBeNull();
    expect(normalizeJournalEntry({ ...entry, timestamp: "now" })).toBeNull();
  });
});

describe("normalizeHistoryEntry", () => {
  it("keeps oracle and table rolls and rejects the rest", () => {
    const table = { kind: "tabla", id: "r", timestamp: 1, tableName: "T", resultText: "x", rolls: [3], total: 3 };
    expect(normalizeHistoryEntry(table)).toEqual({ ...table, favorite: false });
    expect(normalizeHistoryEntry({ ...table, resultText: null })).toBeNull();
    expect(normalizeHistoryEntry({ ...table, kind: "other" })).toBeNull();
    expect(normalizeHistoryEntry({ kind: "oraculo", id: "o", timestamp: 1, question: "?", answer: "si" })).toBeNull();
  });

  it("keeps dice rolls with their text, starred or not", () => {
    const dice = createDiceRollEntry("Attack d20+5 -> 19 (14 + 5)", undefined, undefined, 5);
    expect(normalizeHistoryEntry({ ...dice, favorite: true })).toEqual({ ...dice, favorite: true });
    expect(normalizeHistoryEntry({ ...dice, text: " " })).toBeNull();
  });

  it("keeps the adventure a roll was for, if it reads as one", () => {
    const dice = createDiceRollEntry("d6 -> 4", "adv-1", undefined, 5);
    expect(normalizeHistoryEntry(dice)).toMatchObject({ adventureId: "adv-1" });
    expect(normalizeHistoryEntry({ ...dice, adventureId: 7 })).not.toHaveProperty("adventureId");
    const table = { kind: "tabla", id: "r", timestamp: 1, tableName: "T", resultText: "x", rolls: [3], total: 3 };
    expect(normalizeHistoryEntry({ ...table, adventureId: "adv-2" })).toMatchObject({ adventureId: "adv-2" });
  });
});

describe("orderAdventures", () => {
  it("follows the saved order, with the ones it doesn't know first, newest first", () => {
    const [a, b, c, d] = [adventure("a", 1), adventure("b", 2), adventure("c", 3), adventure("d", 4)];
    expect(orderAdventures([a, b, c, d], ["b", "a"]).map((x) => x.id)).toEqual(["d", "c", "b", "a"]);
  });
});

describe("recentDeletions", () => {
  it("keeps a year of deletions", () => {
    const day = 24 * 60 * 60 * 1000;
    const now = 1000 * day;
    expect(recentDeletions([{ id: "old", at: now - 400 * day }, { id: "new", at: now - 10 * day }], now)).toEqual([
      { id: "new", at: now - 10 * day },
    ]);
  });
});

describe("journal storage", () => {
  it("moves the old arrays over keeping the adventures' order", async () => {
    await set("solo-compass:journal-adventures", [adventure("old-first", 1), adventure("new-second", 9)]);
    expect((await loadAdventures(t)).map((a) => a.id)).toEqual(["old-first", "new-second"]);
  });

  it("keeps the adventures two tabs create at once", async () => {
    const known = await loadAdventures(t);
    await saveAdventureChanges(t, known, [adventure("tab-a", 20), ...known]);
    await saveAdventureChanges(t, known, [adventure("tab-b", 21), ...known]);
    expect((await loadAdventures(t)).map((a) => a.id)).toEqual(expect.arrayContaining(["tab-a", "tab-b"]));
  });

  it("restores a damaged backup without the records it can't read", async () => {
    const backup = {
      app: "solo-compass",
      schemaVersion: 4,
      history: [{ id: "broken-roll" }, { kind: "tabla", id: "r", timestamp: 1, tableName: "T", resultText: "x", rolls: [1], total: 1 }],
      journal: {
        adventures: [adventure("restored"), { name: "no id" }],
        entries: [
          null,
          { id: "no-text", adventureId: "restored", timestamp: 1, kind: "note" },
          { id: "ok", adventureId: "restored", timestamp: 2, kind: "note", text: "Fine" },
        ],
      },
    };
    await restoreBackup(t, JSON.stringify(backup), "replace");
    expect((await loadAdventures(t)).map((a) => a.id)).toEqual(["restored"]);
    expect((await loadJournalEntries(t)).map((e) => e.id)).toEqual(["ok"]);
    expect((await loadHistory(t)).map((h) => h.id)).toEqual(["r"]);
  });
});
