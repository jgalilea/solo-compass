import { describe, expect, it } from "vitest";
import { normalizeJournalEntry } from "./journal";
import type { JournalLineKind } from "./lonelog";

describe("normalizeJournalEntry", () => {
  it("keeps every kind of entry the journal writes, scenes included", () => {
    const kinds: JournalLineKind[] = ["action", "question", "roll", "consequence", "note", "session", "scene"];
    for (const kind of kinds) {
      const entry = { id: "e1", adventureId: "a1", timestamp: 1, kind, text: "S1 *Tavern*" };
      expect(normalizeJournalEntry(entry), kind).toMatchObject({ kind });
    }
    expect(normalizeJournalEntry({ id: "e1", adventureId: "a1", timestamp: 1, kind: "chapter", text: "x" })).toBeNull();
  });

  it("keeps a session's date only when it's a day", () => {
    const session = { id: "e1", adventureId: "a1", timestamp: 1, kind: "session", text: "S" };
    expect(normalizeJournalEntry({ ...session, date: "2025-09-03" })?.date).toBe("2025-09-03");
    expect(normalizeJournalEntry({ ...session, date: "" })?.date).toBe("");
    expect(normalizeJournalEntry({ ...session, date: "ayer" })).not.toHaveProperty("date");
  });
});
