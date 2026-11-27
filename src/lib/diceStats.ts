/**
 * How the player's own dice came up, read from the journal's rolls
 * (readRolledDice). Every die thrown counts, the dropped and rerolled
 * ones too: it's about the dice and their luck, not about the totals.
 * Inspired by what Foundry's dice modules tell (hot and cold runs, each
 * session's luck, a lucky number), with no critical or fumble of any one
 * system: only a die's highest and lowest faces.
 */

import { readRolledDice } from "./diceNotation";
import { splitOwnRolls, splitRollText } from "./journalUi";
import { diceInDetail } from "./rollLine";
import type { JournalEntry } from "./lonelog";
import type { RolledDie } from "./rolledDice";

export interface DieStats {
  /** 0 for a Fudge die. */
  sides: number;
  count: number;
  average: number;
  /** What the average tends to. */
  expected: number;
  /** How many times each face (or run of faces, on a big die) came up. */
  bars: { from: number; to: number; count: number }[];
}

/** A session's dice (or an adventure's), against what they tend to. */
export interface SessionLuck {
  /** Null: before the first session. */
  title: string | null;
  /** How far from the usual, in standard errors: above 0, high. */
  score: number;
}

export interface DiceStats {
  /** Dice thrown, of every kind. */
  total: number;
  /** Most thrown first. */
  dice: DieStats[];
  /** High or low beyond what chance usually gives; null with too few dice to tell. */
  trend: "high" | "low" | "normal" | null;
  /** The most dice in a row above, and below, their average (one right on it breaks both). */
  highRun: number;
  lowRun: number;
  /** Dice on their highest and lowest face, and how many of each chance would give. */
  top: number;
  bottom: number;
  extremes: number;
  /** The face that comes up most over its share, with a die of its own thrown enough; null if none stands out. */
  favourite: { sides: number; face: number; count: number } | null;
  /** The sessions whose dice ran highest and lowest, among those with enough; null with fewer than two. */
  sessions: { best: SessionLuck; worst: SessionLuck } | null;
}

/** Fewer than this and the dice have nothing to say. */
export const MIN_DICE_FOR_TREND = 20;
/** Standard errors from the average: about one fair adventure in eight gets past it. */
const TREND_Z = 1.5;
/** A session with fewer dice than this doesn't compete. */
export const MIN_DICE_PER_SESSION = 6;
/** A favourite face needs to have come up this often. */
const MIN_FAVOURITE = 4;
/** A die with more faces than this has them in runs. */
const MAX_BARS = 20;

/** The dice of one roll, as they fell; none if the text doesn't show that. */
function thrownDice(die: string, result: string): RolledDie[] {
  // min/max and penetrating dice are written changed.
  if (die.startsWith("draw=") || /m(?:in|ax)\d|!p/i.test(die)) return [];
  return readRolledDice(`${die} -> ${result}`, Infinity) ?? [];
}

const expectedOf = (sides: number) => (sides ? (sides + 1) / 2 : 0);
/** A die's distance from its average, in spreads: a d100 doesn't count for more than a d6. */
function deviationOf({ sides, value }: RolledDie): number {
  const faces = sides || 3;
  return (value - expectedOf(sides)) / Math.sqrt((faces * faces - 1) / 12);
}
const zScore = (deviation: number, count: number) => deviation / Math.sqrt(count || 1);

/**
 * One journal's dice, session by session; with `nameOf`, several
 * journals', adventure by adventure (each one's name).
 */
