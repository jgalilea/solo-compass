/**
 * The die of the table rolls made before the history kept it, so
 * they're drawn like the new ones. Loaded only if there are any
 * (useTableDiceFill): what it finds is saved, so each is done once.
 */

import { loadCustomTables } from "./customTables";
import { tableRollDie, type HistoryEntry, type TableRollEntry } from "./history";
import type { Dictionary } from "./i18n";
import type { JournalEntry } from "./lonelog";
import { tableDice } from "./rolledDice";
import { gameOfTable, loadGame } from "./tableGames";
import type { DiceType } from "./tables";

export function lacksDice(entry: HistoryEntry): entry is TableRollEntry & { adventureId?: string } {
  return entry.kind === "tabla" && !entry.dice;
}

/** "tbl: Action d100=42 -> …", "gen: … (Action d66=34, Theme d66=25) -> …": the die next to this table's name and number. */
function dieInText(entry: TableRollEntry, text: string): string | undefined {
  const at = text.indexOf(`${entry.tableName} d`);
  if (at < 0) return undefined;
  const m = text.slice(at + entry.tableName.length + 1).match(/^(d\d+)=(\d+)(?!\d)/);
  return m && Number(m[2]) === entry.total ? m[1] : undefined;
}

/**
 * Each roll's die, by id: what its dice say (a d66's two), what its
 * journal entry says, or what its table is rolled with today. Left out
 * if none does, or the number doesn't fit that die.
 */
export async function findTableDice(
  t: Dictionary,
  rolls: readonly TableRollEntry[],
  journal: readonly JournalEntry[],
): Promise<Map<string, DiceType>> {
  const logged = new Map<string, string>();
  for (const e of journal) if (e.kind === "roll" && e.linkedRollId) logged.set(e.linkedRollId, e.text);

  const found = new Map<string, DiceType>();
  const keep = (entry: TableRollEntry, die: string | null | undefined) => {
    if (!die || !tableDice(die, entry.total)) return false;
    found.set(entry.id, die as DiceType);
    return true;
  };
  const left = rolls.filter((entry) => {
    const text = logged.get(entry.id);
    return !keep(entry, tableRollDie(entry)) && !(text && keep(entry, dieInText(entry, text)));
  });
  if (left.length === 0) return found;

  const dice = new Map<string, string>();
  const games = new Set(left.map((e) => gameOfTable(e.tableId)).filter((id) => id !== undefined));
  const sources: Promise<{ id: string; dice: DiceType }[]>[] = [...games].map((id) => loadGame(id));
  if (left.some((e) => !gameOfTable(e.tableId))) sources.push(loadCustomTables(t));
  // A source that can't be read is tried again next time.
  for (const result of await Promise.allSettled(sources)) {
    if (result.status === "fulfilled") for (const table of result.value) dice.set(table.id, table.dice);
  }
  for (const entry of left) keep(entry, dice.get(entry.tableId));
  return found;
}
