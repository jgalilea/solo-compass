import { ANSWER_CODE, readAnswerCode } from "./answerCodes";
import { isCardDraw } from "./cards";
import { readOracleDice, tableDice } from "./rolledDice";
import { loneRoll, MAX_ROLL_TEXT, OWN_ROLL, splitRollSeries, type OwnRolls } from "./rollLine";
import type { JournalEntry, JournalLineKind } from "./lonelog";
import {
  actorParts,
  noteForm,
  parseScene,
  splitActor,
  splitRollSymbol,
  type Speaker,
} from "./lonelogLines";
import type { CastMember } from "./lonelogTags";
import { normalizeForSearch } from "./text";

/** A scene or an add-on's [COMBAT]/[/COMBAT]-style marker: never joined by what follows. */
function isMarker(entry: JournalEntry): boolean {
  return entry.kind === "scene" || (entry.kind === "note" && noteForm(entry.text).form === "block");
}
import type { Answer } from "./oracle";

/**
 * Style constants and utilities shared by JournalListView and
 * AdventureDetailView. Kept apart from src/components/journalShared.tsx
 * (which only exports components) so React fast refresh works in both,
 * same as with the *ContextInstance.ts files.
 */

export const INPUT_CLASS =
  "min-w-0 flex-1 rounded-xl border border-ink-border bg-ink-900/70 px-4 py-3 text-base text-parchment placeholder:text-parchment-dim/50 focus:border-gold focus:outline-none";
export const PRIMARY_BUTTON_CLASS =
  "shrink-0 rounded-xl bg-gold px-4 py-3 text-sm font-medium text-ink-950 transition hover:bg-gold-soft";
export const SECONDARY_BUTTON_CLASS =
  "shrink-0 rounded-xl border border-ink-border px-4 py-3 text-sm text-parchment-dim transition hover:border-gold/50 hover:text-gold";

// "question" is left out on purpose: the oracle already has its own
// screen, which logs question + roll together by itself — there's no
// real use case for logging a loose question here. It still exists as
// a JournalLineKind because entries already saved (or imported from
// another Lonelog) can have that kind.
// "roll" is left out too: the dice tool logs your own system's rolls
// with the actual dice; typing one by hand only wrote text.
// Sessions and scenes are markers, picked apart (ComposerMode).
export type ComposerKind = Exclude<JournalLineKind, "session" | "scene" | "question" | "roll">;

export const COMPOSER_KINDS: ComposerKind[] = ["note", "action", "consequence"];

/**
 * What can be picked in the composer: the entry kinds, a dialogue line
 * and in-world text (notes in Lonelog's dialogue form and narrative
 * block, see formatDialogue and formatExcerpt) and starting a session
 * or a scene.
 */
export type ComposerMode = ComposerKind | "dialogue" | "excerpt" | "session" | "scene";

/**
 * Lonelog typed at the start of the composer picks the entry type by
 * itself and the symbol goes (the type puts it back on export): "@ " an
 * action ("@(Odile) …" someone else's), "=> " a consequence, "PC: " or
 * "N (Odile): " a dialogue line and who says it, "\--- " in-world text,
 * "=== " a session. Null when the text doesn't start with one.
 */
