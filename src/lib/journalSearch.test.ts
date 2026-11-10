import { describe, expect, it } from "vitest";
import type { JournalEntry } from "./lonelog";
import { searchEntries } from "./journalSearch";
import { highlightParts, matchesAllWords } from "./text";

function entry(id: string, kind: JournalEntry["kind"], text: string, timestamp: number, adventureId = "a"): JournalEntry {
  return { id, adventureId, kind, text, timestamp };
}

describe("journal search", () => {
  it("matches every word, in any order, ignoring case and accents", () => {
    expect(matchesAllWords("El posadero dice que su nombre es Bram", "NOMBRE posadero")).toBe(true);
    expect(matchesAllWords("Acción en la posada", "accion")).toBe(true);
    expect(matchesAllWords("El posadero", "posadero bram")).toBe(false);
    expect(matchesAllWords("Cualquier cosa", "   ")).toBe(false);
  });

  it("returns matches in journal order with their session", () => {
    const entries = [
      entry("3", "consequence", "Bram sirve otra jarra", 30),
      entry("1", "note", "Llego a la posada", 10),
      entry("2", "session", "Sesión 1", 20),
      entry("4", "note", "Bram en otra aventura", 5, "b"),
    ];
    const result = searchEntries(entries, "bram");
    expect(result.map((m) => [m.entry.id, m.sessionTitle])).toEqual([
      ["4", null],
      ["3", "Sesión 1"],
    ]);
    expect(searchEntries(entries, "bram", 1)).toHaveLength(1);
    expect(searchEntries(entries, "")).toEqual([]);
  });

  it("dates each match by its session's day of play", () => {
    const written = new Date(2026, 10, 10, 20).getTime();
    const entries = [
      entry("1", "note", "Bram antes de jugar", written),
      { ...entry("2", "session", "Sesión 1", written + 1), date: "2025-09-03" },
      entry("3", "note", "Bram en la sesión", written + 2),
      // Imported (id "start-index-random"), in a session with no date.
      { ...entry("1762717200000-0-abc", "session", "Sesión 2", written + 3), date: "" },
      entry("1762717200000-1-abc", "note", "Bram importado", written + 4),
    ];
    expect(searchEntries(entries, "bram").map((m) => m.day)).toEqual(["2026-11-10", "2025-09-03", null]);
  });

  it("highlights the matching parts, keeping the original accents", () => {
    expect(highlightParts("La Acción final", "accion")).toEqual([
      { text: "La ", match: false },
      { text: "Acción", match: true },
      { text: " final", match: false },
    ]);
    expect(highlightParts("sin nada", "")).toEqual([{ text: "sin nada", match: false }]);
  });
});
