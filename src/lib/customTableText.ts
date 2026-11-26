/**
 * The player's own tables as text: the editor's lines, a file to import
 * (Markdown, plain text or JSON) and the Markdown to share one, which
 * this same parser reads back; also a table written out in a journal.
 * Deliberately forgiving (see customTables.ts). Apart from the tables'
 * storage, which the first screen loads: this is only needed to edit,
 * import or export one.
 */

import { interpolate, LOCALES, type Dictionary } from "./i18n";
import { TABLE_THEME_NAMES } from "./i18n/tableThemeNames";
import { normalizeForSearch } from "./text";
import { diceSides, diceValues, formatRange, TABLE_THEMES, type DiceType, type TableEntry, type TableTheme } from "./tables";
import {
  EDITOR_DICE,
  isTableDie,
  MAX_TABLE_SIDES,
  webAddress,
  type CustomTable,
  type CustomTableDraft,
  type DiceChoice,
  type TableSource,
} from "./customTables";

/**
 * A table written out in a journal (Lonelog §4.3.1–4.3.2) as one of the
 * player's, to review in the editor: "tbl: Mood (d4) [Tense, Calm…]" or
 * a first line and a result per line ("1-2: Nothing"). On the die it
 * says if its results fit it, or one face each. With results the editor
 * can't take (fewer than two), it opens with what there is.
 */
export function definitionDraft(t: Dictionary, text: string): CustomTableDraft {
  const [first, ...rest] = text.replace(/^tbl:\s*/, "").split("\n");
  const list = first.match(/^(.*?)\s*\[(.+)\]\s*$/);
  const head = (list ? list[1] : first).trim();
  const name = head.replace(/\s*\([^()]*\)$/, "").trim() || t.tables.editor.newTitle;
  const die = head.match(/\(\s*\d*(d(?:\d+|%))\s*\)$/i)?.[1].toLowerCase().replace("%", "100") as DiceType | undefined;
  const parsed = list
    ? { lines: list[2].split(",").map((x) => ({ text: x.trim() })).filter((l) => l.text), mixedRanges: false }
    : parseEntryLines(rest.join("\n"));
  const attempts = [...(die ? [buildEntries(t, parsed, die)] : []), buildEntries(t, parsed, "auto"), buildEntries(t, { lines: parsed.lines.map((l) => ({ text: l.text })), mixedRanges: false }, "auto")];
  const built = attempts.find((b) => b.ok);
  return built?.ok
    ? { name, description: "", dice: built.dice, entries: built.entries }
    : { name, description: "", dice: "d1" as DiceType, entries: parsed.lines.map((l, i) => ({ range: [i + 1, i + 1], text: l.text })) };
}

/**
 * A theme from a file: its id ("characters") or its name in any of the
 * app's languages ("Personajes", "Characters"), ignoring case and accents.
 */
export function parseTheme(value: string | undefined): TableTheme | undefined {
  if (!value) return undefined;
  const wanted = normalizeForSearch(value.trim());
  return TABLE_THEMES.find(
    (theme) =>
      theme === wanted || LOCALES.some((l) => normalizeForSearch(TABLE_THEME_NAMES[l][theme]) === wanted),
  );
}

// --- Parsing --------------------------------------------------------

export interface ParsedLine {
  range?: [number, number];
  text: string;
}

const LIST_MARKER = /^(?:[-*+•]\s+)/;
const RANGE_PREFIX = /^(\d+)(?:\s*[-–—]\s*(\d+))?(?:\s*[.):]\s*|\s+)(\S.*)$/;
const RANGE_CELL = /^(\d+)(?:\s*[-–—]\s*(\d+))?$/;

/** Splits a Markdown table row on unescaped "|" ("\|" is a literal bar). */
function splitRow(line: string): string[] {
  const inner = line.trim().replace(/^\|/, "").replace(/(?<!\\)\|$/, "");
  return inner.split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, "|"));
}

function toRange(from: string, to: string | undefined): [number, number] {
  const a = Number(from);
  const b = to === undefined ? a : Number(to);
  return a <= b ? [a, b] : [b, a];
}

/**
 * Reads the result lines of a table. Blank lines are skipped. A
 * leading number is only taken as a range when (nearly) every line has
 * one: otherwise "3 sleepy guards" keeps its number as part of the text.
 * Returns the die found in a Markdown table header ("| d20 | … |"), if any.
 */