export function composerShortcut(
  text: string,
): { mode: ComposerMode; text: string; speaker?: Speaker } | null {
  let m: RegExpMatchArray | null;
  if ((m = text.match(/^@ ([\s\S]*)$/))) return { mode: "action", text: m[1]! };
  if ((m = text.match(/^@(\([\s\S]*)$/))) return { mode: "action", text: m[1]! };
  if ((m = text.match(/^=> ?([\s\S]*)$/)) && text.length > 2)
    return { mode: "consequence", text: m[1]! };
  if ((m = text.match(/^PC(?: \(([^()\n]+)\))?: ([\s\S]*)$/))) {
    return {
      mode: "dialogue",
      text: m[2]!,
      speaker: m[1] ? { pc: true, name: m[1].trim() } : { pc: true },
    };
  }
  if ((m = text.match(/^N \(([^()\n]+)\): ([\s\S]*)$/))) {
    return { mode: "dialogue", text: m[2]!, speaker: { pc: false, name: m[1]!.trim() } };
  }
  if ((m = text.match(/^\\--- ([\s\S]*)$/))) return { mode: "excerpt", text: m[1]! };
  if ((m = text.match(/^=== ([\s\S]*)$/)))
    return { mode: "session", text: m[1]!.replace(/\s*===\s*$/, "") };
  return null;
}

export const SYMBOL: Record<JournalLineKind, string> = {
  action: "@",
  question: "?",
  roll: "d:",
  consequence: "=>",
  note: "",
  session: "",
  scene: "",
};

export function downloadTextFile(filename: string, content: string, type = "text/markdown") {
  // Once downloaded, the file is left with just bytes + extension —
  // the blob's "charset=utf-8" doesn't travel with it. Without a BOM,
  // some viewers (iOS especially) guess the encoding wrong and show
  // broken accents/symbols when it's opened outside the app.
  const blob = new Blob(["﻿" + content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function sanitizeFilename(name: string): string {
  return name.trim().replace(/[\\/:*?"<>|]+/g, "-") || "diario";
}

export interface EntryGroup {
  sessionEntry: JournalEntry | null;
  items: JournalEntry[];
}

export function groupBySession(sortedEntries: JournalEntry[]): EntryGroup[] {
  const groups: EntryGroup[] = [];
  let current: EntryGroup = { sessionEntry: null, items: [] };
  for (const entry of sortedEntries) {
    if (entry.kind === "session") {
      groups.push(current);
      current = { sessionEntry: entry, items: [] };
    } else {
      current.items.push(entry);
    }
  }
  groups.push(current);
  return groups.filter((g) => g.sessionEntry !== null || g.items.length > 0);
}

/**
 * Groups a session's entries into blocks for display: a question, the
 * roll that answers it and the consequences right after it go
 * together; the rest (notes, actions…) stands alone. A consequence
 * always joins the entry right before it, whatever its kind (an action
 * and what comes of it are one card), so the composer can say so —
 * except a scene or a block marker ([COMBAT]…), which stands alone.
 * Grouped by position (not only by linkedRollId) so it also works with
 * imported journals, which carry no links.
 */
export function buildEntryBlocks(items: JournalEntry[]): JournalEntry[][] {
  const blocks: JournalEntry[][] = [];
  let open: JournalEntry[] | null = null;

  for (const entry of items) {
    const hasRoll = open?.some((e) => e.kind === "roll") ?? false;
    const question = open?.find((e) => e.kind === "question");

    if (entry.kind === "question") {
      open = [entry];
      blocks.push(open);
    } else if (
      entry.kind === "roll" &&
      open &&
      question &&
      !hasRoll &&
      question.linkedRollId === entry.linkedRollId
    ) {
      open.push(entry);
    } else if (entry.kind === "roll") {
      open = [entry];
      blocks.push(open);
    } else if (entry.kind === "consequence" && blocks.length > 0 && !isMarker(blocks.at(-1)![0]!)) {
      open = blocks.at(-1)!;
      open.push(entry);
    } else {
      open = null;
      blocks.push([entry]);
    }
  }
  return blocks;
}

/**
 * Blocks drawn at first, and added each time "earlier" or "later
 * entries" is pressed: a session can hold thousands of entries (an
 * imported journal with no session markers), and drawing them all made
 * every new entry take seconds on a phone (e2e/volume.perf.ts).
 */
export const BLOCK_PAGE = 80;
/** Blocks drawn on each side of an entry jumped to far back. */
const BLOCK_CONTEXT = 20;

/**
 * Which of a session's blocks are drawn: the `shown` blocks before
 * `end` (an index; null is the end of the session, the usual view).
 */
export interface BlockWindow {
  shown: number;
  end: number | null;
}

/**
 * The window moved, if it has to, so every target block (a search jump,
 * the entry edited, selected or written below) is drawn. Close to the
 * end it draws from the target to the end, as it always has; far back
 * (a search jump to the start of a 2,000-entry session) only a stretch
 * around it, with "later entries" below, instead of everything after it.
 * Returns the same window when nothing has to change.
 */
export function fitBlockWindow(count: number, window: BlockWindow, targets: number[]): BlockWindow {
  if (targets.length === 0) return window;
  const end = Math.min(window.end ?? count, count);
  const start = Math.max(0, end - window.shown);
  const first = Math.min(...targets);
  const last = Math.max(...targets);
  if (first >= start && last < end) return window;
  if (count - first <= 2 * BLOCK_PAGE)
    return { shown: Math.max(window.shown, count - first), end: null };
  const newEnd = Math.min(count, last + 1 + BLOCK_CONTEXT);
  return { shown: newEnd - first + BLOCK_CONTEXT, end: newEnd >= count ? null : newEnd };
}

// Oracle answer words in any of the app's languages, to recognise
// the answer in rolls with no link to the history (e.g. imported,
// or if the history was cleared).
// (No \b: it doesn't detect a word boundary after an accented letter
// such as the "í" in "Sí"; a Unicode lookahead is used instead.)
const ANSWER_PATTERNS: [Answer, RegExp][] = [
  ["contradiccion", /^(contradicci[oó]n|contradiction)(?!\p{L})/iu],
  ["si", /^(s[ií]|yes)(?!\p{L})/iu],
  ["no", /^no(?!\p{L})/iu],
];

/**
 * Splits a roll's text ("Recluse: blanco 3 / negro 5 -> No",
 * "Ironsworn: d100 67 vs 26+ -> Sí · Coincidencia") into the
 * dice detail and the result. If the detail looks like an oracle roll,
 * it tries to recognise the answer.
 */
export function splitRollText(text: string): {
  detail: string;
  result: string | null;
  answer: Answer | undefined;
} {
  // "tbl: Name d6=3 -> …" and "gen: …" show without their symbol.
  const { symbol, text: body } = splitRollSymbol(text);
  const i = body.lastIndexOf("->");
  if (i < 0) return { detail: body, result: null, answer: undefined };
  const detail = body.slice(0, i).trim();
  const result = body.slice(i + 2).trim();
  // "Oracle: white 3 / black 5" ("Oracle — …" before 1.5.1). A
  // bare "-> Yes, but…" is an oracle's answer too (Lonelog §3.2.2).
  const looksLikeOracle =
    (symbol === "d" && (/—.*\d/.test(detail) || readOracleDice(detail) !== null)) ||
    (symbol === "result" && !detail);
  let answer = looksLikeOracle ? ANSWER_PATTERNS.find(([, re]) => re.test(result))?.[0] : undefined;
  // An answer code ("Yb"), "Exceptional Yes", or another tool's "d: d100=60 vs 35 -> No".
  if (
    !answer &&
    (looksLikeOracle ||
      (symbol === "d" &&
        /\d/.test(detail) &&
        !OWN_ROLL.test(text) &&
        foreignRollKind(detail, result) === "oracle"))
  )
    answer = readAnswer(result).answer;
  return { detail, result, answer };
}

// How the app wrote a table's rolls before "tbl:", only the shapes a
// check never has: a d66, a game's table ("Ironsworn: Action d100=42"), two
// dice ("Theme 2/5") and quick inspiration ("Inspiration (Action d66=34, …)").
const TABLE_TAGS = "Ironsworn|Delve|Starforged|Knave|Loner|Starsmith|Ironsmith|Lazy GM|Cairn|OPSE";
const OLD_TABLE = new RegExp(
  String.raw`^(?:\S.*?\sd(66)=(\d+)|(?:${TABLE_TAGS}): \S.*?\sd([1-9]\d*)=(\d+)|\S.*?\s\d+/\d+|\S.*\(\S.*?\s(?:d\d+=)?[\d/]+(?:, \S.*?\s(?:d\d+=)?[\d/]+)+\))$`,
);
// What a check ends in, never a table's result ("Hit the road" is one).
const VERDICT =
  /^(?:\d+ )?(?:[SF]|(?:(?:partial|critical|strong|weak|extreme|hard|regular) )?(?:success(?:es)?|fail(?:ure)?|hits?|miss)|crit(?:ical)?|fumble|step down|depleted|(?:no )?wounds?|éxitos?(?: (?:parcial|crítico|total))?|fallo|fracaso|pifia|crítico|acierto|impacto)(?:$|[.,;:!(]|\s[(-]|\swith\b|\scon\b)/i;
const YES_NO =
  /^(?:exceptional |extreme )?(yes|no|s[ií])(?:$|[.!…]|\s+\(|,?\s*(?:and|but|y además|pero)(?!\p{L}))/iu;

/**
 * What a `d:` roll this app didn't make is (Lonelog: `d:` gives a
 * verdict, `tbl:` content). A yes or a no is an oracle's; a table's is
 * only one written as the app used to; anything else is a roll of the
 * player's own system. A roll the app did make never gets here: it's
 * linked to the history (classifyRoll).
 */
export function foreignRollKind(
  detail: string,
  result: string | null,
): "oracle" | "table" | "dice" {
  // OLD_TABLE takes long on a long text, and no table roll is (MAX_ROLL_TEXT).
  if (detail.length > MAX_ROLL_TEXT) return "dice";
  if (result !== null && (YES_NO.test(result) || ANSWER_CODE.test(result))) return "oracle";
  if (result === null || VERDICT.test(result) || /(?<!\p{L})vs\.?(?!\p{L})/iu.test(detail))
    return "dice";
  const m = detail.match(OLD_TABLE);
  if (!m) return "dice";
  const [, d66, d66Value, sides = d66, value = d66Value] = m;
  return sides && !tableDice(`d${sides}`, Number(value)) ? "dice" : "table";
}

/** Yes or no, and its shade, as an answer written in either language. */
export function readAnswer(result: string): { answer?: Answer; qualifier?: "and" | "but" } {
  const code = readAnswerCode(result);
  if (code)
    return {
      answer: code.answer,
      qualifier: code.shade === "a" ? "and" : code.shade === "b" ? "but" : undefined,
    };
  const answer = result.match(YES_NO)?.[1]?.toLowerCase();
  return {
    answer: answer ? (answer === "no" ? "no" : "si") : undefined,
    qualifier: /,\s*(pero|but)(?!\p{L})/iu.test(result)
      ? "but"
      : /,\s*(y además|and)(?!\p{L})/iu.test(result)
        ? "and"
        : undefined,
  };
}

/**
 * The rolls of the generic roller in an entry, one or several, to draw
 * each in its box. A lone one only if its result is the app's own kind
 * (a total, with or without its dice, or a card): one with prose
 * ("d20 -> Success, barely") is shown as a normal roll.
 */
export function splitOwnRolls(text: string): OwnRolls | null {
  // A table or a generator; a card gives content too.
  const { symbol, text: body } = splitRollSymbol(text);
  if (symbol === "tbl" && isCardDraw(body)) return splitRollSeries(body) ?? loneRoll(body);
  if (symbol !== "d") return null;
  return splitRollSeries(text) ?? loneRoll(text);
}

/**
 * The player's last own roll in an adventure (what was rolled and what
 * for), to make it again from the game table; null if there's none. A
 * draw of cards isn't one.
 */
export function lastOwnRoll(
  entries: readonly JournalEntry[],
  adventureId: string,
): OwnRolls | null {
  let last: JournalEntry | null = null;
  let found: OwnRolls | null = null;
  for (const entry of entries) {
    if (
      entry.kind !== "roll" ||
      entry.adventureId !== adventureId ||
      (last && entry.timestamp < last.timestamp)
    )
      continue;
    const own = splitOwnRolls(entry.text);
    const rolls = own?.rolls.filter((roll) => !roll.die.startsWith("draw=")) ?? [];
    if (!own || rolls.length === 0) continue;
    last = entry;
    found = { label: own.label, rolls };
  }
  return found;
}

/** "8 (7 + 1)": the total, and how it was reached if it says. */
export function splitRollTotal(result: string): { total: string; faces: string | null } {
  const m = result.match(/^(\S+)\s+\((.+)\)$/);
  return { total: m ? m[1]! : result, faces: m ? m[2]! : null };
}

/** "2025-09-03" as a short date ("3 sept 2025"), on that day in local time. */
export function formatIsoDay(iso: string, locale: string): string {
  const [y = NaN, m = NaN, d = NaN] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Who a bare "@" (or "PC:") is in each action of a storyline that says so: the
 * point of view on its first scene line (`T2-S1 *City* @(Jordan)`) holds
 * for all of its scenes. Names by entry id.
 */
export function storylineViews(groups: EntryGroup[]): Map<string, string> {
  const byStoryline = new Map<string, string>();
  const views = new Map<string, string>();
  let current: string | undefined;
  for (const entry of groups.flatMap((g) => g.items)) {
    if (entry.kind === "scene") {
      const { id, pov } = parseScene(entry.text);
      const storyline = id.match(/^(T\d+)-/)?.[1];
      if (storyline && pov) byStoryline.set(storyline, pov);
      current = storyline ? byStoryline.get(storyline) : pov;
    } else if (!current) continue;
    else if (entry.kind === "action") {
      if (!splitActor(entry.text).actor) views.set(entry.id, current);
    } else if (entry.kind === "note") {
      const form = noteForm(entry.text);
      if (form.form === "dialogue" && form.pc && !form.name) views.set(entry.id, current);
    }
  }
  return views;
}

/**
 * The journal filtered to one element of the notebook: the entries that
 * name it, and for a character the lines they say and what they do
 * (`@(Odile) …`). Each with its whole block (the question and roll a
 * consequence answers), so it still reads in context; sessions with
 * none are left out. `count` is how many entries are about it.
 */
export function filterGroups(
  groups: EntryGroup[],
  member: Pick<CastMember, "kind" | "name" | "mentions">,
  mainPcName?: string,
): { groups: EntryGroup[]; count: number } {
  const ids = new Set(member.mentions);
  const name = normalizeForSearch(member.name);
  const about = (e: JournalEntry) => {
    if (ids.has(e.id)) return true;
    if (member.kind !== "npc" && member.kind !== "pc") return false;
    if (e.kind === "action") {
      const actor = splitActor(e.text).actor;
      // Inside a storyline, a bare "@" is its point of view.
      if (!actor) return normalizeForSearch(pointsOfView.get(e.id) ?? "") === name;
      return actorParts(actor).some(
        (part) => part.name !== undefined && normalizeForSearch(part.name) === name,
      );
    }
    if (e.kind !== "note") return false;
    const form = noteForm(e.text);
    if (form.form !== "dialogue") return false;
    const speaker = form.name ?? pointsOfView.get(e.id) ?? (form.pc ? mainPcName : undefined);
    return speaker === undefined ? member.kind === "pc" : normalizeForSearch(speaker) === name;
  };
  const pointsOfView = storylineViews(groups);
  let count = 0;
  const filtered = groups
    .map((g) => {
      const blocks = buildEntryBlocks(g.items).filter((block) => block.some(about));
      count += blocks.reduce((n, block) => n + block.filter(about).length, 0);
      return { sessionEntry: g.sessionEntry, items: blocks.flat() };
    })
    .filter((g) => g.items.length > 0);
  return { groups: filtered, count };
}
