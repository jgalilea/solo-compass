import type { HistoryEntry } from "./history";
import { isoDate, playDay, type JournalEntry } from "./lonelog";
import { rollOracleId, type Answer, type OracleRoll } from "./oracle";
import { oracleOdds, type OracleId } from "./oracleEngines";
import type { CastMember } from "./lonelogTags";
import { OWN_ROLL, splitRollSeries, splitRollText } from "./journalUi";

export interface AdventureStats {
  sessions: number;
  /** Entries other than session titles. */
  entries: number;
  /** Words written by hand (notes, actions, questions, consequences). */
  words: number;
  questions: number;
  oracle: Record<Answer, number> & { total: number; and: number; but: number };
  /**
   * The answers whose chances are known (rolled here, still in the
   * history): how many, the "yes" that came out and the "yes" their
   * likelihoods added up to. `mood`: more yes or fewer than chance usually
   * gives; null with too few to tell.
   */
  oracleChance: { total: number; yes: number; expected: number; mood: "generous" | "stubborn" | "fair" | null };
  /** Every session, in order (and what comes before the first, if anything). */
  perSession: { title: string | null; entries: number; words: number }[];
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

/** Fewer answers than this say nothing about the oracle. */
const MIN_ORACLE_FOR_MOOD = 10;

/**
 * What kind of roll an entry is. The linked history entry says so for
 * rolls made in the app; imported journals (or a cleared history) fall
 * back to the text, written the way usePlayActions writes it.
 */
export function classifyRoll(
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
    oracleChance: { total: 0, yes: 0, expected: 0, mood: null },
    perSession: [],
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
  let current: AdventureStats["perSession"][number] = { title: null, entries: 0, words: 0 };
  let variance = 0;
  const odds = new Map<string, number>();
  const chanceOfYes = (roll: OracleRoll) => {
    const id: OracleId = rollOracleId(roll);
    const key = `${id} ${roll.likelihood}`;
    if (!odds.has(key)) odds.set(key, oracleOdds(id, roll.likelihood).yes);
    return odds.get(key)!;
  };

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
      if (current.title !== null || current.entries > 0) stats.perSession.push(current);
      current = { title: entry.text, entries: 0, words: 0 };
      continue;
    }
    stats.entries++;
    current.entries++;
    if (entry.kind !== "roll") {
      const words = entry.text.split(/\s+/).filter(Boolean).length;
      stats.words += words;
      current.words += words;
      if (entry.kind === "question") stats.questions++;
      continue;
    }

    const linked = entry.linkedRollId ? historyById.get(entry.linkedRollId) : undefined;
    const roll = classifyRoll(entry, linked);
    if (linked?.kind === "oraculo" && linked.likelihood) {
      const p = chanceOfYes(linked);
      stats.oracleChance.total++;
      stats.oracleChance.expected += p;
      variance += p * (1 - p);
      if (linked.answer === "si") stats.oracleChance.yes++;
    }
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

  if (current.title !== null || current.entries > 0) stats.perSession.push(current);
  const chance = stats.oracleChance;
  if (chance.total >= MIN_ORACLE_FOR_MOOD) {
    const z = (chance.yes - chance.expected) / Math.sqrt(variance);
    chance.mood = z >= 1.5 ? "generous" : z <= -1.5 ? "stubborn" : "fair";
  }

  for (const [name, count] of tableCounts) {
    if (!stats.topTable || count > stats.topTable.count) stats.topTable = { name, count };
  }
  stats.daysPlayed = Object.keys(stats.activity).length;
  stats.longestStreak = longestStreak(Object.keys(stats.activity));
  return stats;
}

/** Who is named, and where things happen, for the statistics. */
export interface NamedCount {
  key: string;
  name: string;
  kind: CastMember["kind"];
  count: number;
}

/**
 * How many entries name each character (NPCs and foes: the PC is in
 * everything) and place of the notebook (not rooms: they're numbers), with its tag or in plain words,
 * the most named first. A single word counts only written as it is ("Sal"
 * isn't "sal").
 */
export function mostNamed(entries: readonly JournalEntry[], cast: readonly CastMember[], limit: number): { characters: NamedCount[]; places: NamedCount[] } {
  const texts = entries.filter((e) => e.kind !== "session" && e.kind !== "roll").map((e) => ({ id: e.id, text: e.text }));
  const count = (member: CastMember): NamedCount => {
    const ids = new Set(member.mentions);
    const escaped = member.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const named = new RegExp(`(?<![\\p{L}\\d])${escaped}(?![\\p{L}\\d])`, /\s/.test(member.name) ? "iu" : "u");
    for (const { id, text } of texts) if (!ids.has(id) && named.test(text)) ids.add(id);
    return { key: member.key, name: member.name, kind: member.kind, count: ids.size };
  };
  const top = (kinds: readonly CastMember["kind"][]) =>
    cast
      .filter((m) => kinds.includes(m.kind))
      .map(count)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  return { characters: top(["npc", "foe"]), places: top(["place"]) };
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