export function parseEntryLines(text: string): { lines: ParsedLine[]; dice?: DiceType; mixedRanges: boolean } {
  const raw: { ranged?: ParsedLine; plain: string }[] = [];
  let dice: DiceType | undefined;
  let tableRows = 0;

  for (const original of text.split(/\r?\n/)) {
    const line = original.trim();
    if (!line) continue;

    if (line.startsWith("|")) {
      const cells = splitRow(line);
      if (cells.every((c) => /^:?-{2,}:?$/.test(c) || c === "")) continue; // separator row
      const first = tableRows++ === 0;
      const m = RANGE_CELL.exec(cells[0]);
      if (m && cells.length > 1) {
        const rest = cells.slice(1).filter(Boolean).join(" — ");
        raw.push({ ranged: { range: toRange(m[1], m[2]), text: rest }, plain: rest });
      } else if (first && cells.length > 1) {
        // Header row: its first cell may name the die.
        const die = cells[0].toLowerCase();
        if (die === "d66" || diceSides(die) > 0) dice = die as DiceType;
      } else {
        const joined = cells.filter(Boolean).join(" — ");
        raw.push({ plain: joined });
      }
      continue;
    }

    const unbulleted = line.replace(LIST_MARKER, "");
    const m = RANGE_PREFIX.exec(unbulleted);
    raw.push({
      ranged: m ? { range: toRange(m[1], m[2]), text: m[3].trim() } : undefined,
      plain: unbulleted,
    });
  }

  const withRange = raw.filter((r) => r.ranged).length;
  if (raw.length > 0 && withRange === raw.length) {
    return { lines: raw.map((r) => r.ranged!), dice, mixedRanges: false };
  }
  // Most lines numbered but not all: it's a mistake, not text that
  // happens to start with a number.
  const mixedRanges = withRange > 0 && withRange >= raw.length / 2;
  return { lines: raw.map((r) => ({ text: r.plain })), dice, mixedRanges };
}

export type BuildResult =
  | { ok: true; dice: DiceType; entries: TableEntry[] }
  | { ok: false; error: string };

/**
 * Turns the parsed lines into entries for the chosen die, checking
 * that every value of the die has exactly one result. Errors come
 * already written (in the dictionary's language) for the editor.
 */
export function buildEntries(
  t: Dictionary,
  parsed: { lines: ParsedLine[]; mixedRanges: boolean },
  choice: DiceChoice,
): BuildResult {
  const e = t.tables.editor;
  const { lines } = parsed;
  if (parsed.mixedRanges) return { ok: false, error: e.errorMixed };
  if (lines.length < 2) return { ok: false, error: e.errorTooFew };
  if (lines.some((l) => !l.text)) return { ok: false, error: e.errorTooFew };

  const ranged = lines.every((l) => l.range);
  if (!ranged) {
    if (choice === "auto") {
      if (lines.length === 66) return { ok: false, error: e.errorD66Lines };
      if (lines.length > MAX_TABLE_SIDES) return { ok: false, error: e.errorTooBig };
      const dice = `d${lines.length}` as DiceType;
      return { ok: true, dice, entries: lines.map((l, i) => ({ range: [i + 1, i + 1], text: l.text })) };
    }
    if (!isTableDie(choice)) return { ok: false, error: e.errorTooBig };
    const values = diceValues(choice);
    if (values.length !== lines.length) {
      return {
        ok: false,
        error: interpolate(e.errorCount, { dice: choice, expected: values.length, count: lines.length }),
      };
    }
    return { ok: true, dice: choice, entries: lines.map((l, i) => ({ range: [values[i], values[i]], text: l.text })) };
  }

  const entries = lines
    .map((l) => ({ range: l.range!, text: l.text }))
    .sort((a, b) => a.range[0] - b.range[0]);
  let dice: DiceType;
  if (choice !== "auto") dice = choice;
  else {
    const min = entries[0].range[0];
    const max = Math.max(...entries.map((x) => x.range[1]));
    dice = min === 11 && max === 66 ? "d66" : (`d${max}` as DiceType);
  }

  if (!isTableDie(dice)) return { ok: false, error: e.errorTooBig };

  const values = diceValues(dice);
  // Where each value is in the die's list (d66: 11–16, 21–26…).
  const position = new Map(values.map((v, i) => [v, i]));
  // How many results cover each value, as differences: +1 where a range
  // starts, -1 after it ends (a loop over every value of every range
  // took far too long with big dice).
  const steps = new Int32Array(values.length + 1);
  for (const entry of entries) {
    for (const end of entry.range) {
      if (!position.has(end)) return { ok: false, error: rangeError(t, values, end) };
    }
    steps[position.get(entry.range[0])!]++;
    steps[position.get(entry.range[1])! + 1]--;
  }
  let covered = 0;
  for (let i = 0; i < values.length; i++) {
    covered += steps[i];
    if (covered !== 1) return { ok: false, error: rangeError(t, values, values[i]) };
  }
  return { ok: true, dice, entries };
}

