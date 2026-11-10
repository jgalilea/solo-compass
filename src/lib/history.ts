import { createCollection, diffById } from "./collectionStore";
import type { OracleRoll } from "./oracle";
import type { Dictionary } from "./i18n";
import { makeId } from "./ids";

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

/** A roll of the player's dice (a built-in die, one of their own or a formula), as the journal writes it. */
export interface DiceRollEntry {
  kind: "dados";
  id: string;
  timestamp: number;
  /** "Attack d20+5 -> 19 (14 + 5)". */
  text: string;
  favorite: boolean;
}

/**
 * Any roll in the history. `adventureId`: the adventure it was rolled
 * for (logged in its journal, or rolled on its game table); none for a
 * free roll, made with no adventure.
 */
export type HistoryEntry = (OracleRoll | TableRollEntry | DiceRollEntry) & { adventureId?: string };

export function createDiceRollEntry(text: string, adventureId?: string, now = Date.now()): HistoryEntry {
  return { kind: "dados", id: makeId(), timestamp: now, text, favorite: false, ...(adventureId ? { adventureId } : {}) };
}

// Stored in IndexedDB instead of localStorage: the history has no
// natural size cap and localStorage is limited to ~5 MiB per origin,
// shared with any other app on the same domain. One record per roll
// (collectionStore.ts), so a long history doesn't make each new roll
// rewrite all the others.
const LEGACY_IDB_KEY = "solo-compass:history";
const LEGACY_LOCALSTORAGE_KEY = "solo-compass:history";

const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isDiceGroup = (v: unknown): boolean =>
  !!v && typeof v === "object" && Array.isArray((v as Record<string, unknown>).rolls) && isNumber((v as Record<string, unknown>).kept);

/** A roll as stored or restored; null if it can't be shown. */
export function normalizeHistoryEntry(value: unknown): HistoryEntry | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || !isNumber(v.timestamp)) return null;
  const favorite = v.favorite === true;
  const entry = normalizeRoll(v, favorite);
  if (!entry) return null;
  // The adventure it was for, only if it reads as one.
  const clean: HistoryEntry = { ...entry };
  delete clean.adventureId;
  return typeof v.adventureId === "string" && v.adventureId ? { ...clean, adventureId: v.adventureId } : clean;
}

function normalizeRoll(v: Record<string, unknown>, favorite: boolean): HistoryEntry | null {
  if (v.kind === "oraculo") {
    // Recluse rolls carry white/black; any oracle's, `dice` (oracleEngines.ts).
    const hasDice =
      (isDiceGroup(v.white) && isDiceGroup(v.black)) ||
      (Array.isArray(v.dice) && v.dice.length > 0 && v.dice.every((g) => isDiceGroup(g) && isNumber((g as Record<string, unknown>).sides)));
    if (typeof v.question !== "string" || typeof v.answer !== "string" || !hasDice) {
      return null;
    }
    return { ...(v as unknown as OracleRoll), favorite };
  }
  if (v.kind === "tabla") {
    if (typeof v.tableName !== "string" || typeof v.resultText !== "string" || !Array.isArray(v.rolls) || !isNumber(v.total)) {
      return null;
    }
    return { ...(v as unknown as TableRollEntry), favorite };
  }
  if (v.kind === "dados") {
    if (typeof v.text !== "string" || !v.text.trim()) return null;
    return { kind: "dados", id: v.id as string, timestamp: v.timestamp as number, text: v.text, favorite };
  }
  return null;
}

const historyStore = createCollection<HistoryEntry>({
  name: "history",
  legacyKey: LEGACY_IDB_KEY,
  normalize: normalizeHistoryEntry,
});

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

/** Newest first. */
export async function loadHistory(t: Dictionary): Promise<HistoryEntry[]> {
  if (typeof window === "undefined") return [];
  let stored: HistoryEntry[];
  try {
    stored = await historyStore.load();
  } catch {
    throw new HistoryStorageError(t.history.storageUnavailableError);
  }
  if (stored.length === 0) {
    const migrated = migrateFromLocalStorage()?.map(normalizeHistoryEntry).filter((e) => e !== null) ?? [];
    if (migrated.length) {
      try {
        await historyStore.save({ put: migrated, remove: [] });
      } catch {
        // Kept in memory for this session at least; see migrateFromLocalStorage.
      }
      stored = migrated;
    }
  }
  return stored.sort((a, b) => b.timestamp - a.timestamp);
}

/** Writes only what changed between the two lists. */
export async function saveHistoryChanges(t: Dictionary, prev: HistoryEntry[], next: HistoryEntry[]): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await historyStore.save(diffById(prev, next));
  } catch {
    throw new HistoryStorageError(t.history.storageSaveError);
  }
}

export async function replaceHistory(t: Dictionary, entries: HistoryEntry[]): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await historyStore.replace(entries);
  } catch {
    throw new HistoryStorageError(t.history.storageSaveError);
  }
}

export async function clearHistory(t: Dictionary): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await historyStore.replace([]);
  } catch {
    throw new HistoryStorageError(t.history.storageClearError);
  }
}
