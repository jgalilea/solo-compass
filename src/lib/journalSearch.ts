import { playDay, type JournalEntry } from "./lonelog";
import { matchesAllWords } from "./text";

export interface EntryMatch {
  entry: JournalEntry;
  /** Title of the session it's in (null: before the first session). */
  sessionTitle: string | null;
  /** The day it was played (see playDay), null if unknown. */
  day: string | null;
}

/**
 * Searches the text of journal entries: every word of the query must
 * appear (in any order, ignoring case and accents), so "posadero
 * nombre" finds "El posadero dice que su nombre es Bram". Results come
 * in the journal's order (oldest first: where a name first shows up is
 * usually where it was introduced), each with the session it belongs to.
 */
/** How many matches the search inside an adventure lists. */
export const ADVENTURE_SEARCH_LIMIT = 50;

export function searchEntries(entries: JournalEntry[], query: string, limit = Infinity): EntryMatch[] {
  if (!query.trim()) return [];
  const byAdventure = new Map<string, JournalEntry[]>();
  for (const entry of entries) {
    const list = byAdventure.get(entry.adventureId) ?? [];
    list.push(entry);
    byAdventure.set(entry.adventureId, list);
  }
  const matches: EntryMatch[] = [];
  for (const list of byAdventure.values()) {
    let session: JournalEntry | null = null;
    for (const entry of [...list].sort((a, b) => a.timestamp - b.timestamp)) {
      if (entry.kind === "session") session = entry;
      if (matchesAllWords(entry.text, query)) {
        matches.push({ entry, sessionTitle: session?.text ?? null, day: playDay(entry, session) });
      }
    }
  }
  matches.sort((a, b) => a.entry.timestamp - b.entry.timestamp);
  return matches.slice(0, limit);
}