function rangeError(t: Dictionary, values: number[], value: number): string {
  return interpolate(t.tables.editor.errorRanges, { from: values[0], to: values.at(-1)!, value });
}

/**
 * The editor's text for a saved table: plain lines if each value has
 * its own result (the usual case), with ranges otherwise.
 */
export function entriesToText(table: Pick<CustomTable, "dice" | "entries">): string {
  const values = diceValues(table.dice);
  const plain =
    table.entries.length === values.length &&
    table.entries.every((e, i) => e.range[0] === values[i] && e.range[1] === values[i]);
  return table.entries
    .map((e) => (plain ? e.text : `${formatRange(e.range).replace("–", "-")} ${e.text}`))
    .join("\n");
}

/** The die choice the editor opens with: "auto" if it's just "one face per line". */
export function diceChoiceFor(table: Pick<CustomTable, "dice" | "entries">): DiceChoice {
  const sides = diceSides(table.dice);
  const oneFacePerLine =
    sides === table.entries.length && table.entries.every((e, i) => e.range[0] === i + 1 && e.range[1] === i + 1);
  return oneFacePerLine && !EDITOR_DICE.includes(table.dice) ? "auto" : table.dice;
}

// --- Files ----------------------------------------------------------

// Labels recognised on import, in any of the app's languages (the
// export writes them in the current one).
const META_LINE =
  /^(fuente|juego o libro|source|game or book|autor[ií]a|autor|author|licencia|license|enlace|link|url)\s*:\s*(.+)$/i;
const DIE_LINE = /^(?:(?:dado|die|dice)\s*:?\s*)?(d\d+)$/i;
const THEME_LINE = /^(tem[aá]tica|theme)\s*:\s*(.+)$/i;

function metaKey(label: string): keyof TableSource {
  const l = label.toLowerCase();
  if (l.startsWith("aut")) return "author";
  if (l.startsWith("lic")) return "license";
  if (l === "enlace" || l === "link" || l === "url") return "url";
  return "name";
}

/**
 * Reads every table in a file. JSON: one table, a list, or
 * `{ tables: [...] }`. Markdown/text: each "#" heading starts a table
 * (without headings, the whole file is one table named after the
 * file). Tables that don't validate are skipped.
 */
export function parseTablesFile(t: Dictionary, text: string, filename: string): CustomTableDraft[] {
  const fallbackName = filename.replace(/\.[^.]+$/, "").trim() || t.tables.editor.newTitle;
  const trimmed = text.replace(/^﻿/, "").trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return parseJsonTables(t, JSON.parse(trimmed), fallbackName);
    } catch {
      return [];
    }
  }

  const sections: { name: string; body: string[] }[] = [];
  let current: { name: string; body: string[] } | null = null;
  for (const line of trimmed.split(/\r?\n/)) {
    const heading = /^#{1,3}\s+(.+)$/.exec(line.trim());
    if (heading) {
      current = { name: heading[1].trim(), body: [] };
      sections.push(current);
    } else {
      if (!current) {
        current = { name: fallbackName, body: [] };
        sections.push(current);
      }
      current.body.push(line);
    }
  }

  const drafts: CustomTableDraft[] = [];
  for (const section of sections) {
    const description: string[] = [];
    const source: TableSource = {};
    let dice: DiceType | undefined;
    let theme: TableTheme | undefined;
    const entryLines: string[] = [];
    for (const line of section.body) {
      const l = line.trim();
      const quote = /^>\s?(.*)$/.exec(l);
      const meta = META_LINE.exec(l);
      const die = DIE_LINE.exec(l);
      const themeLine = THEME_LINE.exec(l);
      if (quote) description.push(quote[1].trim());
      else if (themeLine) theme = parseTheme(themeLine[2]);
      else if (meta) source[metaKey(meta[1])] = meta[2].trim();
      else if (die) dice = die[1].toLowerCase() as DiceType;
      else entryLines.push(line);
    }
    const parsed = parseEntryLines(entryLines.join("\n"));
    const built = buildEntries(t, parsed, dice ?? parsed.dice ?? "auto");
    if (!built.ok) continue;
    drafts.push({
      name: section.name,
      description: description.join(" ").trim(),
      dice: built.dice,
      entries: built.entries,
      source: cleanSource(source),
      theme,
    });
  }
  return drafts;
}

