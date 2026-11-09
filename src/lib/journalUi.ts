import type { JournalEntry, JournalLineKind } from "./lonelog";
import { noteForm, splitRollSymbol } from "./lonelogLines";

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

/** What can be picked in the composer: the entry kinds and starting a session or a scene. */
export type ComposerMode = ComposerKind | "session" | "scene";

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
    } else if (entry.kind === "consequence" && blocks.length > 0 && !isMarker(blocks[blocks.length - 1][0])) {
      open = blocks[blocks.length - 1];
      open.push(entry);
    } else {
      open = null;
      blocks.push([entry]);
    }
  }
  return blocks;
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
 * Splits a roll's text ("Recluse — blanco 3 / negro 5 -> No",
 * "Ironsworn — d100 67 vs 26+ -> Sí · Coincidencia") into the
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
  // "Oracle — dice": table rolls and inspiration never carry a "—". A
  // bare "-> Yes, but…" is an oracle's answer too (Lonelog §3.2.2).
  const looksLikeOracle = /—.*\d/.test(detail) || (symbol === "result" && !detail);
  const answer = looksLikeOracle
    ? ANSWER_PATTERNS.find(([, re]) => re.test(result))?.[0]
    : undefined;
  return { detail, result, answer };
}

/**
 * One die or formula from the generic roller: "d10", "2d6", "d%",
 * "4dF", "2d6+3", "4d6kh3", "4d6dl1", "3d6!", "d6!!", "5d6>=5",
 * "4d6>4f<3", "(1d6+2)*3", "{4d6,2d10}k1" (see rollFormula in
 * diceNotation.ts): faces right after the "d", then anything but a space.
 */
// Not ending in "=9": "d6=5 ->" is Lonelog's rolled value (a table
// roll, "Theme d66=25 -> …"), not a formula.
const DIE = String.raw`[-({\d]*d(?:\d|%|F|\()[^\s]*?(?<!(?:^|[^<>!])=\d+)`;
/** Text with a roll of the generic roller in it ("Attack 2d6+3 -> 9 (…)"). */
export const OWN_ROLL = new RegExp(String.raw`(^|\s)${DIE}\s*->`);
// Each roll, and the description of every one after the first
// ("…, Fire 2d6 -> 7 (3+4)"); the first one's is the series' label.
const ROLL_SEGMENT = new RegExp(
  String.raw`(?:([^,>]*?)\s+)?(${DIE})\s*->\s*(.+?)(?=\s*,\s*(?:[^,>]*?\s+)?${DIE}\s*->|\s+${DIE}\s*->|\s*$)`,
  "g",
);

/**
 * Recognises several chained rolls in a single entry ("d10 -> 9,
 * d10 -> 5", or with spaces instead of commas as they used to be
 * saved), with an optional text in front ("Attack d20 -> 14, d8 -> 3").
 * Returns null if there are fewer than two or if there's leftover text
 * that doesn't fit, so that entry is shown as a normal roll
 * (splitRollText).
 */
export function splitRollSeries(
  text: string,
): { label: string; rolls: { label: string; die: string; result: string }[] } | null {
  const first = text.search(OWN_ROLL);
  if (first < 0) return null;
  const label = text.slice(0, first).trim().replace(/,$/, "");
  const rest = text.slice(first).trim();
  const rolls: { label: string; die: string; result: string }[] = [];
  for (const m of rest.matchAll(ROLL_SEGMENT)) {
    rolls.push({ label: m[1]?.trim() ?? "", die: m[2], result: m[3].trim() });
  }
  const leftover = rest.replace(ROLL_SEGMENT, "").replace(/[\s,]/g, "");
  if (rolls.length < 2 || leftover) return null;
  return { label, rolls };
}
