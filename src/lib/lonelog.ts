/**
 * Lonelog notation (Roberto Bisceglie, CC BY-SA 4.0):
 * https://lonelog.itch.io/lonelog — an open plain-text standard for
 * logging solo RPG sessions. Five symbols:
 *
 *   @   player action
 *   ?   question to the oracle
 *   d:  roll (the result goes inline with "->", e.g. "d: ... -> ...")
 *   =>  narrative consequence
 *   === Title ===   section/session header
 *
 * This module is the only place that knows how to translate between
 * our journal entries and that text format, in both directions
 * (export/import), so the result is a valid .md for any
 * Lonelog-compatible tool (e.g. the Obsidian plugin), not just this
 * app. It's exported in the notation as is, without swapping symbols
 * for Markdown equivalents — the spacing between lines (a blank one
 * between entries) is the only thing adjusted, so it reads well as
 * paragraphs.
 */

import { interpolate, type Dictionary } from "./i18n";

export type JournalLineKind =
  | "action"
  | "question"
  | "roll"
  | "consequence"
  | "note"
  | "session";

export interface JournalEntry {
  id: string;
  adventureId: string;
  timestamp: number;
  kind: JournalLineKind;
  /** The text without the Lonelog symbol/prefix. */
  text: string;
  /** If the entry comes from an app roll, its id in the history. */
  linkedRollId?: string;
}

const PREFIX: Record<Exclude<JournalLineKind, "note" | "session">, string> = {
  action: "@ ",
  question: "? ",
  roll: "d: ",
  consequence: "=> ",
};

/**
 * A note whose text starts like a Lonelog symbol (or like a Markdown
 * heading/quote) would be read as something else on import: it's
 * escaped with "\\", which is also Markdown's standard escape and
 * doesn't show when rendered.
 */
