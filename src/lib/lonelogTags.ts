/**
 * Lonelog's persistent-element tags (spec 1.5.0, §4.1–4.2):
 * `[N:Jonah|friendly|wounded]` for an NPC, `[PC:Alex|HP 8]` for the
 * player character, `[L:Lighthouse|ruined]` for a location,
 * `[Thread:The box|Open]` for a story thread, and progress: clocks
 * `[Clock:Ritual 5/12]` (also the older `[E:Plot 2/6]`), tracks
 * `[Track:Escape 3/8]` and timers `[Timer:Dawn 3]`. `[#N:Jonah]`
 * refers back to one without restating it.
 *
 * Tags stay in the entry's text as written, so the .md keeps them
 * as is in both directions. What this module adds is reading them:
 * splitting a text into prose and tags (to draw them as chips) and
 * deriving each element's current state from the whole journal (the
 * cast panel), following the spec's update styles:
 *
 *   [N:Jonah|captured]        a plain tag is added (the rest persist)
 *   [N:Jonah|+captured]       added
 *   [N:Jonah|-wounded]        removed
 *   [N:Jonah|friendly→hostile] (or "->") replaced
 *   [PC:Alex|HP 6]            a "name value" stat replaces the old value
 *   [PC:Alex|HP-2]            …or changes it by that much
 *   [N:Guard|status:alert]    a category replaces the same category
 */

import { normalizeForSearch } from "./text";
import type { JournalEntry } from "./lonelog";

export type CastKind = "pc" | "npc" | "place" | "thread" | "clock" | "track" | "timer";

/** Kinds whose name carries a number: "Ritual 5/12", "Dawn 3". */
export const PROGRESS_KINDS: ReadonlySet<CastKind> = new Set(["clock", "track", "timer"]);

const PREFIX: Record<CastKind, string> = {
  pc: "PC",
  npc: "N",
  place: "L",
  thread: "Thread",
  clock: "Clock",
  track: "Track",
  timer: "Timer",
};
const KIND_OF_PREFIX: Record<string, CastKind> = {
  PC: "pc",
  N: "npc",
  L: "place",
  Thread: "thread",
  Clock: "clock",
  Track: "track",
  Timer: "timer",
  // Events (§4.1.3) are the clocks of earlier versions of the spec.
  E: "clock",
};
const PREFIXES = "PC|N|L|Thread|Clock|Track|Timer|E";

/** A clock's, track's or timer's number: "5/12" sets it, "+1" changes it. */
export interface Progress {
  value: number;
  max?: number;
  /** "+1"/"-2": relative to the value it had. */
  relative?: boolean;
}

export interface TagRef {
  kind: CastKind;
  name: string;
  /** `[#N:Name]`: a mention of something established earlier. */
  reference: boolean;
  /** What comes after the name, one item per "|" (may be updates). */
  details: string[];
  progress?: Progress;
}

export type TextPart = { text: string; tag?: undefined } | { text: string; tag: TagRef };

// "[", optional "#", the type, ":", the name (one line), then optional
// "|"-separated details, which may span lines (multi-line tags, §4.1.8).
const TAG = new RegExp(`\\[(#?)(${PREFIXES}):[ \\t]*([^\\]|\\n]*?)[ \\t]*((?:\\s*\\|[^\\]]*)?)\\]`, "g");

// "Ritual 5/12", "Dawn 3", "Ritual +1".
const PROGRESS_NAME = /^(.*?\S)\s*(?:([+-])\s*(\d+)|(\d+)(?:\s*\/\s*(\d+))?)$/;

function readProgress(raw: string): { name: string; progress?: Progress } {
  const m = raw.match(PROGRESS_NAME);
  if (!m) return { name: raw };
  if (m[2]) return { name: m[1], progress: { value: Number(m[3]) * (m[2] === "-" ? -1 : 1), relative: true } };
  return { name: m[1], progress: { value: Number(m[4]), ...(m[5] ? { max: Number(m[5]) } : {}) } };
}

