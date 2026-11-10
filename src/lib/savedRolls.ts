/**
 * The player's own dice: a dice formula and, optionally, a text that
 * goes in front of the roll in the journal ("Athletics" 4dF+2, "Sword
 * attack" d20+5; without one, the formula names it and the journal
 * gets whatever "What's the roll for?" says). The favorites sit on the
 * journal's game table with the built-in favorite dice. Kept like the
 * player's tables: their own collection in IndexedDB
 * (collectionStore.ts), in the backup, merged by `updatedAt`.
 */

import { createCollection, diffById } from "./collectionStore";
import { rollFormula, withEdge, type Edge } from "./diceNotation";
import type { Dictionary } from "./i18n";
import { makeId } from "./ids";

export interface SavedRoll {
  id: string;
  name: string;
  formula: string;
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface SavedRollDraft {
  name: string;
  formula: string;
}

export class SavedRollsStorageError extends Error {}

/** What can be shown: a formula the dice can read, its text (maybe empty) and dates. */
export function normalizeSavedRoll(value: unknown): SavedRoll | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || typeof v.name !== "string" || typeof v.formula !== "string") return null;
  if (!isRollable(v.formula)) return null;
  const createdAt = typeof v.createdAt === "number" ? v.createdAt : 0;
  return {
    id: v.id,
    name: v.name.trim(),
    formula: v.formula.trim(),
    favorite: v.favorite === true,
    createdAt,
    updatedAt: typeof v.updatedAt === "number" ? v.updatedAt : createdAt,
  };
}

/** Whether the dice can read it. */
export function isRollable(formula: string): boolean {
  return rollFormula(formula, () => 0) !== null;
}

export function createSavedRoll(draft: SavedRollDraft, now = Date.now()): SavedRoll {
  return { id: makeId(), name: draft.name.trim(), formula: draft.formula.trim(), favorite: false, createdAt: now, updatedAt: now };
}

/** Favorites first, then in the order they were saved. */
export function sortSavedRolls(rolls: SavedRoll[]): SavedRoll[] {
  return [...rolls].sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.createdAt - b.createdAt);
}

/** What its button says: its text, or the formula when it has none. */
export function savedRollLabel(roll: Pick<SavedRoll, "name" | "formula">): string {
  return roll.name || roll.formula;
}

/** Rolled as the dice tool writes it: "Athletics 4dF+2 -> +3 (…)", or just "d20+5 -> …". */
export function rollSaved(roll: Pick<SavedRoll, "name" | "formula">, edge?: Edge, random?: () => number): string | null {
  const formula = roll.name ? `${roll.formula} // ${roll.name}` : roll.formula;
  return rollFormula(edge ? withEdge(formula, edge) : formula, random);
}

const store = createCollection<SavedRoll>({ name: "saved-rolls", normalize: normalizeSavedRoll });

export async function loadSavedRolls(t: Dictionary): Promise<SavedRoll[]> {
  if (typeof window === "undefined") return [];
  try {
    return sortSavedRolls(await store.load());
  } catch {
    throw new SavedRollsStorageError(t.history.storageUnavailableError);
  }
}

export async function saveSavedRollChanges(t: Dictionary, prev: SavedRoll[], next: SavedRoll[]): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await store.save(diffById(prev, next));
  } catch {
    throw new SavedRollsStorageError(t.history.storageSaveError);
  }
}

export async function replaceSavedRolls(t: Dictionary, rolls: SavedRoll[]): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await store.replace(rolls);
  } catch {
    throw new SavedRollsStorageError(t.history.storageSaveError);
  }
}
