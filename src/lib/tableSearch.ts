/**
 * Searching the tables' results too ("which table had a lighthouse?"),
 * not only their names: a switch under the Tables screen's search, off
 * until turned on (with hundreds of tables, a word turns up in many
 * results), per device in localStorage. Best-effort, like the
 * favourites: if storage fails it's just off again.
 */

import type { MeaningTable, TableEntry } from "./tables";
import { normalizeForSearch } from "./text";

const STORAGE_KEY = "solo-compass:table-search-results";

export function loadSearchResults(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveSearchResults(on: boolean): void {
  try {
    if (on) window.localStorage.setItem(STORAGE_KEY, "1");
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Not critical: if it fails, it just doesn't persist.
  }
}

// Each table's results as searched, worked out once per table (a table
// object stays the same while its game is loaded): searching every game
// would otherwise fold tens of thousands of texts on each key.
const searchable = new WeakMap<MeaningTable, string[]>();

function searchableEntries(table: MeaningTable): string[] {
  let texts = searchable.get(table);
  if (!texts) searchable.set(table, (texts = table.entries.map((e) => normalizeForSearch(e.text))));
  return texts;
}

/**
 * The results of a table with the search in them, the first `limit`
 * (in the table's order). `query` comes already normalized, as the
 * name search takes it (normalizeForSearch).
 */
export function matchingEntries(table: MeaningTable, query: string, limit = 3): TableEntry[] {
  if (!query) return [];
  const texts = searchableEntries(table);
  const found: TableEntry[] = [];
  for (let i = 0; i < texts.length && found.length < limit; i++) {
    if (texts[i]!.includes(query)) found.push(table.entries[i]!);
  }
  return found;
}
