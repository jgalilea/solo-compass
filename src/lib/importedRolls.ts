import { entryType } from "./journalSearch";
import { classifyRoll } from "./journalStats";
import { isImportedEntry, playDay, type JournalEntry } from "./lonelog";
import { matchesAllWords } from "./text";

/**
 * A roll an imported journal (the sample's too) came with: it was never
 * made here, so the history has none of it. Read from the journal to show
 * it among its adventure's rolls; never stored.
 */
export interface ImportedRoll {
  entry: JournalEntry;
  kind: "oraculo" | "tabla" | "dados";
  /** What was asked, for an oracle's. */
  question: string | null;
  sessionTitle: string | null;
  day: string | null;
}

const KIND = { oracle: "oraculo", table: "tabla", dice: "dados" } as const;

/** Those of one adventure, the latest first. */
export function importedRolls(entries: readonly JournalEntry[], adventureId: string): ImportedRoll[] {
  const rolls: ImportedRoll[] = [];
  let session: JournalEntry | null = null;
  let previous: JournalEntry | null = null;
  for (const entry of entries.filter((e) => e.adventureId === adventureId).sort((a, b) => a.timestamp - b.timestamp)) {
    if (entry.kind === "session") session = entry;
    if (entry.kind === "roll" && isImportedEntry(entry) && !entry.linkedRollId) {
      const kind = KIND[classifyRoll(entry, undefined).kind];
      rolls.push({
        entry,
        kind,
        question: kind === "oraculo" && previous && entryType(previous) === "question" ? previous.text : null,
        sessionTitle: session?.text ?? null,
        day: playDay(entry, session),
      });
    }
    previous = entry;
  }
  return rolls.reverse();
}

export function searchImportedRolls(rolls: ImportedRoll[], query: string): ImportedRoll[] {
  if (!query.trim()) return rolls;
  return rolls.filter((r) => matchesAllWords([r.question, r.entry.text].filter(Boolean).join(" "), query));
}
