/**
 * The player's own generators: several tables rolled at once, logged
 * as one entry (`gen: New place (Kind of place d20=15, …) -> Guard post
 * · …`, like quick inspiration). A name and the ids of its tables, in
 * order; the tables themselves stay where they are (built-in or the
 * player's), so a generator is only as current as they are, and a
 * table that's gone is skipped. Kept like the player's dice: their own
 * collection in IndexedDB (collectionStore.ts), in the backup, merged
 * by `updatedAt`.
 */

import { createCollection, diffById } from "./collectionStore";
import type { Dictionary } from "./i18n";
import { makeId } from "./ids";
import type { MeaningTable } from "./tables";
import { gameOfTable, type GameId } from "./tableGames";

export interface Generator {
  id: string;
  name: string;
  tableIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface GeneratorDraft {
  name: string;
  tableIds: string[];
}

/** At least two tables: one is just a table. */
export const MIN_GENERATOR_TABLES = 2;

export class GeneratorsStorageError extends Error {}

/** What can be shown: a name, its tables (ids, no repeats) and dates. */
export function normalizeGenerator(value: unknown): Generator | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || typeof v.name !== "string" || !v.name.trim() || !Array.isArray(v.tableIds)) return null;
  const tableIds = [...new Set(v.tableIds.filter((id): id is string => typeof id === "string" && !!id))];
  if (tableIds.length === 0) return null;
  const createdAt = typeof v.createdAt === "number" ? v.createdAt : 0;
  return {
    id: v.id,
    name: v.name.trim(),
    tableIds,
    createdAt,
    updatedAt: typeof v.updatedAt === "number" ? v.updatedAt : createdAt,
  };
}

export function createGenerator(draft: GeneratorDraft, now = Date.now()): Generator {
  return { id: makeId(), name: draft.name.trim(), tableIds: [...new Set(draft.tableIds)], createdAt: now, updatedAt: now };
}

/** In the order they were made. */
export function sortGenerators(generators: Generator[]): Generator[] {
  return [...generators].sort((a, b) => a.createdAt - b.createdAt);
}

/** Its tables among those loaded, in its order (one that's gone, or not loaded yet, is left out). */
export function generatorTables(generator: Pick<Generator, "tableIds">, tables: readonly MeaningTable[]): MeaningTable[] {
  const byId = new Map(tables.map((t) => [t.id, t]));
  return generator.tableIds.map((id) => byId.get(id)).filter((t) => t !== undefined);
}

/** The built-in games the generators' tables come from (to load them). */
export function generatorGames(generators: readonly Generator[]): GameId[] {
  return [...new Set(generators.flatMap((g) => g.tableIds.map(gameOfTable)).filter((id) => id !== undefined))];
}

const store = createCollection<Generator>({ name: "generators", normalize: normalizeGenerator });

export async function loadGenerators(t: Dictionary): Promise<Generator[]> {
  if (typeof window === "undefined") return [];
  try {
    return sortGenerators(await store.load());
  } catch {
    throw new GeneratorsStorageError(t.history.storageUnavailableError);
  }
}

export async function saveGeneratorChanges(t: Dictionary, prev: Generator[], next: Generator[]): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await store.save(diffById(prev, next));
  } catch {
    throw new GeneratorsStorageError(t.history.storageSaveError);
  }
}

export async function replaceGenerators(t: Dictionary, generators: Generator[]): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await store.replace(generators);
  } catch {
    throw new GeneratorsStorageError(t.history.storageSaveError);
  }
}
