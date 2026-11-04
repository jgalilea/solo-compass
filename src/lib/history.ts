import { get, set, del } from "idb-keyval";
import type { OracleRoll } from "./oracle";
import type { Dictionary } from "./i18n";

export interface TableRollEntry {
  kind: "tabla";
  id: string;
  timestamp: number;
  tableId: string;
  tableName: string;
  rolls: number[];
  total: number;
  resultText: string;
  favorite: boolean;
}

export type HistoryEntry = OracleRoll | TableRollEntry;

// Stored in IndexedDB (via idb-keyval) instead of localStorage: the
// history has no natural size cap and localStorage is limited to
// ~5 MiB per origin, shared with any other app on the same domain.
// IndexedDB gives orders of magnitude more room and is just as free
// and server-less.
const IDB_KEY = "solo-compass:history";
const LEGACY_LOCALSTORAGE_KEY = "solo-compass:history";

interface LegacyStoredPayload {
  version: number;
  entries: HistoryEntry[];
}

export class HistoryStorageError extends Error {}

/**
 * If there's history saved in localStorage from before the move to
 * IndexedDB, it's migrated once and the old key is cleared (to win
 * that space back from the shared quota). If something fails here it
 * isn't raised as an error: at worst the old history is lost, but it
 * mustn't stop the app from working with IndexedDB.
 */
function migrateFromLocalStorage(): HistoryEntry[] | null {
  try {
    const raw = window.localStorage.getItem(LEGACY_LOCALSTORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LegacyStoredPayload | HistoryEntry[];
    const entries = Array.isArray(parsed) ? parsed : parsed.entries;
    if (!Array.isArray(entries)) return null;
    const normalized = entries.map((e) => ({ ...e, favorite: e.favorite ?? false }));
    window.localStorage.removeItem(LEGACY_LOCALSTORAGE_KEY);
    return normalized;
  } catch {
    return null;
  }
}

export async function loadHistory(t: Dictionary): Promise<HistoryEntry[]> {
  if (typeof window === "undefined") return [];

  let stored: HistoryEntry[] | undefined;
  try {
    stored = await get<HistoryEntry[]>(IDB_KEY);
  } catch {
    throw new HistoryStorageError(t.history.storageUnavailableError);
  }

  if (stored) {
    if (!Array.isArray(stored)) {
      throw new HistoryStorageError(t.history.storageCorruptedError);
    }
    // Compatibility with histories saved before favourites were added.
    return stored.map((e) => ({ ...e, favorite: e.favorite ?? false }));
  }

  const migrated = migrateFromLocalStorage();
  if (migrated) {
    try {
      await set(IDB_KEY, migrated);
    } catch {
      // The migration couldn't be persisted yet, but the data is
      // returned anyway so it isn't lost from the current session.
    }
    return migrated;
  }

  return [];
}

export async function saveHistory(t: Dictionary, entries: HistoryEntry[]): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await set(IDB_KEY, entries);
  } catch {
    throw new HistoryStorageError(t.history.storageSaveError);
  }
}

export async function clearHistory(t: Dictionary): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await del(IDB_KEY);
  } catch {
    throw new HistoryStorageError(t.history.storageClearError);
  }
}