/** Splits a text into prose and character/place tags, in order. */
export function splitTags(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(TAG)) {
    const raw = match[3].trim();
    if (!raw) continue;
    const kind = KIND_OF_PREFIX[match[2]];
    const { name, progress } = PROGRESS_KINDS.has(kind) ? readProgress(raw) : { name: raw };
    if (match.index > last) parts.push({ text: text.slice(last, match.index) });
    parts.push({
      text: match[0],
      tag: {
        kind,
        name,
        reference: match[1] === "#",
        details: match[4]
          .split("|")
          .map((d) => d.replace(/\s+/g, " ").trim())
          .filter(Boolean),
        ...(progress ? { progress } : {}),
      },
    });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

/** "Jonah", "jonah" and "Jónah" are the same element. */
export function castKey(kind: CastKind, name: string): string {
  return `${kind}:${normalizeForSearch(name.trim())}`;
}

/** A clock, track or timer with its number: `[Clock:Ritual 6/12]`, `[Timer:Dawn 2]`. */
export function formatProgressTag(kind: CastKind, name: string, value: number, max?: number): string {
  return formatTag(kind, `${name.replace(/[[\]|]/g, " ").trim()} ${value}${max !== undefined ? `/${max}` : ""}`);
}

/** Writes a tag the way the spec does: `[N:Name|a|b]` or `[#N:Name]`. */
export function formatTag(kind: CastKind, name: string, details: string[] = [], reference = false): string {
  const clean = (s: string) => s.replace(/[[\]|]/g, " ").replace(/\s+/g, " ").trim();
  const rest = details.map(clean).filter(Boolean);
  return `[${reference ? "#" : ""}${PREFIX[kind]}:${clean(name)}${rest.map((d) => `|${d}`).join("")}]`;
}

// "HP 8", "HP-2", "Stress +1", "Clock 3/6": a named value.
const STAT = /^(\p{L}[\p{L}\s'.]*?)\s*([+-]?)\s*(\d+)(\/\d+)?$/u;
// "status: wounded, alert": a category with its values.
const CATEGORY = /^([^:]+?)\s*:\s*(.+)$/;
const REPLACE = /^(.+?)\s*(?:→|->)\s*(.+)$/;

const same = (a: string, b: string) => normalizeForSearch(a) === normalizeForSearch(b);

function statKey(tag: string): string | null {
  const m = tag.match(STAT);
  return m ? normalizeForSearch(m[1]) : null;
}

function categoryKey(tag: string): string | null {
  const m = tag.match(CATEGORY);
  return m ? normalizeForSearch(m[1]) : null;
}

/** Applies a tag's details to an element's current tags (see the header). */
export function applyTagUpdates(current: string[], updates: string[]): string[] {
  let tags = [...current];
  for (const update of updates) {
    if (update.startsWith("-") && update.length > 1 && !STAT.test(update)) {
      const target = update.slice(1).trim();
      tags = tags.filter((t) => !same(t, target));
      continue;
    }
    const value = update.startsWith("+") && !STAT.test(update) ? update.slice(1).trim() : update;
    const replace = value.match(REPLACE);
    if (replace) {
      const index = tags.findIndex((t) => same(t, replace[1]));
      if (index >= 0) tags[index] = replace[2];
      else tags.push(replace[2]);
      continue;
    }
    const stat = value.match(STAT);
    if (stat) {
      const key = normalizeForSearch(stat[1]);
      const index = tags.findIndex((t) => statKey(t) === key);
      let next = value;
      if (stat[2] && index >= 0) {
        // A change relative to the value it had: "HP 8" + "HP-2" = "HP 6".
        const previous = tags[index].match(STAT)!;
        const delta = Number(stat[3]) * (stat[2] === "-" ? -1 : 1);
        next = `${previous[1]} ${Number(previous[3]) + delta}${previous[4] ?? ""}`;
      } else if (stat[2]) {
        next = `${stat[1]} ${stat[2] === "-" ? "-" : ""}${stat[3]}${stat[4] ?? ""}`;
      }
      if (index >= 0) tags[index] = next;
      else tags.push(next);
      continue;
    }
    const category = categoryKey(value);
    if (category) {
      const index = tags.findIndex((t) => categoryKey(t) === category);
      if (index >= 0) tags[index] = value;
      else tags.push(value);
      continue;
    }
    if (!tags.some((t) => same(t, value))) tags.push(value);
  }
  return tags;
}

export interface CastMember {
  key: string;
  kind: CastKind;
  /** As first written. */
  name: string;
  /** Current state, after every update in journal order. */
  tags: string[];
  /** Ids of the entries that mention it, in journal order. */
  mentions: string[];
  /** Clocks, tracks and timers: where they stand now. */
  progress?: { value: number; max?: number };
  /** When it was last mentioned (that entry's timestamp). */
  lastSeen: number;
}

export type ThreadStatus = "open" | "closed" | "abandoned";

// The spec's thread states (§4.1.4), in English and Spanish.
const THREAD_STATES: Record<string, ThreadStatus> = {
  open: "open",
  abierto: "open",
  abierta: "open",
  closed: "closed",
  cerrado: "closed",
  cerrada: "closed",
  resolved: "closed",
  resuelto: "closed",
  resuelta: "closed",
  abandoned: "abandoned",
  abandonado: "abandoned",
  abandonada: "abandoned",
};

const stateOf = (tag: string) => THREAD_STATES[normalizeForSearch(tag.replace(/^[+]/, "").trim())];

/** A thread's state: its last state tag (open if none). */
export function threadStatus(member: CastMember): ThreadStatus {
  for (const tag of [...member.tags].reverse()) {
    const state = stateOf(tag);
    if (state) return state;
  }
  return "open";
}

/**
 * The adventure's characters, places, threads and progress, derived from its entries (the
 * journal is the only source of truth: nothing is stored apart). Roll
 * entries are skipped: a `[...]` inside `d:` is roll context (§4.1.9),
 * not a persistent element. In order of first appearance.
 */
export function buildCast(entries: JournalEntry[]): CastMember[] {
  const byKey = new Map<string, CastMember>();
  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
  for (const entry of sorted) {
    if (entry.kind === "roll" || entry.kind === "session") continue;
    for (const part of splitTags(entry.text)) {
      if (!part.tag) continue;
      const { kind, name, details, progress } = part.tag;
      const key = castKey(kind, name);
      let member = byKey.get(key);
      if (!member) {
        member = { key, kind, name, tags: [], mentions: [], lastSeen: entry.timestamp };
        byKey.set(key, member);
      }
      // A thread has one state at a time: a new one replaces the old.
      const current =
        kind === "thread" && details.some(stateOf) ? member.tags.filter((t) => !stateOf(t)) : member.tags;
      member.tags = applyTagUpdates(current, details);
      if (progress) {
        const before = member.progress;
        member.progress = progress.relative
          ? { value: (before?.value ?? 0) + progress.value, ...(before?.max !== undefined ? { max: before.max } : {}) }
          : { value: progress.value, ...((progress.max ?? before?.max) !== undefined ? { max: progress.max ?? before!.max } : {}) };
      }
      member.lastSeen = entry.timestamp;
      if (member.mentions.at(-1) !== entry.id) member.mentions.push(entry.id);
    }
  }
  return [...byKey.values()];
}

/** "5/12", "3", "+1". */
export function progressText(progress: Progress | { value: number; max?: number }): string {
  if ("relative" in progress && progress.relative) return `${progress.value >= 0 ? "+" : ""}${progress.value}`;
  return `${progress.value}${progress.max !== undefined ? `/${progress.max}` : ""}`;
}

/** The text with each tag as just its name, for short previews. */
export function tagsToPlainText(text: string): string {
  return splitTags(text)
    .map((part) => (part.tag ? part.tag.name + (part.tag.progress ? ` ${progressText(part.tag.progress)}` : "") : part.text))
    .join("");
}

export interface TagQuery {
  /** Where the "[" is, in the text. */
  start: number;
  /** If a type was already typed ("[N:Od"). */
  kind?: CastKind;
  /** What's typed after it, to filter by. */
  text: string;
}

// An unclosed "[" right before the caret, with an optional type.
// Any case while typing ("[clock:"): picking an option writes the
// notation's own ("[Clock:…]").
const OPEN_TAG = new RegExp(`\\[(#?)(?:(${PREFIXES}):)?([^[\\]|\\n]*)$`, "i");
const KIND_OF_TYPED_PREFIX = new Map(Object.entries(KIND_OF_PREFIX).map(([p, kind]) => [p.toLowerCase(), kind]));

/**
 * The tag being typed just before the caret, for the composer's
 * suggestions: "[", "[Od", "[N:Od", "[#L:mo". Null when it isn't one:
 * "[ ]" (a checkbox), another kind of tag ("[Thread:…") or text that
 * has gone on too long to be a name.
 */
export function findTagQuery(beforeCaret: string): TagQuery | null {
  const match = beforeCaret.match(OPEN_TAG);
  if (!match) return null;
  const text = match[3];
  if ((!match[2] && text.includes(":")) || /^\s/.test(text) || text.length > 40) return null;
  return { start: match.index!, kind: match[2] ? KIND_OF_TYPED_PREFIX.get(match[2].toLowerCase()) : undefined, text };
}

/** The cast members that fit what's typed, all of them, in alphabetical order. */
export function suggestCast(cast: CastMember[], query: TagQuery): CastMember[] {
  const q = normalizeForSearch(query.text.trim());
  return cast
    .filter((m) => (!query.kind || m.kind === query.kind) && normalizeForSearch(m.name).includes(q))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

/** An item of the "[" list: someone already in the cast (`recent` if
 * among the last named, listed first), or a new one. */
export type TagOption = { member: CastMember; recent?: boolean } | { kind: CastKind; name: string };

/** How many of the last named go first in the "[" list. */
const RECENT = 3;
/** Every kind a new tag can be, in the order "[" offers them. */
const NEW_KINDS: CastKind[] = ["npc", "place", "pc", "thread", "clock", "track", "timer"];

/**
 * What "[" offers: the cast members that fit what's typed, in
 * alphabetical order — with nothing typed yet, the last few named go
 * first (when there are enough for it to help) — and, unless one is
 * called exactly that, a new one with that name of every kind (or only
 * the kind already typed, "[L:…").
 */
export function tagOptions(cast: CastMember[], query: TagQuery): TagOption[] {
  const found = suggestCast(cast, query);
  const name = query.text.trim();
  if (!name) {
    if (found.length <= RECENT + 2) return found.map((member) => ({ member }));
    const recent = [...found].sort((a, b) => b.lastSeen - a.lastSeen).slice(0, RECENT);
    return [
      ...recent.map((member) => ({ member, recent: true })),
      ...found.filter((m) => !recent.includes(m)).map((member) => ({ member })),
    ];
  }
  const exists = found.some((m) => normalizeForSearch(m.name) === normalizeForSearch(name));
  const kinds = query.kind ? [query.kind] : NEW_KINDS;
  return [...found.map((member) => ({ member })), ...(exists ? [] : kinds.map((kind) => ({ kind, name })))];
}

/** Size a new clock, track or timer starts with when none is typed (as in the notebook). */
const NEW_PROGRESS_SIZE = 6;

/**
 * The text a picked option writes: a reference to an existing one, or a
 * new tag (a new clock or track starts empty, a timer full, unless a
 * number was typed).
 */
export function tagOptionText(option: TagOption): string {
  if ("member" in option) return formatTag(option.member.kind, option.member.name, [], true);
  const { kind, name } = option;
  if (!PROGRESS_KINDS.has(kind) || readProgress(name).progress) return formatTag(kind, name);
  return kind === "timer"
    ? formatProgressTag(kind, name, NEW_PROGRESS_SIZE)
    : formatProgressTag(kind, name, 0, NEW_PROGRESS_SIZE);
}
