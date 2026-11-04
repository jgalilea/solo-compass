import { get, set } from "idb-keyval";
import type { Dictionary } from "./i18n";
import type { JournalEntry } from "./lonelog";

/**
 * "ongoing": in progress, shown in the main list — "paused" isn't a
 * state of its own: it's just how an "ongoing" adventure that isn't
 * the active one right now looks (derived, not stored).
 * "archived": out of the main list (it goes in its own folded
 * section), can't be the active adventure — activating it unarchives it.
 */
export type AdventureStatus = "ongoing" | "archived";

export interface Adventure {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  favorite: boolean;
  status: AdventureStatus;
}

// Same as the history: no natural size cap, so it goes in IndexedDB
// instead of localStorage (see src/lib/history.ts for the full
// reasoning). All adventures and all entries share a single key
// each; they're filtered by adventureId in memory — more than enough
// for the real volumes of an RPG journal.
const ADVENTURES_KEY = "solo-compass:journal-adventures";
const ENTRIES_KEY = "solo-compass:journal-entries";

export class JournalStorageError extends Error {}

export async function loadAdventures(t: Dictionary): Promise<Adventure[]> {
  if (typeof window === "undefined") return [];
  try {
    const stored = await get<Adventure[]>(ADVENTURES_KEY);
    if (!Array.isArray(stored)) return [];
    // Compatibility with adventures saved before favourites were added,
    // and with the "paused" that existed as a state of its own before it
    // became derived — any value other than "archived" falls back to
    // "ongoing", which is how it looks now if it isn't the active one.
    return stored.map((a) => ({
      ...a,
      favorite: a.favorite ?? false,
      status: a.status === "archived" ? "archived" : "ongoing",
    }));
  } catch {
    throw new JournalStorageError(t.history.storageUnavailableError);
  }
}

export async function saveAdventures(t: Dictionary, adventures: Adventure[]): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await set(ADVENTURES_KEY, adventures);
  } catch {
    throw new JournalStorageError(t.history.storageSaveError);
  }
}

export async function loadJournalEntries(t: Dictionary): Promise<JournalEntry[]> {
  if (typeof window === "undefined") return [];
  try {
    const stored = await get<JournalEntry[]>(ENTRIES_KEY);
    return Array.isArray(stored) ? stored : [];
  } catch {
    throw new JournalStorageError(t.history.storageUnavailableError);
  }
}

export async function saveJournalEntries(t: Dictionary, entries: JournalEntry[]): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await set(ENTRIES_KEY, entries);
  } catch {
    throw new JournalStorageError(t.history.storageSaveError);
  }
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createAdventure(name: string): Adventure {
  const now = Date.now();
  return {
    id: makeId(),
    name: name.trim(),
    createdAt: now,
    updatedAt: now,
    favorite: false,
    status: "ongoing",
  };
}

export function createJournalEntryId(): string {
  return makeId();
}