const NEEDS_ESCAPE = /^(@|\?|d:|=>|===|#|>|\\)/;

/**
 * Entries can span several lines (the editor allows it). Continuation
 * lines are exported indented by two spaces: in Markdown they're still
 * the same paragraph, and on import the indent says they belong to the
 * previous entry even if they start with a symbol. Blank lines in
 * between are kept.
 */
export function formatLine(entry: Pick<JournalEntry, "kind" | "text">): string {
  if (entry.kind === "session") {
    // A session title is a single line by definition.
    return `=== ${entry.text.replace(/\s*\n\s*/g, " ")} ===`;
  }
  const [first, ...rest] = entry.text.split(/\r?\n/);
  const head =
    entry.kind === "note"
      ? NEEDS_ESCAPE.test(first) ? `\\${first}` : first
      : `${PREFIX[entry.kind]}${first}`;
  return [head, ...rest.map((line) => (line.trim() ? `  ${line}` : ""))].join("\n");
}

export const LONELOG_URL = "https://lonelog.itch.io/lonelog";
export const LONELOG_LICENSE_URL = "https://creativecommons.org/licenses/by-sa/4.0/";
export const APP_URL = "https://jgalilea.github.io/solo-compass/";

/** Credit with real Markdown links (not just plain text with the URL). */
export function buildCreditLine(t: Dictionary): string {
  return interpolate(t.journal.lonelogCreditLine, {
    app: `[Solo Compass](${APP_URL})`,
    lonelog: `[Lonelog](${LONELOG_URL})`,
  });
}

/**
 * Builds an adventure's .md: header + visible credit to Lonelog (as a
 * quote, not a hidden comment) + one entry per paragraph. Each block
 * is separated by a blank line (not just a line break) so Markdown
 * treats them as separate paragraphs — otherwise most viewers glue
 * them all together into one.
 */
export function exportAdventureToMarkdown(
  t: Dictionary,
  adventureName: string,
  entries: JournalEntry[],
  notes = "",
): string {
  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
  const lines = sorted.map((e) => formatLine(e));
  const blocks = [`# ${adventureName}`, `> ${buildCreditLine(t)}`, ...lines];
  return formatFrontMatter(notes) + blocks.join("\n\n") + "\n";
}

/**
 * The adventure's pinned notes go where Lonelog puts a campaign's
 * metadata in a digital log (§5.1): YAML front matter at the very top,
 * in its `notes` field. A literal block ("|") keeps the lines, lists
 * and checkboxes as written, and Markdown viewers (Obsidian too) show
 * it as the file's properties instead of as text.
 */
function formatFrontMatter(notes: string): string {
  const text = notes.replace(/\r\n?/g, "\n").replace(/\s+$/, "");
  if (!text.trim()) return "";
  const body = text
    .split("\n")
    .map((line) => (line.trim() ? `  ${line}` : ""))
    .join("\n");
  return `---\nnotes: |\n${body}\n---\n\n`;
}

const FRONT_MATTER = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

/** The front matter's text (without the "---" lines) and what follows it. */
function splitFrontMatter(text: string): { frontMatter: string | null; body: string } {
  const clean = text.replace(/^\uFEFF/, "");
  const match = clean.match(FRONT_MATTER);
  // Only if it reads as YAML: a log that opens with a "---" rule and
  // has another further down mustn't lose what's in between.
  const yaml = match?.[1]
    .split(/\r?\n/)
    .every((line) => !line.trim() || /^\s/.test(line) || /^(#|- |[\w-]+\s*:)/.test(line));
  if (!match || !yaml) return { frontMatter: null, body: clean };
  return { frontMatter: match[1], body: clean.slice(match[0].length) };
}

/**
 * Reads the pinned notes back from a Lonelog .md: the `notes` field of
 * its front matter, as a literal (|) or folded (>) block or on one
 * line, quoted or not. Just enough YAML for that field: other fields
 * (title, ruleset…) are left alone. Empty if there's none.
 */
export function parseNotesFromMarkdown(text: string): string {
  const { frontMatter } = splitFrontMatter(text);
  if (frontMatter === null) return "";
  const lines = frontMatter.split(/\r?\n/);
  const start = lines.findIndex((l) => /^notes\s*:/i.test(l));
  if (start < 0) return "";
  const value = lines[start].replace(/^notes\s*:\s*/i, "");

  const block = value.match(/^([|>])[+-]?\s*$/);
  if (!block) {
    const single = value.trim();
    if (single.startsWith('"') && single.endsWith('"') && single.length > 1) {
      try {
        return JSON.parse(single) as string;
      } catch {
        return single.slice(1, -1);
      }
    }
    if (single.startsWith("'") && single.endsWith("'") && single.length > 1) {
      return single.slice(1, -1).replace(/''/g, "'");
    }
    return single;
  }

  // The block is every following line that's blank or indented, with
  // the first line's indentation taken off.
  const content: string[] = [];
  let indent = -1;
  for (const line of lines.slice(start + 1)) {
    if (!line.trim()) {
      content.push("");
      continue;
    }
    const lead = line.match(/^ */)![0].length;
    if (indent < 0) indent = lead;
    if (lead < indent || indent === 0) break;
    content.push(line.slice(indent));
  }
  const literal = content.join("\n").replace(/\s+$/, "");
  // Folded: single line breaks become spaces, blank lines stay.
  return block[1] === ">" ? literal.replace(/([^\n])\n(?=[^\n])/g, "$1 ") : literal;
}

const ROLL_PREFIX = /^d:\s?/;
/** An indented line continues the previous entry (see formatLine). */
const CONTINUATION_LINE = /^[ \t]+\S/;
const ACTION_PREFIX = /^@\s?/;
const QUESTION_PREFIX = /^\?\s?/;
const CONSEQUENCE_PREFIX = /^=>\s?/;
/** "=== Title ===", Lonelog's session marker. */
const LEGACY_SESSION_LINE = /^===\s*(.+?)\s*===$/;
/** "## Title" — we don't export it, but it's still recognised on import
 *  in case the file comes from elsewhere and uses a Markdown heading
 *  instead of Lonelog's marker for sessions. */
const H2_SESSION_LINE = /^##\s+(.+?)\s*$/;
/** H1 title (# alone, not ## or more) — the adventure name to ignore. */
const H1_TITLE_LINE = /^#(?!#)/;

/**
 * Parses Lonelog text into entries. Deliberately permissive: any line
 * that doesn't match a recognised symbol is kept as a note instead of
 * being dropped or failing — just as Lonelog allows extra content
 * (tags, loose prose) without breaking the rest of the document.
 *
 * - The header (the H1 title with the adventure name and the ">"
 *   quotes after it, like our credit) is only ignored at the start:
 *   further down, "#clue" or "> a quote" are notes.
 * - Sessions are recognised in "=== Title ===" (what we export) and
 *   also in "## Title", in case the file comes from elsewhere.
 * - An indented line continues the previous entry (multi-line
 *   entries); a leading "\\" escapes a note that starts with a symbol.
 */
export function parseMarkdownToEntries(
  text: string,
  adventureId: string,
  startTimestamp: number,
): JournalEntry[] {
  const entries: JournalEntry[] = [];
  // Without a possible leading BOM (our own export adds it so external
  // viewers detect UTF-8 correctly), which would sneak into the first
  // line and leave it unrecognised, and without the front matter (the
  // pinned notes: see parseNotesFromMarkdown).
  const lines = splitFrontMatter(text).body.split(/\r?\n/);
  let inHeader = true;
  let seenTitle = false;
  // Blank lines since the last line of the previous entry, to keep
  // them if what follows is a continuation.
  let pendingBlankLines = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      pendingBlankLines += 1;
      continue;
    }

    const previous = entries[entries.length - 1];
    if (previous && previous.kind !== "session" && CONTINUATION_LINE.test(rawLine)) {
      previous.text += "\n".repeat(pendingBlankLines + 1) + line;
      pendingBlankLines = 0;
      continue;
    }
    pendingBlankLines = 0;

    if (inHeader) {
      if (!seenTitle && H1_TITLE_LINE.test(line)) {
        seenTitle = true;
        continue;
      }
      if (line.startsWith(">")) continue;
      inHeader = false;
    }

    const h2Match = line.match(H2_SESSION_LINE);
    const legacySessionMatch = line.match(LEGACY_SESSION_LINE);
    let kind: JournalLineKind;
    let content: string;

    if (line.startsWith("\\")) {
      kind = "note";
      content = line.slice(1);
    } else if (h2Match) {
      kind = "session";
      content = h2Match[1];
    } else if (legacySessionMatch) {
      kind = "session";
      content = legacySessionMatch[1];
    } else if (ROLL_PREFIX.test(line)) {
      kind = "roll";
      content = line.replace(ROLL_PREFIX, "");
    } else if (ACTION_PREFIX.test(line)) {
      kind = "action";
      content = line.replace(ACTION_PREFIX, "");
    } else if (QUESTION_PREFIX.test(line)) {
      kind = "question";
      content = line.replace(QUESTION_PREFIX, "");
    } else if (CONSEQUENCE_PREFIX.test(line)) {
      kind = "consequence";
      content = line.replace(CONSEQUENCE_PREFIX, "");
    } else {
      kind = "note";
      content = line;
    }

    const index = entries.length;
    entries.push({
      // Plain text has no real timestamp per line: sequential ones are
      // generated to keep the file's order when displaying it.
      id: `${startTimestamp}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      adventureId,
      timestamp: startTimestamp + index,
      kind,
      text: content,
    });
  }

  return entries;
}
