/**
 * Every file the app is handed is looked at here before anything of it
 * is kept: picked with a button, dropped on the window, opened with the
 * installed app (the manifest's `file_handlers`) or shared to it (its
 * `share_target`). It says what the file is (a Lonelog journal, tables
 * of one's own, a full backup) or why it won't be opened, so nothing
 * that could break the app or isn't the app's gets in:
 *
 * - only text files (.md, .markdown, .txt, .json), read as strict
 *   UTF-8 (or UTF-16 with its mark, as Windows' Notepad saves), with no
 *   control characters: an image, a PDF or a .docx is refused, renamed
 *   or not;
 * - a size limit, before reading it, and a smaller one for a journal or
 *   tables (what the app has been tried with, `npm run test:perf`);
 * - a backup only if it's Solo Compass's and from this version or an
 *   older one: one made by a newer version could hold what this one
 *   would drop on restoring it;
 * - and a journal or tables only if there's something in them.
 *
 * What's inside is checked again where it's read (each record of a
 * backup is normalized, a table's die has a limit, MAX_TABLE_SIDES; a
 * table's link must be a web page; long lines aren't read as rolls).
 */

import { BACKUP_SCHEMA_VERSION, isBackupPayload } from "./backup";
import { type CustomTableDraft } from "./customTables";
import { parseTablesFile } from "./customTableText";
import type { Dictionary } from "./i18n";
import { parseMarkdownToEntries, parseNotesFromMarkdown, parseTitleFromMarkdown } from "./lonelog";

/** No file is read past this: a backup of years of play is a few MB. */
export const MAX_FILE_BYTES = 64 * 1024 * 1024;
/** A journal or tables past this (tens of thousands of entries) isn't imported. */
export const MAX_TEXT_IMPORT_BYTES = 10 * 1024 * 1024;

export type FileKind = "journal" | "tables" | "backup";

export type FileProblem =
  /** Not a kind of file the app opens (by its extension or type). */
  | "unsupported"
  | "tooBig"
  /** Not text: binary, or in an encoding that isn't UTF-8. */
  | "notText"
  | "empty"
  /** A .json (or a backup) that can't be read. */
  | "damaged"
  /** A backup made by a newer version of the app. */
  | "newerBackup"
  /** JSON, but neither a backup of the app's nor tables. */
  | "notOurs"
  | "noJournal"
  | "noTables";

export type InspectedFile =
  | { kind: "journal"; name: string; text: string; title: string; entries: number }
  | { kind: "tables"; name: string; text: string; drafts: CustomTableDraft[] }
  | {
      kind: "backup";
      name: string;
      text: string;
      /** When it was made; null if it doesn't say. */
      exportedAt: number | null;
      adventures: number;
      entries: number;
      rolls: number;
      tables: number;
    }
  | { kind: "problem"; name: string; problem: FileProblem };

