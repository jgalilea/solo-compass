import type { HistoryEntry } from "./history";
import { isoDate, playDay, type JournalEntry } from "./lonelog";
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
  /**
   * Entries played on each day ("2026-11-09"): their session's day (see
   * playDay). An imported entry without a dated session isn't counted:
   * its time is that of the import.
   */
  activity: Record<string, number>;
  /** The most days in a row with something played. */
  longestStreak: number;
  /** First and last day played ("2026-11-09"). */
  first: string | null;
  last: string | null;
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
    activity: {},
    longestStreak: 0,
  };
  const tableCounts = new Map<string, number>();
  let session: JournalEntry | null = null;

  for (const entry of [...entries].sort((a, b) => a.timestamp - b.timestamp)) {
    if (entry.kind === "session") session = entry;
    const day = playDay(entry, session);
    if (day) {
      // Sessions can be moved, so the days don't always go in order.
      if (!stats.first || day < stats.first) stats.first = day;
      if (!stats.last || day > stats.last) stats.last = day;
      stats.activity[day] = (stats.activity[day] ?? 0) + 1;
    }

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
  stats.daysPlayed = Object.keys(stats.activity).length;
  stats.longestStreak = longestStreak(Object.keys(stats.activity));
  return stats;
}

/** The longest run of consecutive days among these ("2026-11-09"). */
export function longestStreak(isoDays: string[]): number {
  const dayNumbers = [...new Set(isoDays)].map((iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86_400_000).sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  dayNumbers.forEach((n, i) => {
    run = i > 0 && n === dayNumbers[i - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}

export type ActivityDay = { iso: string; day: number; count: number; future: boolean };

/**
 * The last twelve months, one row each (oldest first), with every day
 * of the month: the heat map in the statistics.
 */
export function lastYearByMonth(activity: Record<string, number>, today: Date): { year: number; month: number; days: ActivityDay[] }[] {
  const todayIso = isoDate(today.getTime());
  return Array.from({ length: 12 }, (_, i) => {
    const first = new Date(today.getFullYear(), today.getMonth() - 11 + i, 1);
    const year = first.getFullYear();
    const month = first.getMonth();
    const length = new Date(year, month + 1, 0).getDate();
    const days = Array.from({ length }, (_, d) => {
      const iso = isoDate(new Date(year, month, d + 1).getTime());
      return { iso, day: d + 1, count: activity[iso] ?? 0, future: iso > todayIso };
    });
    return { year, month, days };
  });
}

/** 0 (nothing) to 4, against the busiest day, so a quiet journal still shows. */
export function activityLevel(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0 || max <= 0) return 0;
  return Math.max(1, Math.ceil((count / max) * 4)) as 1 | 2 | 3 | 4;
}