function parseJsonTables(t: Dictionary, data: unknown, fallbackName: string): CustomTableDraft[] {
  const list = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { tables?: unknown }).tables)
      ? (data as { tables: unknown[] }).tables
      : [data];
  const drafts: CustomTableDraft[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const v = item as Record<string, unknown>;
    if (!Array.isArray(v.entries)) continue;
    const lines: ParsedLine[] = [];
    for (const e of v.entries) {
      if (typeof e === "string") lines.push({ text: e.trim() });
      else if (e && typeof e === "object" && typeof (e as { text?: unknown }).text === "string") {
        const r = (e as { range?: unknown }).range;
        const range =
          Array.isArray(r) && r.length === 2 && r.every((n) => Number.isInteger(n))
            ? toRange(String(r[0]), String(r[1]))
            : Number.isInteger(r)
              ? toRange(String(r), undefined)
              : undefined;
        lines.push({ range, text: (e as { text: string }).text.trim() });
      }
    }
    // All or none with ranges, as in the text format.
    const usable = lines.every((l) => l.range) ? lines : lines.map((l) => ({ text: l.text }));
    const dice = typeof v.dice === "string" && (v.dice === "d66" || diceSides(v.dice) > 0) ? (v.dice as DiceType) : "auto";
    const built = buildEntries(t, { lines: usable, mixedRanges: false }, dice);
    if (!built.ok) continue;
    const str = (key: string) => (typeof v[key] === "string" ? (v[key] as string).trim() : undefined);
    drafts.push({
      name: str("name") || fallbackName,
      description: str("description") ?? "",
      dice: built.dice,
      entries: built.entries,
      source: cleanSource({ name: str("source"), author: str("author"), license: str("license"), url: str("url") }),
      theme: parseTheme(str("theme")),
    });
  }
  return drafts;
}

export function cleanSource(source: TableSource): TableSource | undefined {
  const clean: TableSource = {};
  for (const key of ["name", "author", "license", "url"] as const) {
    const value = key === "url" ? webAddress(source.url) : source[key]?.trim();
    if (value) clean[key] = value;
  }
  return Object.keys(clean).length ? clean : undefined;
}

/** Markdown for sharing a table: readable as is, and importable back. */
export function exportTableToMarkdown(t: Dictionary, table: CustomTable): string {
  const labels = t.tables.editor;
  const lines = [`# ${table.name}`, ""];
  if (table.description) lines.push(`> ${table.description}`, "");
  if (table.theme) lines.push(`${labels.themeLabel}: ${t.tables.themes[table.theme]}`, "");
  const source = table.source ?? {};
  const meta = [
    [labels.sourceLabel, source.name],
    [labels.authorLabel, source.author],
    [labels.licenseLabel, source.license],
    [labels.urlLabel, source.url],
  ].filter((pair): pair is [string, string] => !!pair[1]);
  if (meta.length) lines.push(...meta.map(([label, value]) => `${label}: ${value}`), "");
  lines.push(`| ${table.dice} | ${t.tables.resultColumn} |`, "|---|---|");
  for (const entry of table.entries) {
    lines.push(`| ${formatRange(entry.range)} | ${entry.text.replace(/\|/g, "\\|")} |`);
  }
  return lines.join("\n") + "\n";
}
