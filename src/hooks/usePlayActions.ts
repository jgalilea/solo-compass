import { useCallback, useEffect } from "react";
import { announce } from "../lib/announce";
import type { Likelihood, OracleRoll } from "../lib/oracle";
import { lonerTwistCounterOf, rollOracleWith } from "../lib/oracleEngines";
import { formatTableRoll, resolveResult, rollForTable, tableRollName, type MeaningTable } from "../lib/tables";
import type { HistoryEntry, TableRollEntry } from "../lib/history";
import { getOracle } from "../lib/oracles";
import { formatOracleDice, formatOracleResult } from "../lib/i18n/answerText";
import { gameState, loadGame, TABLE_GAMES, toMeaningTables } from "../lib/tableGames";
import { useHistoryContext } from "./useHistoryContext";
import { useJournalContext } from "./useJournalContext";
import { useLocaleContext } from "./useLocaleContext";
import { useOracleContext } from "./useOracleContext";

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface Inspiration {
  /** History id of the first roll (the one the journal entry links to). */
  id: string;
  /** Every roll's history id (one per table). */
  rollIds: string[];
  /** "Action d66=34, Theme d66=25". */
  detail: string;
  /** "Reveal · Secret". */
  text: string;
}

/**
 * The rolls that can be made from several screens (Oracle, Tables and
 * the journal's own panel): each one is always saved to the history
 * and, if there's a target adventure (the active one by default), also
 * logged in its journal in Lonelog notation. That way all three
 * screens record exactly the same thing.
 */
export function usePlayActions() {
  const { entries: historyEntries, addEntry: addHistoryEntry } = useHistoryContext();
  const { activeAdventureId, addEntry: addJournalEntry } = useJournalContext();
  const { oracleId } = useOracleContext();
  const { t, locale } = useLocaleContext();

  // Loner's twist rolls on its own two tables: they're loaded ahead, so
  // the twist comes with the roll that brings it.
  useEffect(() => {
    if (oracleId === "loner") loadGame("loner").catch(() => undefined);
  }, [oracleId]);

  // A table roll as a history entry (not saved yet).
  const buildTableRoll = useCallback(
    (table: MeaningTable, tables: MeaningTable[] = []): TableRollEntry => {
      const { rolls, total } = rollForTable(table.dice);
      return {
        kind: "tabla",
        id: makeId(),
        timestamp: Date.now(),
        tableId: table.id,
        tableName: tableRollName(table),
        rolls,
        total,
        // Follows "Roll twice" and "{Other table}" (see resolveResult).
        resultText: resolveResult(table, total, tables, t.tables.noEntryFallback),
        favorite: false,
      };
    },
    [t],
  );

  // To the history, with the adventure it's for (none: a free roll).
  const record = useCallback(
    (entry: HistoryEntry, adventureId: string | null | undefined) =>
      addHistoryEntry(adventureId ? { ...entry, adventureId } : entry),
    [addHistoryEntry],
  );

  const askOracle = useCallback(
    (question: string, likelihood: Likelihood, adventureId = activeAdventureId): OracleRoll => {
      // Loner's Twist Counter is each adventure's own (free rolls share one).
      const roll = rollOracleWith(oracleId, question, likelihood, lonerTwistCounterOf(historyEntries, adventureId));
      if (roll.twist?.happened) {
        // Each table roll goes to the history too, like any other.
        const data = gameState("loner").data;
        const tables = data ? toMeaningTables(TABLE_GAMES.find((g) => g.id === "loner")!, data, t, locale) : [];
        const twistRolls = ["loner-twist-subject", "loner-twist-action"]
          .map((id) => tables.find((table) => table.id === id))
          .filter((table) => table !== undefined)
          .map((table) => buildTableRoll(table));
        for (const twistRoll of twistRolls) record(twistRoll, adventureId);
        if (twistRolls.length) roll.twist.result = twistRolls.map((r) => r.resultText).join(" · ");
      }
      record(roll, adventureId);
      announce(formatOracleResult(t, roll));
      if (adventureId) {
        if (roll.question) addJournalEntry(adventureId, "question", roll.question, roll.id);
        const diceText = `${getOracle(oracleId).name} — ${formatOracleDice(t, roll)} -> ${formatOracleResult(t, roll)}`;
        addJournalEntry(adventureId, "roll", diceText, roll.id);
      }
      return roll;
    },
    [activeAdventureId, record, addJournalEntry, buildTableRoll, historyEntries, locale, oracleId, t],
  );

  const rollTable = useCallback(
    (table: MeaningTable, adventureId = activeAdventureId, tables: MeaningTable[] = []): TableRollEntry => {
      const entry = buildTableRoll(table, tables);
      record(entry, adventureId);
      announce(`${entry.tableName}: ${entry.resultText}`);
      if (adventureId) {
        const diceText = formatTableRoll(entry.tableName, table.dice, entry.total, entry.resultText);
        addJournalEntry(adventureId, "roll", diceText, entry.id);
      }
      return entry;
    },
    [activeAdventureId, record, addJournalEntry, buildTableRoll],
  );

  /**
   * Several tables at once, one journal entry: quick inspiration
   * (action + theme, the tables from useMeaningTables) and the player's
   * generators. Each roll goes to the history on its own (they're
   * different tables), but the journal gets a single `gen:` entry,
   * linked to the first, so the consequence follows them all.
   */
  const rollCombined = useCallback(
    (name: string, tables: MeaningTable[], adventureId = activeAdventureId, all: MeaningTable[] = []): Inspiration => {
      const rolls = tables.map((table) => buildTableRoll(table, all));
      for (const roll of rolls) record(roll, adventureId);
      const inspiration: Inspiration = {
        id: rolls[0].id,
        rollIds: rolls.map((r) => r.id),
        detail: rolls.map((r, i) => `${r.tableName} ${tables[i].dice}=${r.total}`).join(", "),
        text: rolls.map((r) => r.resultText).join(" · "),
      };
      announce(`${name}: ${inspiration.text}`);
      if (adventureId) {
        // A generator, in Lonelog (`gen:`). No "—" in the detail: that's
        // how oracle rolls are recognised (splitRollText).
        const diceText = `gen: ${name} (${inspiration.detail}) -> ${inspiration.text}`;
        addJournalEntry(adventureId, "roll", diceText, inspiration.id);
      }
      return inspiration;
    },
    [activeAdventureId, record, addJournalEntry, buildTableRoll],
  );

  const rollInspiration = useCallback(
    (tables: MeaningTable[], adventureId = activeAdventureId) =>
      rollCombined(t.tables.inspirationName, tables, adventureId),
    [activeAdventureId, rollCombined, t],
  );

  const addConsequence = useCallback(
    (rollId: string, text: string, adventureId = activeAdventureId) => {
      if (adventureId) addJournalEntry(adventureId, "consequence", text, rollId);
    },
    [activeAdventureId, addJournalEntry],
  );

  return { askOracle, rollTable, rollInspiration, rollGenerator: rollCombined, addConsequence };
}
