import { useCallback } from "react";
import { rollOracle, type Likelihood, type OracleRoll } from "../lib/oracle";
import { resolveResult, rollForTable, tableRollName, type MeaningTable } from "../lib/tables";
import type { TableRollEntry } from "../lib/history";
import { getOracle } from "../lib/oracles";
import { formatAnswer } from "../lib/i18n/answerText";
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
  /** "Action 3/4, Theme 2/5". */
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
  const { addEntry: addHistoryEntry } = useHistoryContext();
  const { activeAdventureId, addEntry: addJournalEntry } = useJournalContext();
  const { oracleId } = useOracleContext();
  const { t } = useLocaleContext();

  const askOracle = useCallback(
    (question: string, likelihood: Likelihood, adventureId = activeAdventureId): OracleRoll => {
      const roll = rollOracle(question, likelihood);
      addHistoryEntry(roll);
      if (adventureId) {
        if (roll.question) addJournalEntry(adventureId, "question", roll.question, roll.id);
        const oracleName = getOracle(oracleId).name;
        const diceText = `${oracleName} — ${t.die.color.blanco} ${roll.white.kept} / ${t.die.color.negro} ${roll.black.kept} -> ${formatAnswer(t, roll)}`;
        addJournalEntry(adventureId, "roll", diceText, roll.id);
      }
      return roll;
    },
    [activeAdventureId, addHistoryEntry, addJournalEntry, oracleId, t],
  );

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

  const rollTable = useCallback(
    (table: MeaningTable, adventureId = activeAdventureId, tables: MeaningTable[] = []): TableRollEntry => {
      const entry = buildTableRoll(table, tables);
      addHistoryEntry(entry);
      if (adventureId) {
        const diceText = `${entry.tableName} ${entry.rolls.join("/")} -> ${entry.resultText}`;
        addJournalEntry(adventureId, "roll", diceText, entry.id);
      }
      return entry;
    },
    [activeAdventureId, addHistoryEntry, addJournalEntry, buildTableRoll],
  );

  /**
   * Quick inspiration: action + theme at once (the tables come from
   * useMeaningTables, which loads them). Each roll goes to the
   * history on its own (they're two tables), but the journal gets a
   * single entry, linked to the first, so the consequence follows both.
   */
  const rollInspiration = useCallback(
    (tables: MeaningTable[], adventureId = activeAdventureId): Inspiration => {
      const rolls = tables.map((table) => buildTableRoll(table));
      for (const roll of rolls) addHistoryEntry(roll);
      const inspiration: Inspiration = {
        id: rolls[0].id,
        detail: rolls.map((r) => `${r.tableName} ${r.rolls.join("/")}`).join(", "),
        text: rolls.map((r) => r.resultText).join(" · "),
      };
      if (adventureId) {
        // No "—" in the detail: that's how oracle rolls are recognised (splitRollText).
        const diceText = `${t.tables.inspirationName} (${inspiration.detail}) -> ${inspiration.text}`;
        addJournalEntry(adventureId, "roll", diceText, inspiration.id);
      }
      return inspiration;
    },
    [activeAdventureId, addHistoryEntry, addJournalEntry, buildTableRoll, t],
  );

  const addConsequence = useCallback(
    (rollId: string, text: string, adventureId = activeAdventureId) => {
      if (adventureId) addJournalEntry(adventureId, "consequence", text, rollId);
    },
    [activeAdventureId, addJournalEntry],
  );

  return { askOracle, rollTable, rollInspiration, addConsequence };
}
