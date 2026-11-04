import { useCallback } from "react";
import { rollOracle, type Likelihood, type OracleRoll } from "../lib/oracle";
import { lookupEntry, rollForTable, type MeaningTable } from "../lib/tables";
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

  const rollTable = useCallback(
    (table: MeaningTable, adventureId = activeAdventureId): TableRollEntry => {
      const { rolls, total } = rollForTable(table.dice);
      const entry: TableRollEntry = {
        kind: "tabla",
        id: makeId(),
        timestamp: Date.now(),
        tableId: table.id,
        tableName: table.name,
        rolls,
        total,
        resultText: lookupEntry(table, total)?.text ?? t.tables.noEntryFallback,
        favorite: false,
      };
      addHistoryEntry(entry);
      if (adventureId) {
        const diceText = `${table.name} ${rolls.join("/")} -> ${entry.resultText}`;
        addJournalEntry(adventureId, "roll", diceText, entry.id);
      }
      return entry;
    },
    [activeAdventureId, addHistoryEntry, addJournalEntry, t],
  );

  const addConsequence = useCallback(
    (rollId: string, text: string, adventureId = activeAdventureId) => {
      if (adventureId) addJournalEntry(adventureId, "consequence", text, rollId);
    },
    [activeAdventureId, addJournalEntry],
  );

  return { askOracle, rollTable, addConsequence };
}
