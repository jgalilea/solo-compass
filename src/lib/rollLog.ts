import { getOracle } from "./oracles";
import { rollOracleId, type Likelihood } from "./oracle";
import { formatOracleDice, formatOracleResult } from "./i18n/answerText";
import type { Dictionary } from "./i18n";
import { tableRollDie, type HistoryEntry } from "./history";
import type { JournalLineKind } from "./lonelog";
import { formatTableRoll } from "./tables";
import { matchesAllWords } from "./text";

/**
 * A history roll as the journal writes it, in Lonelog: an oracle's
 * question (if any), with how likely it was when it wasn't even
 * ("… (Likely)", §3.2.2), and its roll; a table's or a card's `tbl:`
 * line; or the player's dice as they are.
 */
export function rollJournalLines(t: Dictionary, entry: HistoryEntry): { kind: JournalLineKind; text: string }[] {
  if (entry.kind === "dados") return [{ kind: "roll", text: entry.card ? `tbl: ${entry.text}` : entry.text }];
  if (entry.kind === "tabla") {
    const die = tableRollDie(entry);
    const text = die
      ? formatTableRoll(entry.tableName, die, entry.total, entry.resultText)
      : `tbl: ${entry.tableName} ${entry.total} -> ${entry.resultText}`;
    return [{ kind: "roll", text }];
  }
  const roll = `${getOracle(rollOracleId(entry)).name}: ${formatOracleDice(t, entry)} -> ${formatOracleResult(t, entry)}`;
  return [...(entry.question ? [{ kind: "question" as const, text: askedQuestion(t, entry.question, entry.likelihood) }] : []), { kind: "roll", text: roll }];
}

/** A question as Lonelog writes it: its likelihood after it, in brackets, unless it's even. */
export function askedQuestion(t: Dictionary, question: string, likelihood: Likelihood): string {
  return likelihood && likelihood !== "equilibrado" ? `${question} (${t.likelihood[likelihood]})` : question;
}

/**
 * Searches the history: every word of the query in what's shown of a
 * roll (its question, table or formula, its dice and its result), like
 * the journal's search. An empty query is every roll.
 */
export function searchHistory(t: Dictionary, entries: HistoryEntry[], query: string): HistoryEntry[] {
  if (!query.trim()) return entries;
  return entries.filter((entry) =>
    matchesAllWords(
      rollJournalLines(t, entry)
        .map((line) => line.text)
        .join(" "),
      query,
    ),
  );
}
