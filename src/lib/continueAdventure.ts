/**
 * Carrying on in a new adventure ("a second book"): a blank journal
 * that keeps the notebook as it is now. The pinned notes and the
 * descriptions are copied; every element of the notebook (characters,
 * places, threads, clocks, inventory, rooms, foes…) is written with its
 * current state as one tag, all in the new journal's first note, so
 * the notebook, derived from the entries as always (buildCast), comes
 * out the same, and so does its Lonelog export. The oracle and the
 * game table's picks are copied by the screen (they're the
 * adventure's, not entries). The adventure it comes from isn't touched.
 */

import { makeId } from "./ids";
import type { Adventure } from "./journal";
import type { JournalEntry, LonelogImport } from "./lonelog";
import { buildCast, snapshotTag } from "./lonelogTags";

/** What the new adventure starts with; `intro` heads its first note ("Carries on from…"). */
export function continuationOf(from: Adventure, entries: JournalEntry[], intro: string): LonelogImport {
  const text = [intro, ...buildCast(entries).map(snapshotTag)].join("\n");
  return {
    notes: from.notes ?? "",
    descriptions: { ...from.descriptions },
    // An id of its own, not an imported one's (isImportedEntry): it's
    // written today, and its day is today's.
    entries: (adventureId, timestamp) => [{ id: makeId(), adventureId, timestamp, kind: "note", text }],
  };
}
