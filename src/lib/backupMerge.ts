/**
 * Merges two copies of the app's data (this device's and a backup from
 * another one) instead of replacing one with the other, so you can play
 * on a phone and a computer and carry the backup between them without
 * losing what was done on either side.
 *
 * - Everything is matched by id (entries, adventures, rolls and tables
 *   all have one): what's only on one side is kept.
 * - When both have the same item, the newer change wins: an entry's
 *   last edit, an adventure's last update (its notes separately, by
 *   their own date), a table's last update. Rolls don't change, so this
 *   device's copy stays.
 * - What either side deleted stays deleted (deletions.ts): an adventure
 *   deleted on one device takes its entries with it.
 *
 * Pure, so it's tested on its own; backup.ts reads and saves.
 */

import type { CustomTable } from "./customTables";
import type { Deletion } from "./deletions";
import type { HistoryEntry } from "./history";
import type { Adventure } from "./journal";
import type { JournalEntry } from "./lonelog";

export interface MergeData {
  history: HistoryEntry[];
  adventures: Adventure[];
  entries: JournalEntry[];
  customTables: CustomTable[];
  deleted: Deletion[];
}

/** Both lists by id; `pick` chooses when an id is on both sides (local first). */
function unionById<T extends { id: string }>(local: T[], incoming: T[], pick: (local: T, incoming: T) => T): T[] {
  const byId = new Map(local.map((x) => [x.id, x]));
  for (const item of incoming) {
    const mine = byId.get(item.id);
    byId.set(item.id, mine ? pick(mine, item) : item);
  }
  return [...byId.values()];
}

export function mergeData(local: MergeData, incoming: MergeData): MergeData {
  const deleted = unionById(local.deleted, incoming.deleted, (a, b) => (b.at > a.at ? b : a));
  const gone = new Set(deleted.map((d) => d.id));

  const adventures = unionById(local.adventures, incoming.adventures, (mine, theirs) => {
    const base = theirs.updatedAt > mine.updatedAt ? theirs : mine;
    const mineAt = mine.notesUpdatedAt ?? 0;
    const theirsAt = theirs.notesUpdatedAt ?? 0;
    // Notes from before they had a date: better some than none.
    const notes = theirsAt > mineAt || (theirsAt === mineAt && !mine.notes && theirs.notes) ? theirs : mine;
    return { ...base, notes: notes.notes, notesUpdatedAt: notes.notesUpdatedAt };
  }).filter((a) => !gone.has(a.id));
  const kept = new Set(adventures.map((a) => a.id));

  const entries = unionById(local.entries, incoming.entries, (mine, theirs) =>
    (theirs.editedAt ?? theirs.timestamp) > (mine.editedAt ?? mine.timestamp) ? theirs : mine,
  ).filter((e) => !gone.has(e.id) && kept.has(e.adventureId));

  const history = unionById(local.history, incoming.history, (mine) => mine)
    .filter((h) => !gone.has(h.id))
    .sort((a, b) => b.timestamp - a.timestamp);

  const customTables = unionById(local.customTables, incoming.customTables, (mine, theirs) =>
    theirs.updatedAt > mine.updatedAt ? theirs : mine,
  ).filter((x) => !gone.has(x.id));

  return { history, adventures, entries, customTables, deleted };
}
