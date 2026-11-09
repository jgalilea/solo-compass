import { get, set } from "idb-keyval";
import { createCollection, diffById } from "./collectionStore";
import type { Dictionary } from "./i18n";
import { makeId } from "./ids";
import type { JournalEntry, JournalLineKind } from "./lonelog";

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
  /**
   * Pinned notes: free text kept at hand (inventory, clues, to-dos),
   * edited in place. Not a journal entry: no date, no place in the
   * log's order. Exported as the .md's front matter (lonelog.ts).
   */
  notes?: string;
  /** Last edit of the notes (ms): the newer notes win on a merge. */
  notesUpdatedAt?: number;
  /**
   * Free text about a character, place or thread, by its castKey: a
   * description, not a state, so it isn't a tag in the journal (editing
   * it leaves no trace). In the .md, the front matter's `descriptions`.
   */
  descriptions?: Record<string, CastDescription>;
}

/** Each one carries its date: the newer wins on a merge, one by one. */
export interface CastDescription {
  text: string;
  updatedAt: number;
}

// Same as the history: no natural size cap, so it goes in IndexedDB
// instead of localStorage (see src/lib/history.ts for the full
// reasoning). All adventures and all entries share a single key
// each; they're filtered by adventureId in memory — more than enough
// for the real volumes of an RPG journal.
/** Where the whole arrays were kept before (see collectionStore.ts). */
const LEGACY_ADVENTURES_KEY = "solo-compass:journal-adventures";
const LEGACY_ENTRIES_KEY = "solo-compass:journal-entries";
/**
 * The adventures' order in the list (the player can drag them), as
 * ids: kept apart, since each adventure is its own record. One a tab
 * didn't know about yet goes first, as a new one would.
 */
const ADVENTURE_ORDER_KEY = "solo-compass:journal-adventure-order";

export class JournalStorageError extends Error {}

const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const ENTRY_KINDS: ReadonlySet<string> = new Set<JournalLineKind>([
  "action",
  "question",
  "roll",
  "consequence",
  "note",
  "session",
  "scene",
]);

/**
 * An adventure as stored or restored, with the defaults older data
 * lacks; null if it has no id or name. Fields it doesn't know are kept,
 * for a backup made by a newer version.
 */
export function normalizeAdventure(value: unknown): Adventure | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || typeof v.name !== "string") return null;
  const createdAt = isNumber(v.createdAt) ? v.createdAt : 0;
  const descriptions = Object.entries(
    v.descriptions && typeof v.descriptions === "object" ? (v.descriptions as Record<string, unknown>) : {},
  ).filter((entry): entry is [string, CastDescription] => {
    const d = entry[1] as Record<string, unknown> | null;
    return !!d && typeof d.text === "string" && isNumber(d.updatedAt);
  });
  const { notes, notesUpdatedAt, descriptions: _descriptions, ...rest } = v;
  return {
    ...rest,
    id: v.id,
    name: v.name,
    createdAt,
    updatedAt: isNumber(v.updatedAt) ? v.updatedAt : createdAt,
    favorite: v.favorite === true,
    status: v.status === "archived" ? "archived" : "ongoing",
    ...(typeof notes === "string" ? { notes } : {}),
    ...(isNumber(notesUpdatedAt) ? { notesUpdatedAt } : {}),
    ...(descriptions.length ? { descriptions: Object.fromEntries(descriptions) } : {}),
  };
}

/** A journal entry as stored or restored; null if it can't be shown. */
export function normalizeJournalEntry(value: unknown): JournalEntry | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (
    typeof v.id !== "string" ||
    typeof v.adventureId !== "string" ||
    !isNumber(v.timestamp) ||
    typeof v.kind !== "string" ||
    !ENTRY_KINDS.has(v.kind) ||
    typeof v.text !== "string"
  ) {
    return null;
  }
  const { linkedRollId, editedAt, ...rest } = v;
  return {
    ...rest,
    id: v.id,
    adventureId: v.adventureId,
    timestamp: v.timestamp,
    kind: v.kind as JournalLineKind,
    text: v.text,
    ...(typeof linkedRollId === "string" ? { linkedRollId } : {}),
    ...(isNumber(editedAt) ? { editedAt } : {}),
  };
}

const adventureStore = createCollection<Adventure>({
  name: "adventures",
  legacyKey: LEGACY_ADVENTURES_KEY,
  normalize: normalizeAdventure,
  fromLegacy: async (items) => {
    await set(ADVENTURE_ORDER_KEY, items.map((a) => a.id));
    return items;
  },
});

const entryStore = createCollection<JournalEntry>({
  name: "journal-entries",
  legacyKey: LEGACY_ENTRIES_KEY,
  normalize: normalizeJournalEntry,
});

/** The adventures in the saved order; ones missing from it first, newest first. */
export function orderAdventures(adventures: Adventure[], order: readonly string[]): Adventure[] {
  const rank = new Map(order.map((id, i) => [id, i]));
  const fresh = adventures.filter((a) => !rank.has(a.id)).sort((a, b) => b.createdAt - a.createdAt);
  const known = adventures.filter((a) => rank.has(a.id)).sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
  return [...fresh, ...known];
}

export async function loadAdventures(t: Dictionary): Promise<Adventure[]> {
  if (typeof window === "undefined") return [];
  try {
    // One after the other: the first load writes the order while moving the old array.
    const adventures = await adventureStore.load();
    const order = await get<unknown>(ADVENTURE_ORDER_KEY);
    return orderAdventures(adventures, Array.isArray(order) ? order : []);
  } catch {
    throw new JournalStorageError(t.history.storageUnavailableError);
  }
}

/** Writes only what changed between the two lists, and the order if it moved. */
export async function saveAdventureChanges(t: Dictionary, prev: Adventure[], next: Adventure[]): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await adventureStore.save(diffById(prev, next));
    const ids = next.map((a) => a.id);
    if (ids.length !== prev.length || ids.some((id, i) => prev[i].id !== id)) await set(ADVENTURE_ORDER_KEY, ids);
  } catch {
    throw new JournalStorageError(t.history.storageSaveError);
  }
}

export async function replaceAdventures(t: Dictionary, adventures: Adventure[]): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await adventureStore.replace(adventures);
    await set(ADVENTURE_ORDER_KEY, adventures.map((a) => a.id));
  } catch {
    throw new JournalStorageError(t.history.storageSaveError);
  }
}

export async function loadJournalEntries(t: Dictionary): Promise<JournalEntry[]> {
  if (typeof window === "undefined") return [];
  try {
    return (await entryStore.load()).sort((a, b) => a.timestamp - b.timestamp);
  } catch {
    throw new JournalStorageError(t.history.storageUnavailableError);
  }
}

export async function saveJournalEntryChanges(t: Dictionary, prev: JournalEntry[], next: JournalEntry[]): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await entryStore.save(diffById(prev, next));
  } catch {
    throw new JournalStorageError(t.history.storageSaveError);
  }
}

export async function replaceJournalEntries(t: Dictionary, entries: JournalEntry[]): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await entryStore.replace(entries);
  } catch {
    throw new JournalStorageError(t.history.storageSaveError);
  }
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