export function computeDiceStats(
  entries: readonly JournalEntry[],
  nameOf?: (entry: JournalEntry) => string,
): DiceStats {
  const bySides = new Map<number, number[]>();
  type Group = { title: string | null; deviation: number; count: number };
  const sessions: Group[] = [{ title: null, deviation: 0, count: 0 }];
  const adventures = new Map<string, Group>();
  const adventureGroup = ({ adventureId }: JournalEntry, title: string): Group => {
    // By adventure, not by name: two can be called the same.
    if (!adventures.has(adventureId))
      adventures.set(adventureId, { title, deviation: 0, count: 0 });
    return adventures.get(adventureId)!;
  };
  const stats: DiceStats = {
    total: 0,
    dice: [],
    trend: null,
    highRun: 0,
    lowRun: 0,
    top: 0,
    bottom: 0,
    extremes: 0,
    favourite: null,
    sessions: null,
  };
  let deviation = 0;
  let high = 0;
  let low = 0;

  for (const entry of [...entries].sort((a, b) => a.timestamp - b.timestamp)) {
    if (entry.kind === "session") sessions.push({ title: entry.text, deviation: 0, count: 0 });
    if (entry.kind !== "roll") continue;
    const own = splitOwnRolls(entry.text)?.rolls;
    // One with its verdict ("2d6+2[4, 3]=9 -> Hit") says its dice too.
    const verdict = own ? null : diceInDetail(splitRollText(entry.text).detail);
    const rolled = own
      ? own.flatMap(({ die, result }) => thrownDice(die, result))
      : verdict
        ? thrownDice(...(verdict.split(" -> ") as [string, string]))
        : [];
    for (const die of rolled) {
      const { sides, value } = die;
      // Written by hand or by another tool: not a face of that die.
      if (sides === 1 || (sides === 0 ? Math.abs(value) > 1 : value < 1 || value > sides)) continue;
      const values = bySides.get(sides) ?? [];
      values.push(value);
      bySides.set(sides, values);

      const off = deviationOf(die);
      const session = nameOf ? adventureGroup(entry, nameOf(entry)) : sessions.at(-1)!;
      session.deviation += off;
      session.count++;
      deviation += off;
      stats.total++;
      high = off > 0 ? high + 1 : 0;
      low = off < 0 ? low + 1 : 0;
      stats.highRun = Math.max(stats.highRun, high);
      stats.lowRun = Math.max(stats.lowRun, low);
      if (value === (sides || 1)) stats.top++;
      if (value === (sides ? 1 : -1)) stats.bottom++;
      stats.extremes += 1 / (sides || 3);
    }
  }

  stats.dice = [...bySides]
    .map(([sides, values]): DieStats => ({
      sides,
      count: values.length,
      average: values.reduce((a, b) => a + b, 0) / values.length,
      expected: expectedOf(sides),
      bars: countBars(sides, values),
    }))
    .sort((a, b) => b.count - a.count || a.sides - b.sides);
  const z = zScore(deviation, stats.total);
  if (stats.total >= MIN_DICE_FOR_TREND)
    stats.trend = z >= TREND_Z ? "high" : z <= -TREND_Z ? "low" : "normal";

  stats.favourite = favouriteFace(bySides);
  const ranked = (nameOf ? [...adventures.values()] : sessions)
    .filter((s) => s.count >= MIN_DICE_PER_SESSION)
    .map((s): SessionLuck => ({ title: s.title, score: zScore(s.deviation, s.count) }))
    .sort((a, b) => b.score - a.score);
  if (ranked.length > 1) stats.sessions = { best: ranked[0], worst: ranked.at(-1)! };
  return stats;
}

/** The face furthest over its share, of every die with separate faces worth naming (not a Fudge's). */
function favouriteFace(bySides: ReadonlyMap<number, readonly number[]>): DiceStats["favourite"] {
  let best: DiceStats["favourite"] = null;
  let bestOver = 0;
  for (const [sides, values] of bySides) {
    if (sides < 4) continue;
    const counts = new Map<number, number>();
    for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
    const share = values.length / sides;
    for (const [face, count] of counts) {
      const over = (count - share) / Math.sqrt(share);
      if (count >= MIN_FAVOURITE && over > bestOver) {
        best = { sides, face, count };
        bestOver = over;
      }
    }
  }
  return best;
}

function countBars(sides: number, values: readonly number[]): DieStats["bars"] {
  const first = sides ? 1 : -1;
  const last = sides || 1;
  const size = last - first + 1 > MAX_BARS ? Math.ceil(sides / 10) : 1;
  const bars: DieStats["bars"] = [];
  for (let from = first; from <= last; from += size)
    bars.push({ from, to: Math.min(from + size - 1, last), count: 0 });
  for (const value of values) bars[Math.floor((value - first) / size)].count++;
  return bars;
}
