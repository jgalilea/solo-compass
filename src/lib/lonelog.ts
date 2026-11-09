/**
 * Lonelog notation (Roberto Bisceglie, CC BY-SA 4.0):
 * https://lonelog.itch.io/lonelog — an open plain-text standard for
 * logging solo RPG sessions (spec 1.6.0). Its symbols, as entries:
 *
 *   @   player action (`@(Name)` for another actor)
 *   ?   question to the oracle
 *   d:  roll (the result goes inline with "->", e.g. "d: ... -> ...");
 *       also `tbl:` (a table), `gen:` (a generator) and a bare
 *       `-> result`, kept as written in the roll's text
 *   =>  narrative consequence
 *   === Title ===   session header
 *   S1 *context*    scene (also S5a, S7.1, T1-S2)
 *
 * Anything else (prose, tags, dialogue, `(note: …)`, `\---` blocks)
 * is a note.
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
import type { CastDescription } from "./journal";
import { buildCast, castKey, formatTag, splitTags } from "./lonelogTags";

export type JournalLineKind =
  | "action"
  | "question"
  | "roll"
  | "consequence"
  | "note"
  | "session"
  | "scene";

export interface JournalEntry {
  id: string;
  adventureId: string;
  timestamp: number;
  kind: JournalLineKind;
  /** The text without the Lonelog symbol/prefix. */
  text: string;
  /** If the entry comes from an app roll, its id in the history. */
  linkedRollId?: string;
  /** Last edit (ms), if it was edited: the newer edit wins on a merge. */
  editedAt?: number;
}

