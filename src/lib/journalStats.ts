import type { HistoryEntry } from "./history";
import type { JournalEntry } from "./lonelog";
import type { Answer } from "./oracle";
import { OWN_ROLL, splitRollSeries, splitRollText } from "./journalUi";

export interface AdventureStats {
  sessions: number;
  /** Entries other than session titles. */
  entries: number;
  /** Words written by hand (notes, actions, questions, consequences). */
  words: number;
  questions: number;
  oracle: Record<Answer, number> & { total: number; and: number; but: number };
  tableRolls: number;
  /** The most rolled table (ties: the one rolled first). */
  topTable: { name: string; count: number } | null;
  /** Rolls of the player's own system (dice, not oracle or tables). */
  diceRolls: number;
  /** Distinct days with at least one entry. */
  daysPlayed: number;
  first: number | null;
  last: number | null;
}


/**
 * What kind of roll an entry is. The linked history entry says so for
 * rolls made in the app; imported journals (or a cleared history) fall
 * back to the text, written the way usePlayActions writes it.
 */
function classifyRoll(
  entry: JournalEntry,
  linked: HistoryEntry | undefined,
): { kind: "oracle"; answer?: Answer; qualifier?: "and" | "but" } | { kind: "table"; name: string } | { kind: "dice" } {
  if (linked?.kind === "oraculo") {
    return {
      kind: "oracle",
      answer: linked.answer,
      qualifier: linked.qualifier === "y" ? "and" : linked.qualifier === "pero" ? "but" : undefined,
    };
  }
  const { detail, result, answer } = splitRollText(entry.text);
  if (answer) {
    const qualifier = /,\s*(pero|but)\b/i.test(result ?? "")
      ? "but"
      : /,\s*(y además|and)\b/i.test(result ?? "")
        ? "and"
        : undefined;
    return { kind: "oracle", answer, qualifier };
  }
  if (linked?.kind === "tabla" || (result !== null && !splitRollSeries(entry.text) && !OWN_ROLL.test(entry.text))) {
    // "Theme d66=25", "Theme 2/5" (as written before) or
    // "Inspiration (Action d66=34, Theme d66=25)": just the name.
    const name = detail.replace(/\s*\(.*\)$/, "").replace(/\s+(?:\d*d\w+=)?[\d/]+$/, "").trim();
    return { kind: "table", name: name || detail };
  }
  return { kind: "dice" };
}

export function computeAdventureStats(
  entries: JournalEntry[],
  historyById: Map<string, HistoryEntry>,
): AdventureStats {
  const stats: AdventureStats = {
    sessions: 0,
    entries: 0,
    words: 0,
    questions: 0,
    oracle: { total: 0, si: 0, no: 0, contradiccion: 0, and: 0, but: 0 },
    tableRolls: 0,
    topTable: null,
    diceRolls: 0,
    daysPlayed: 0,
    first: null,
    last: null,
  };
  const tableCounts = new Map<string, number>();
  const days = new Set<string>();

  for (const entry of [...entries].sort((a, b) => a.timestamp - b.timestamp)) {
    stats.first ??= entry.timestamp;
    stats.last = entry.timestamp;
    const day = new Date(entry.timestamp);
    days.add(`${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`);

    if (entry.kind === "session") {
      stats.sessions++;
      continue;
    }
    stats.entries++;
    if (entry.kind !== "roll") {
      stats.words += entry.text.split(/\s+/).filter(Boolean).length;
      if (entry.kind === "question") stats.questions++;
      continue;
    }

    const roll = classifyRoll(entry, entry.linkedRollId ? historyById.get(entry.linkedRollId) : undefined);
    if (roll.kind === "oracle") {
      stats.oracle.total++;
      if (roll.answer) stats.oracle[roll.answer]++;
      if (roll.qualifier) stats.oracle[roll.qualifier]++;
    } else if (roll.kind === "table") {
      stats.tableRolls++;
      tableCounts.set(roll.name, (tableCounts.get(roll.name) ?? 0) + 1);
    } else {
      stats.diceRolls++;
    }
  }

  for (const [name, count] of tableCounts) {
    if (!stats.topTable || count > stats.topTable.count) stats.topTable = { name, count };
  }
  stats.daysPlayed = days.size;
  return stats;
}
