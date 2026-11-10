/**
 * The built-in dice marked as favorites: the ones on the journal's game
 * table (with the player's own favorite dice, see savedRolls.ts). Until
 * the player changes it, all of them. Best-effort storage, like the
 * favorite tables: if localStorage fails, they're all favorites.
 */

import { BUILTIN_DICE, isBuiltinDie, type BuiltinDie } from "./dice";

const STORAGE_KEY = "solo-compass:dice-favorites";

export function loadFavoriteDice(): Set<BuiltinDie> {
  if (typeof window === "undefined") return new Set(BUILTIN_DICE);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return new Set(BUILTIN_DICE);
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter(isBuiltinDie) : BUILTIN_DICE);
  } catch {
    return new Set(BUILTIN_DICE);
  }
}

export function saveFavoriteDice(dice: Set<BuiltinDie>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(BUILTIN_DICE.filter((d) => dice.has(d))));
  } catch {
    // Not critical: if it fails, it just doesn't persist.
  }
}