const PREFIX: Record<Exclude<JournalLineKind, "note" | "session" | "scene">, string> = {
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
const NEEDS_ESCAPE = /^(@|\?|d:|tbl:|gen:|->|=>|===|#|>|\\)/;

/** What opens an entry of its own, even on an indented line. */
const STARTS_ENTRY = /^(@|\?|d:|tbl:|gen:|->|=>|===)/;

/**
 * A roll whose text already carries its own resolution symbol (`tbl:`,
 * `gen:`, or a bare `->`) is written as is; any other gets `d:`.
 */
const OWN_ROLL_SYMBOL = /^(tbl:|gen:|->)/;

/** A scene marker (§5.3): S1, S5a (flashback), S7.1 (montage), T1-S2 or T1+T2-S5 (threads). */
export const SCENE_ID = String.raw`(?:T\d+(?:\+T\d+)*-)?S\d+(?:\.\d+|[a-z])?`;
/** "S1", "S1 *Tavern*", "S5 [R:4|active] *Store*", "### S1 *…*" (Markdown heading). */
const SCENE_LINE = new RegExp(String.raw`^(?:###\s+)?(${SCENE_ID}(?:\s+[*\[(].*)?)$`);

/** A narrative block (§4.4): in-world text between `\---` and `---\`. */
const EXCERPT = /^\\---\n[\s\S]*\n---\\$/;
const EXCERPT_OPEN = /^\\---$/;
const EXCERPT_CLOSE = /^---\\$/;

/**
 * Entries can span several lines (the editor allows it). Continuation
 * lines are exported indented by two spaces: in Markdown they're still
 * the same paragraph, and on import the indent says they belong to the
 * previous entry. One that starts with a symbol is escaped with "\\"
 * too: Lonelog's indentation is only visual (§2.3), so on import an
 * indented "d:" or "=>" is an entry of its own. Blank lines in between
 * are kept.
 */
export function formatLine(entry: Pick<JournalEntry, "kind" | "text">): string {
  if (entry.kind === "session") {
    // A session title is a single line by definition.
    return `=== ${entry.text.replace(/\s*\n\s*/g, " ")} ===`;
  }
  if (entry.kind === "scene") return entry.text.replace(/\s*\n\s*/g, " ");
  // Its own markers delimit it: written as is, lines and all.
  if (entry.kind === "note" && EXCERPT.test(entry.text)) return entry.text;
  const [first, ...rest] = entry.text.split(/\r?\n/);
  const head =
    entry.kind === "note"
      ? NEEDS_ESCAPE.test(first) ? `\\${first}` : first
      : entry.kind === "roll" && OWN_ROLL_SYMBOL.test(first)
        ? first
        : `${PREFIX[entry.kind]}${first}`;
  const continuation = (line: string) =>
    line.trim() ? `  ${STARTS_ENTRY.test(line.trimStart()) || line.trimStart().startsWith("\\") ? "\\" : ""}${line.trimStart()}` : "";
  return [head, ...rest.map(continuation)].join("\n");
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
  descriptions: Record<string, CastDescription> = {},
  dates?: { createdAt: number; updatedAt: number },
): string {
  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
  const lines = sorted.map((e) => formatLine(e));
  const blocks = [`# ${adventureName}`, `> ${buildCreditLine(t)}`, ...lines];
  const header = [
    `title: ${JSON.stringify(adventureName)}`,
    ...(dates ? [`start_date: ${isoDate(dates.createdAt)}`, `last_update: ${isoDate(dates.updatedAt)}`] : []),
  ];
  return formatFrontMatter(notes, formatDescriptions(sorted, descriptions), header) + blocks.join("\n\n") + "\n";
}

/** "2025-09-03", in local time like the dates shown in the app. */
function isoDate(time: number): string {
  const d = new Date(time);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Lonelog has no place for describing a character or place (only for
 * its tags), but its front matter takes any field, and its own example
 * already puts tags there (`pcs:`). So each description is one line of
 * a `descriptions` field: the element's tag, then the text, its extra
 * lines indented. Only elements still in the journal (the tag is
 * written as it is there).
 */
function formatDescriptions(sorted: JournalEntry[], descriptions: Record<string, CastDescription>): string {
  return buildCast(sorted)
    .map((member) => {
      const text = descriptions[member.key]?.text.replace(/\r\n?/g, "\n").trim();
      return text ? `${formatTag(member.kind, member.name)} ${text.replace(/\n/g, "\n  ")}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

/**
 * The adventure's pinned notes go where Lonelog puts a campaign's
 * metadata in a digital log (§5.1): YAML front matter at the very top,
 * in its `notes` field, after the campaign's `title` and dates
 * (`start_date`, `last_update`) when given. A literal block ("|") keeps the lines, lists
 * and checkboxes as written, and Markdown viewers (Obsidian too) show
 * it as the file's properties instead of as text.
 */
export function formatFrontMatter(notes: string, descriptions = "", header: string[] = []): string {
  const fields = [...header, yamlBlock("notes", notes), yamlBlock("descriptions", descriptions)].filter(Boolean);
  return fields.length ? `---\n${fields.join("\n")}\n---\n\n` : "";
}

/** `name: |` and the text below it, indented; nothing if it's empty. */
function yamlBlock(name: string, value: string): string {
  const text = value.replace(/\r\n?/g, "\n").replace(/\s+$/, "");
  if (!text.trim()) return "";
  const body = text
    .split("\n")
    .map((line) => (line.trim() ? `  ${line}` : ""))
    .join("\n");
  return `${name}: |\n${body}`;
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
 * The adventure's name in a Lonelog .md, if it says: the front
 * matter's `title`, the H1 heading, or the analog campaign header
 * ("=== Campaign Log: Title ==="). Empty if none.
 */
export function parseTitleFromMarkdown(text: string): string {
  const title = readFrontMatterField(text, "title").trim();
  if (title) return title;
  for (const raw of splitFrontMatter(text).body.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || CODE_FENCE.test(line)) continue;
    const h1 = line.match(/^#(?!#)\s*(.+)$/);
    if (h1) return h1[1].trim();
    const campaign = line.match(CAMPAIGN_LOG_LINE);
    if (campaign) return campaign[1];
    if (!line.startsWith(">")) break;
  }
  return "";
}

/** Reads the pinned notes back from a Lonelog .md: its front matter's `notes`. */
export function parseNotesFromMarkdown(text: string): string {
  return readFrontMatterField(text, "notes");
}

/**
 * The descriptions back from the front matter (see formatDescriptions),
 * by castKey. A line that opens with a tag starts one; indented lines
 * below it continue it.
 */
export function parseDescriptionsFromMarkdown(text: string, now = Date.now()): Record<string, CastDescription> {
  const result: Record<string, CastDescription> = {};
  let current: { key: string; lines: string[] } | null = null;
  const save = () => {
    const value = current?.lines.join("\n").trim();
    if (current && value) result[current.key] = { text: value, updatedAt: now };
  };
  for (const line of readFrontMatterField(text, "descriptions").split("\n")) {
    const first = splitTags(line)[0];
    if (first?.tag && !/^\s/.test(line)) {
      save();
      current = { key: castKey(first.tag.kind, first.tag.name), lines: [line.slice(first.text.length).trim()] };
    } else if (current) {
      current.lines.push(line.replace(/^ {2}/, ""));
    }
  }
  save();
  return result;
}

/**
 * One field of the front matter, as a literal (|) or folded (>) block
 * or on one line, quoted or not. Just enough YAML for the fields this
 * app writes: the rest (title, ruleset…) is left alone. Empty if
 * there's none.
 */
function readFrontMatterField(text: string, name: string): string {
  const { frontMatter } = splitFrontMatter(text);
  if (frontMatter === null) return "";
  const lines = frontMatter.split(/\r?\n/);
  const field = new RegExp(`^${name}\\s*:\\s*`, "i");
  const start = lines.findIndex((l) => field.test(l));
  if (start < 0) return "";
  const value = lines[start].replace(field, "");

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
/** `tbl:`, `gen:` and a bare `->`: rolls that keep their symbol in the text. */
const OWN_ROLL_LINE = /^(tbl:|gen:|->)/;
/** "=== Campaign Log: Title ===": the analog campaign header (§5.1), not a session. */
const CAMPAIGN_LOG_LINE = /^===\s*Campaign Log:\s*(.+?)\s*===$/i;
/** "```" or "~~~", with or without a language. */
const CODE_FENCE = /^(```|~~~)/;
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
 *   entries), unless it starts with a symbol; a leading "\\" escapes a
 *   note or a continuation line that starts with one.
 * - Code fences (Lonelog's digital format wraps notation in them) are
 *   skipped.
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

  // Inside a `\---` … `---\` narrative block: its lines, as written.
  let excerpt: string[] | null = null;

  const push = (kind: JournalLineKind, text: string) => {
    const index = entries.length;
    entries.push({
      // Plain text has no real timestamp per line: sequential ones are
      // generated to keep the file's order when displaying it.
      id: `${startTimestamp}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      adventureId,
      timestamp: startTimestamp + index,
      kind,
      text,
    });
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (excerpt) {
      if (EXCERPT_CLOSE.test(line)) {
        push("note", ["\\---", ...excerpt, "---\\"].join("\n"));
        excerpt = null;
      } else {
        excerpt.push(rawLine.trimEnd());
      }
      continue;
    }
    if (EXCERPT_OPEN.test(line)) {
      excerpt = [];
      pendingBlankLines = 0;
      inHeader = false;
      continue;
    }
    if (!line) {
      pendingBlankLines += 1;
      continue;
    }

    // Lonelog wraps its notation in code fences in digital logs (§2.1):
    // the fences themselves aren't content.
    if (CODE_FENCE.test(line)) continue;

    const previous = entries[entries.length - 1];
    // An indented line continues the previous entry, unless it opens
    // one ("    d: …" under its "@", as Lonelog's examples indent them);
    // "\\" escapes a continuation that starts with a symbol.
    if (
      previous &&
      previous.kind !== "session" &&
      previous.kind !== "scene" &&
      CONTINUATION_LINE.test(rawLine) &&
      (line.startsWith("\\") || !STARTS_ENTRY.test(line))
    ) {
      const content = line.startsWith("\\") ? line.slice(1) : line;
      previous.text += "\n".repeat(pendingBlankLines + 1) + content;
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
      // The analog campaign header's first line names the adventure (parseTitleFromMarkdown).
      if (CAMPAIGN_LOG_LINE.test(line)) continue;
      inHeader = false;
    }

    const h2Match = line.match(H2_SESSION_LINE);
    const sceneMatch = line.match(SCENE_LINE);
    const legacySessionMatch = line.match(LEGACY_SESSION_LINE);
    let kind: JournalLineKind;
    let content: string;

    if (line.startsWith("\\")) {
      kind = "note";
      content = line.slice(1);
    } else if (h2Match) {
      kind = "session";
      content = h2Match[1];
    } else if (sceneMatch) {
      kind = "scene";
      content = sceneMatch[1];
    } else if (OWN_ROLL_LINE.test(line)) {
      kind = "roll";
      content = line;
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

    push(kind, content);
  }
  // A block left open at the end keeps what it had.
  if (excerpt?.length) push("note", ["\\---", ...excerpt, "---\\"].join("\n"));

  return entries;
}