/** What's needed of a File (a test gives its own). */
export interface FileLike {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

const TEXT_EXTENSIONS = new Set(["json", "md", "markdown", "txt"]);

/**
 * Whether a file could be one the app opens, before reading it: by its
 * extension, or by its type when it has none (a file shared from
 * another app sometimes comes without one).
 */
export function isOpenableFile(name: string, type: string): boolean {
  const extension = /\.([^./\\]+)$/.exec(name)?.[1]?.toLowerCase();
  if (extension) return TEXT_EXTENSIONS.has(extension);
  return type === "" || type.startsWith("text/") || type === "application/json";
}

// Control characters no text file has (tab, line breaks, form feed and
// escape are allowed): their presence means it's binary.
// oxlint-disable-next-line no-control-regex -- matching them is the point
const CONTROL = /[\u0000-\u0008\u000e-\u001a\u001c-\u001f\u007f]/;

/** The file's text, or null if it isn't text. A leading byte order mark is dropped. */
export function decodeText(bytes: Uint8Array): string | null {
  let text: string;
  try {
    if (bytes[0] === 0xff && bytes[1] === 0xfe)
      text = new TextDecoder("utf-16le", { fatal: true }).decode(bytes.subarray(2));
    else if (bytes[0] === 0xfe && bytes[1] === 0xff)
      text = new TextDecoder("utf-16be", { fatal: true }).decode(bytes.subarray(2));
    else text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
  return CONTROL.test(text) ? null : text;
}

/**
 * Looks at a file and says what it is. `prefer` is what the button it
 * was picked with imports: a text that could be either a journal or a
 * table is read as that (a list of lines is both). Without it (dropped,
 * opened, shared), a text is a journal unless it has the table header
 * the app's own export writes ("| d20 | Result |").
 */
export async function inspectFile(
  t: Dictionary,
  file: FileLike,
  prefer?: FileKind,
): Promise<InspectedFile> {
  const name = file.name;
  if (!isOpenableFile(name, file.type)) return { kind: "problem", name, problem: "unsupported" };
  if (file.size > MAX_FILE_BYTES) return { kind: "problem", name, problem: "tooBig" };
  if (file.size === 0) return { kind: "problem", name, problem: "empty" };
  let bytes: ArrayBuffer;
  try {
    bytes = await file.arrayBuffer();
  } catch {
    return { kind: "problem", name, problem: "damaged" };
  }
  const text = decodeText(new Uint8Array(bytes));
  if (text === null) return { kind: "problem", name, problem: "notText" };
  return inspectText(t, name, text, prefer);
}

// The header row of a table as the app exports it: its die, then the results.
const TABLE_HEADER = /^\s*\|\s*d(?:66|\d+)\s*\|/im;

/** inspectFile once the text is read (a test gives it straight). */
export function inspectText(
  t: Dictionary,
  name: string,
  text: string,
  prefer?: FileKind,
): InspectedFile {
  const problem = (p: FileProblem): InspectedFile => ({ kind: "problem", name, problem: p });
  if (!text.trim()) return problem("empty");

  const json = readJson(text);
  if (json.ok) {
    const backup = inspectBackup(name, text, json.value);
    if (backup) return backup;
    if (text.length <= MAX_TEXT_IMPORT_BYTES) {
      const drafts = parseTablesFile(t, text, name);
      if (drafts.length) return { kind: "tables", name, text, drafts };
    }
    return problem(text.length > MAX_TEXT_IMPORT_BYTES ? "tooBig" : "notOurs");
  }
  // Text that only opens like JSON (a journal can start with a tag,
  // "[L:Tavern]"), unless it says it's JSON or was picked as a backup.
  if (json.broken && (/\.json$/i.test(name) || prefer === "backup")) return problem("damaged");
  if (text.length > MAX_TEXT_IMPORT_BYTES) return problem("tooBig");

  if (prefer === "tables" || (prefer !== "journal" && TABLE_HEADER.test(text))) {
    const drafts = parseTablesFile(t, text, name);
    if (drafts.length) return { kind: "tables", name, text, drafts };
    if (prefer === "tables") return problem("noTables");
  }
  return inspectJournal(name, text);
}

/** The same text read as a journal, whatever it looked like (the dialog's "it's a journal" choice). */
export function inspectJournal(name: string, text: string): InspectedFile {
  const entries = parseMarkdownToEntries(text, "", 0).length;
  if (entries === 0 && !parseNotesFromMarkdown(text).trim())
    return { kind: "problem", name, problem: "noJournal" };
  return { kind: "journal", name, text, title: journalTitle(name, text), entries };
}

/** The same text read as tables (the dialog's "it's a table" choice). */
export function inspectTables(t: Dictionary, name: string, text: string): InspectedFile {
  const drafts = parseTablesFile(t, text, name);
  return drafts.length
    ? { kind: "tables", name, text, drafts }
    : { kind: "problem", name, problem: "noTables" };
}

/** An imported journal's name: its campaign title, or the file's name. */
export function journalTitle(name: string, text: string): string {
  return parseTitleFromMarkdown(text) || name.replace(/\.(md|markdown|txt)$/i, "").trim() || name;
}

function readJson(text: string): { ok: true; value: unknown } | { ok: false; broken: boolean } {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return { ok: false, broken: false };
  try {
    return { ok: true, value: JSON.parse(trimmed) };
  } catch {
    return { ok: false, broken: true };
  }
}

/** A backup of the app's, or why it can't be restored; null if it isn't one. */
function inspectBackup(name: string, text: string, value: unknown): InspectedFile | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (v.app !== "solo-compass") return null;
  const version = v.schemaVersion;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    return { kind: "problem", name, problem: "damaged" };
  }
  if (version > BACKUP_SCHEMA_VERSION) return { kind: "problem", name, problem: "newerBackup" };
  if (!isBackupPayload(value)) return { kind: "problem", name, problem: "damaged" };
  const exportedAt = Date.parse(typeof value.exportedAt === "string" ? value.exportedAt : "");
  return {
    kind: "backup",
    name,
    text,
    exportedAt: Number.isFinite(exportedAt) ? exportedAt : null,
    adventures: value.journal.adventures.length,
    entries: value.journal.entries.length,
    rolls: value.history.length,
    tables: Array.isArray(value.customTables) ? value.customTables.length : 0,
  };
}

/** Why a file wasn't opened, in words. */
export function fileProblemText(t: Dictionary, problem: FileProblem): string {
  return t.files.problems[problem];
}
