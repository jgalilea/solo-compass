/**
 * What's on an adventure's game table: the dice and tables it picked for
 * itself (`gameDice`, `gameTables` on Adventure), or, until it picks,
 * the favourites (diceFavorites.ts and the player's starred dice,
 * tableFavorites.ts). A pick is a list of ids: built-in dice by name,
 * the player's own dice and every table by id.
 */

import { BUILTIN_DICE, type BuiltinDie } from "./dice";
import type { AdventurePick } from "./journal";
import type { SavedRoll } from "./savedRolls";

/** The ids it picked; null: it goes with the favourites. */
export function pickedIds(pick: AdventurePick | undefined): string[] | null {
  return pick?.ids ?? null;
}

/** The dice on its game table, built-in in their usual order, then its own; one deleted is just gone. */
export function gameTableDice(
  pick: AdventurePick | undefined,
  favoriteBuiltins: ReadonlySet<BuiltinDie>,
  savedRolls: readonly SavedRoll[],
): { builtins: BuiltinDie[]; own: SavedRoll[] } {
  const ids = pickedIds(pick);
  if (!ids) return { builtins: BUILTIN_DICE.filter((d) => favoriteBuiltins.has(d)), own: savedRolls.filter((r) => r.favorite) };
  const picked = new Set(ids);
  return { builtins: BUILTIN_DICE.filter((d) => picked.has(d)), own: savedRolls.filter((r) => picked.has(r.id)) };
}

/** The ids of the tables on its game table. */
export function gameTableIds(pick: AdventurePick | undefined, favorites: ReadonlySet<string>): Set<string> {
  return new Set(pickedIds(pick) ?? favorites);
}

/** One in or out, starting from what's on the table now (the favourites, the first time). */
export function togglePicked(current: Iterable<string>, id: string): string[] {
  const next = new Set(current);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return [...next];
}
