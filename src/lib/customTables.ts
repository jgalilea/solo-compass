/**
 * The player's own tables: created in the app or imported from a file.
 *
 * Stored in IndexedDB (like the journal: a list can grow, and
 * localStorage is small and shared with the whole github.io origin),
 * included in the full backup and never sent anywhere.
 *
 * The text format is deliberately forgiving, so a table can be pasted
 * from almost anywhere: one result per line, with optional list markers
 * ("-", "1.") and an optional leading range ("1-3 Rats") to make a
 * result more likely; a Markdown table ("| d20 | Result |") works too.
 * The export is a Markdown table that this same parser reads back.
 * That text format is in customTableText.ts: only what edits, imports
 * or exports a table needs it, not the first screen.
 */

import { createCollection, diffById } from "./collectionStore";
import type { Dictionary } from "./i18n";
import { makeId } from "./ids";
import {
  diceSides,
  TABLE_THEMES,
  type DiceType,
  type TableTheme,
  type MeaningTable,
  type TableEntry,
} from "./tables";

export interface TableSource {
  /** Game, book or zine the table comes from. */
  name?: string;
  author?: string;
  license?: string;
  url?: string;
}

export interface CustomTable {
  id: string;
  name: string;
  description: string;
  dice: DiceType;
  /** Resolved ranges, in order, covering every value of the die once. */
  entries: TableEntry[];
  source?: TableSource;
  /** Optional, so it can be filtered and grouped with the built-in tables. */
  theme?: TableTheme;
  createdAt: number;
  updatedAt: number;
}

/** What the editor and the importer produce; ids and dates are added on save. */
export type CustomTableDraft = Omit<CustomTable, "id" | "createdAt" | "updatedAt">;

/** The die picked in the editor: a fixed one, or "auto" (as many faces as lines). */
export type DiceChoice = DiceType | "auto";

/** Dice offered in the editor, besides "auto". */
export const EDITOR_DICE: DiceType[] = ["d4", "d6", "d8", "d10", "d12", "d20", "d66", "d100"];

/** Where the whole array was kept before (see collectionStore.ts). */
const LEGACY_STORAGE_KEY = "solo-compass:custom-tables";

export class CustomTablesStorageError extends Error {}

/**
 * The biggest die a table of one's own can use (the built-in tables go
 * up to a d600). Without a limit, a file with a range like "1-500000000"
 * made the app list every value of that die, enough to bring the tab
 * down, and once saved, again every time the tables were shown.
 */
export const MAX_TABLE_SIDES = 10_000;

/** Whether a die can be a table's: a d66, or a dN up to MAX_TABLE_SIDES. */
export function isTableDie(dice: string): boolean {
  if (dice === "d66") return true;
  const sides = diceSides(dice);
  return sides >= 1 && sides <= MAX_TABLE_SIDES;
}

/**
 * One record per table, listed by creation date (`createdAt`), which
 * is how they were kept in the old array too. The moved array's dates
 * are made strictly increasing so tables imported together (same
 * millisecond) keep their order.
 */
const tableStore = createCollection<CustomTable>({
  name: "custom-tables",
  legacyKey: LEGACY_STORAGE_KEY,
  normalize: (value) => (isCustomTable(value) ? value : null),
  fromLegacy: (items) => {
    let last = -Infinity;
    return items.map((table) => {
      const createdAt = Math.max(table.createdAt ?? 0, last + 1);
      last = createdAt;
      return createdAt === table.createdAt ? table : { ...table, createdAt };
    });
  },
});

export function sortCustomTables(tables: CustomTable[]): CustomTable[] {
  return [...tables].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}

export async function loadCustomTables(t: Dictionary): Promise<CustomTable[]> {
  if (typeof window === "undefined") return [];
  try {
    return sortCustomTables(await tableStore.load());
  } catch {
    throw new CustomTablesStorageError(t.history.storageUnavailableError);
  }
}

/** Writes only what changed between the two lists. */
export async function saveCustomTableChanges(
  t: Dictionary,
  prev: CustomTable[],
  next: CustomTable[],
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await tableStore.save(diffById(prev, next));
  } catch {
    throw new CustomTablesStorageError(t.history.storageSaveError);
  }
}

export async function replaceCustomTables(t: Dictionary, tables: CustomTable[]): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await tableStore.replace(tables);
  } catch {
    throw new CustomTablesStorageError(t.history.storageSaveError);
  }
}

/** Bare-minimum shape check (for storage and backups). */
export function isCustomTable(value: unknown): value is CustomTable {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    typeof v.dice === "string" &&
    isTableDie(v.dice) &&
    Array.isArray(v.entries) &&
    v.entries.every(
      (e) =>
        e &&
        typeof e.text === "string" &&
        Array.isArray(e.range) &&
        e.range.length === 2 &&
        e.range.every((n: unknown) => Number.isInteger(n)),
    )
  );
}

/** `index` spaces out the dates of tables created together, to keep their order. */
export function createCustomTable(draft: CustomTableDraft, index = 0): CustomTable {
  const now = Date.now();
  return { ...draft, id: makeId("custom-"), createdAt: now + index, updatedAt: now };
}

/** Same shape as the built-in tables, so everything else rolls it the same way. */
export function toMeaningTable(table: CustomTable, t: Dictionary): MeaningTable {
  const source = table.source ?? {};
  return {
    id: table.id,
    name: table.name,
    description: table.description,
    dice: table.dice,
    game: {
      name: source.name || t.tables.customGame,
      // Checked again: a table saved before links were checked.
      url: webAddress(source.url),
      author: source.author || undefined,
      license: source.license || undefined,
    },
    entries: table.entries,
    theme: isTableTheme(table.theme) ? table.theme : undefined,
    custom: true,
  };
}

function isTableTheme(value: unknown): value is TableTheme {
  return typeof value === "string" && (TABLE_THEMES as readonly string[]).includes(value);
}

/**
 * A table's link, only if it's a web page: it's shown as a link, and a
 * file could bring any other kind ("javascript:…"). An address typed
 * without "https://" gets it; anything else is left out.
 */
export function webAddress(url: string | undefined): string | undefined {
  const value = url?.trim();
  if (!value) return undefined;
  const full = /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value.replace(/^\/+/, "")}`;
  try {
    const parsed = new URL(full);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? full : undefined;
  } catch {
    return undefined;
  }
}
