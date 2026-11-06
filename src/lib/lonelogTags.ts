/**
 * Lonelog's persistent-element tags for characters and places
 * (spec 1.5.0, §4.1): `[N:Jonah|friendly|wounded]` for an NPC,
 * `[PC:Alex|HP 8]` for the player character, `[L:Lighthouse|ruined]`
 * for a location, and `[#N:Jonah]` to refer back to one without
 * restating it. Threads, clocks and events aren't read yet.
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

export type CastKind = "pc" | "npc" | "place";

const PREFIX: Record<CastKind, string> = { pc: "PC", npc: "N", place: "L" };
const KIND_OF_PREFIX: Record<string, CastKind> = { PC: "pc", N: "npc", L: "place" };

export interface TagRef {
  kind: CastKind;
  name: string;
  /** `[#N:Name]`: a mention of something established earlier. */
  reference: boolean;
  /** What comes after the name, one item per "|" (may be updates). */
  details: string[];
}

export type TextPart = { text: string; tag?: undefined } | { text: string; tag: TagRef };

// "[", optional "#", the type, ":", the name (one line), then optional
// "|"-separated details, which may span lines (multi-line tags, §4.1.8).
const TAG = /\[(#?)(PC|N|L):[ \t]*([^\]|\n]*?)[ \t]*((?:\s*\|[^\]]*)?)\]/g;

/** Splits a text into prose and character/place tags, in order. */
export function splitTags(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(TAG)) {
    const name = match[3].trim();
    if (!name) continue;
    if (match.index > last) parts.push({ text: text.slice(last, match.index) });
    parts.push({
      text: match[0],
      tag: {
        kind: KIND_OF_PREFIX[match[2]],
        name,
        reference: match[1] === "#",
        details: match[4]
          .split("|")
          .map((d) => d.replace(/\s+/g, " ").trim())
          .filter(Boolean),
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
}

/**
 * The adventure's characters and places, derived from its entries (the
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
      const { kind, name, details } = part.tag;
      const key = castKey(kind, name);
      let member = byKey.get(key);
      if (!member) {
        member = { key, kind, name, tags: [], mentions: [] };
        byKey.set(key, member);
      }
      member.tags = applyTagUpdates(member.tags, details);
      if (member.mentions.at(-1) !== entry.id) member.mentions.push(entry.id);
    }
  }
  return [...byKey.values()];
}

/** The text with each tag as just its name, for short previews. */
export function tagsToPlainText(text: string): string {
  return splitTags(text)
    .map((part) => (part.tag ? part.tag.name : part.text))
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
const OPEN_TAG = /\[(#?)(?:(PC|N|L):)?([^[\]|\n]*)$/;

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
  return { start: match.index!, kind: match[2] ? KIND_OF_PREFIX[match[2]] : undefined, text };
}

/** The cast members that fit what's typed: names starting with it first. */
export function suggestCast(cast: CastMember[], query: TagQuery, limit = 6): CastMember[] {
  const q = normalizeForSearch(query.text.trim());
  const fits = cast.filter((m) => (!query.kind || m.kind === query.kind) && normalizeForSearch(m.name).includes(q));
  const starts = fits.filter((m) => normalizeForSearch(m.name).startsWith(q));
  return [...starts, ...fits.filter((m) => !starts.includes(m))].slice(0, limit);
}

/** An item of the "[" list: someone already in the cast, or a new one. */
export type TagOption = { member: CastMember } | { kind: CastKind; name: string };

/**
 * What "[" offers: the characters and places that fit what's typed
 * and, unless one is called exactly that, a new one with that name of
 * each kind (or only the kind already typed, "[L:…").
 */
export function tagOptions(cast: CastMember[], query: TagQuery): TagOption[] {
  const found = suggestCast(cast, query);
  const name = query.text.trim();
  if (!name) return found.map((member) => ({ member }));
  const exists = found.some((m) => normalizeForSearch(m.name) === normalizeForSearch(name));
  const kinds: CastKind[] = query.kind ? [query.kind] : ["npc", "place", "pc"];
  return [...found.map((member) => ({ member })), ...(exists ? [] : kinds.map((kind) => ({ kind, name })))];
}

/** The text a picked option writes: a reference to an existing one, or a new tag. */
export function tagOptionText(option: TagOption): string {
  return "member" in option
    ? formatTag(option.member.kind, option.member.name, [], true)
    : formatTag(option.kind, option.name);
}
