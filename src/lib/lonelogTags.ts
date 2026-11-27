/**
 * Lonelog's persistent-element tags (spec 1.7.0, §4.1–4.2):
 * `[N:Jonah|friendly|wounded]` for an NPC, `[PC:Alex|HP 8]` for the
 * player character, `[L:Lighthouse|ruined]` for a location,
 * `[E:Bridge Collapse]` for something notable that happened,
 * `[Thread:The box|Open]` for a story thread, and progress: clocks
 * `[Clock:Ritual 5/12]`, tracks `[Track:Escape 3/8]` and timers
 * `[Timer:Dawn 3]`. `[#N:Jonah]` refers back to one and changes
 * nothing. From the official add-ons: rooms
 * `[R:4|status:cleared|library|exits:N R2]` (dungeon crawling), foes
 * `[F:Thug A|HP 6|pos:Close]` (combat), items `[Inv:Torch|×3]` and purses
 * `[Wealth:Kael|Gold 45|Silver 12]` (resource tracking) and decks
 * `[Deck:Main|×38|out:Qs]` (cards).
 *
 * Tags stay in the entry's text as written, so the .md keeps them
 * as is in both directions. What this module adds is reading them:
 * splitting a text into prose and tags (to draw them as chips) and
 * deriving each element's current state from the whole journal (the
 * cast panel). Tags accumulate:
 *
 *   [N:Jonah|captured]        a plain value is added (also "+captured")
 *   [N:Jonah|-wounded]        removed
 *   [N:Jonah|friendly>hostile] (also "→") replaced
 *   [N:Guard|status:alert]    a category replaces what it held
 *   [PC:Jonah|trait:+reckless] one entry of it, added ("-": removed)
 *   [PC:Alex|HP 6]            a number is set
 *   [PC:Alex|HP-2]            …or changed by that much
 *   [PC:Kael|Supply d8>d6]    the value after a label is replaced
 *   [N:Bandits|×6]            a count is set; ×-1 and ×+2 change it
 *   [Clock:Alert+1]           a counter advances from its name
 *
 * A multi-line tag is a full status block: it starts its element over.
 * The forms 1.7 retired are still read (its Appendix E.3): `[E:Plot 2/6]`
 * is a clock, "->" replaces, a count or an amount in the name
 * ("Goblins×3", "Torch-1", "Gold 45"), a bare range band, and a room's
 * fields by their order.
 */

import { normalizeForSearch } from "./text";
import type { JournalEntry } from "./lonelog";

export type CastKind =
  | "pc"
  | "npc"
  | "place"
  | "thread"
  | "clock"
  | "track"
  | "timer"
  | "event"
  | "room"
  | "foe"
  | "item"
  | "wealth"
  | "deck";

/** Kinds whose name carries a number: "Ritual 5/12", "Dawn 3". */
export const PROGRESS_KINDS: ReadonlySet<CastKind> = new Set(["clock", "track", "timer"]);

/** Kinds counted by a quantity, changed one by one ("×-1", "Gold+15"). */
export const QUANTITY_KINDS: ReadonlySet<CastKind> = new Set(["item", "wealth", "deck"]);

const PREFIX: Record<CastKind, string> = {
  pc: "PC",
  npc: "N",
  place: "L",
  thread: "Thread",
  clock: "Clock",
  track: "Track",
  timer: "Timer",
  event: "E",
  room: "R",
  foe: "F",
  item: "Inv",
  wealth: "Wealth",
  deck: "Deck",
};
const KIND_OF_PREFIX: Record<string, CastKind> = {
  PC: "pc",
  N: "npc",
  L: "place",
  Thread: "thread",
  Clock: "clock",
  Track: "track",
  Timer: "timer",
  E: "event",
  R: "room",
  F: "foe",
  Inv: "item",
  Wealth: "wealth",
  Deck: "deck",
};
const PREFIXES = "PC|N|L|Thread|Clock|Track|Timer|E|R|F|Inv|Wealth|Deck";

/** A tag's kind; an `[E:…]` with a counter is a clock, as it was written before 1.7. */
function kindOf(prefix: string, name: string): CastKind {
  return prefix === "E" && /\d\s*\/\s*\d+$|\S\s*[+-]\d+$/.test(name)
    ? "clock"
    : KIND_OF_PREFIX[prefix];
}

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
  /** A purse, `[Wealth:Kael|Gold 45]`: the name is whose it is. */
  owned?: true;
  /** Written across lines: a full status block, which starts over. */
  block?: true;
}

export type TextPart = { text: string; tag?: undefined } | { text: string; tag: TagRef };

// "[", optional "#", the type, ":", the name (one line), then optional
// "|"-separated details, which may span lines (multi-line tags, §4.1.8;
// on paper their first line needs no "|").
const TAG = new RegExp(
  `\\[(#?)(${PREFIXES}):[ \\t]*([^\\]|\\n]*?)[ \\t]*((?:\\s*\\|[^\\]]*|\\n[^\\]]*)?)\\]`,
  "g",
);
const OPEN_BLOCK = new RegExp(`\\[(?:${PREFIXES}):[^\\]]*$`);

/** Whether a text ends inside a tag (a multi-line one whose "]" is on its own line). */
export function endsInsideTag(text: string): boolean {
  return OPEN_BLOCK.test(text);
}

// "Ritual 5/12", "Dawn 3", "Ritual +1".
const PROGRESS_NAME = /^(.*?\S)\s*(?:([+-])\s*(\d+)|(\d+)(?:\s*\/\s*(\d+))?)$/;

function readProgress(raw: string): { name: string; progress?: Progress } {
  const m = raw.match(PROGRESS_NAME);
  if (!m) return { name: raw };
  if (m[2])
    return {
      name: m[1],
      progress: { value: Number(m[3]) * (m[2] === "-" ? -1 : 1), relative: true },
    };
  return { name: m[1], progress: { value: Number(m[4]), ...(m[5] ? { max: Number(m[5]) } : {}) } };
}

/** "45>52" (or "→", "->"): what it is now, 52. */
const toLatest = (raw: string) => raw.replace(/\d+\s*(?:→|->|>)\s*(\d+)\s*$/, "$1");

// "×3" sets a count, "×-1" changes it, "×3>2" sets it and says what it was.
const COUNT = /^[×x]\s*(?:\d+\s*(?:→|->|>)\s*[×x]?\s*)?([+-]?)\s*(\d+)$/;

function readCount(detail: string): Progress | null {
  const m = detail.match(COUNT);
  if (!m) return null;
  return m[1] ? { value: Number(`${m[1]}${m[2]}`), relative: true } : { value: Number(m[2]) };
}

// "Torch-1", "Arrow +2": an item's change, after its name.
// ("Slot 6-10" is a name.)
const RELATIVE_NAME = /^(.*?[^\s\d])\s*([+-])\s*(\d+)$/;
// "Goblins×4": a count in the name, as it was written before 1.7 (a foe's with "x" too).
const GROUP_NAME = /^(.*?\S)\s*[×x]\s*(\d+)$/;

/** The name and the number in it, each kind as the spec writes it. */
function readName(
  kind: CastKind,
  raw: string,
): { name: string; progress?: Progress; group?: string } {
  if (PROGRESS_KINDS.has(kind) || kind === "wealth") return readProgress(toLatest(raw));
  if (kind === "item") {
    const m = raw.match(RELATIVE_NAME);
    return m
      ? { name: m[1], progress: { value: Number(m[3]) * (m[2] === "-" ? -1 : 1), relative: true } }
      : { name: raw };
  }
  if (kind === "foe" || (kind === "npc" && raw.includes("×"))) {
    const m = raw.match(GROUP_NAME);
    return m ? { name: m[1], group: `×${m[2]}` } : { name: raw };
  }
  return { name: raw };
}

/** Splits a text into prose and character/place tags, in order. */
export function splitTags(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(TAG)) {
    const raw = match[3].trim();
    if (!raw) continue;
    const kind = kindOf(match[2], raw);
    const { name, progress, group } = readName(kind, raw);
    const details = [
      ...(group ? [group] : []),
      ...match[4]
        // On paper each line is a value; after a "|", a line break is just a wrap.
        .split(/^\s*\n\s*[^|\s]/.test(match[4]) ? /[|\n]/ : "|")
        .map((d) => d.replace(/\s+/g, " ").trim())
        .filter(Boolean),
    ];
    const owned =
      kind === "wealth" && !progress && details.some((d) => readProgress(toLatest(d)).progress);
    if (match.index > last) parts.push({ text: text.slice(last, match.index) });
    parts.push({
      text: match[0],
      tag: {
        kind,
        name,
        reference: match[1] === "#",
        details,
        ...(progress ? { progress } : {}),
        ...(owned ? { owned } : {}),
        ...(/^\s*\n/.test(match[4]) ? { block: true as const } : {}),
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

/** A currency in someone's purse: two people's gold are two elements. */
export function purseKey(owner: string, currency: string): string {
  return castKey("wealth", `${owner.trim()}|${currency.trim()}`);
}

/** The element a tag names (a purse's, its first currency). */
export function tagKey(tag: TagRef): string {
  return tag.owned
    ? purseKey(tag.name, readProgress(toLatest(tag.details[0])).name)
    : castKey(tag.kind, tag.name);
}

/** The element with this key, also by what it was called before its purse had an owner, or by the owner alone. */
export function findMember(cast: readonly CastMember[], key: string): CastMember | undefined {
  return (
    cast.find((m) => m.key === key || m.aliases?.includes(key)) ??
    cast.find((m) => m.owner !== undefined && castKey("wealth", m.owner) === key)
  );
}

// A step from the notebook's −/+, alone in its entry.
const PROGRESS_STEP = /^\[(Clock|Track|Timer|E):\s*(.+?)\s+(\d+)(?:\/(\d+))?\]$/;
// "[Inv:Torch|×-1]", "[Wealth:Kael|Gold+1]" (and without an owner, "[Wealth:Gold+1]").
const QUANTITY_STEP = /^\[(Inv|Wealth|Deck):\s*(.+?)\s*([+-])\s*(\d+)\]$/;

/**
 * Two −/+ in a row on the same clock or quantity become one entry
 * instead of three "+1" lines: what replaces the previous entry's text
 * (a clock's latest value; the two changes of a quantity added up), ""
 * if they cancel out, or null when they aren't steps of the same thing.
 */
export function combineSteps(previous: string, next: string): string | null {
  const same = (a: string, b: string) => normalizeForSearch(a) === normalizeForSearch(b);
  const p = previous.trim().match(PROGRESS_STEP);
  const n = next.trim().match(PROGRESS_STEP);
  if (p && n) return p[1] === n[1] && same(p[2], n[2]) ? next.trim() : null;
  const pq = previous.trim().match(QUANTITY_STEP);
  const nq = next.trim().match(QUANTITY_STEP);
  if (!pq || !nq || pq[1] !== nq[1] || !same(pq[2], nq[2])) return null;
  const total = Number(`${pq[3]}${pq[4]}`) + Number(`${nq[3]}${nq[4]}`);
  if (total === 0) return "";
  return `[${pq[1]}:${pq[2]}${total > 0 ? "+" : "-"}${Math.abs(total)}]`;
}

/** A clock, track or timer with its number: `[Clock:Ritual 6/12]`, `[Timer:Dawn 2]`. */
export function formatProgressTag(
  kind: CastKind,
  name: string,
  value: number,
  max?: number,
): string {
  return formatTag(
    kind,
    `${name.replace(/[[\]|]/g, " ").trim()} ${value}${max !== undefined ? `/${max}` : ""}`,
  );
}

/** Writes a tag the way the spec does: `[N:Name|a|b]` or `[#N:Name]`. */
export function formatTag(
  kind: CastKind,
  name: string,
  details: string[] = [],
  reference = false,
): string {
  const clean = (s: string) =>
    s
      .replace(/[[\]|]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const rest = details.map(clean).filter(Boolean);
  return `[${reference ? "#" : ""}${PREFIX[kind]}:${clean(name)}${rest.map((d) => `|${d}`).join("")}]`;
}

// "HP 8", "HP-2", "ATK +3", "Clock 3/6": a labelled number.
const STAT = /^(\p{L}[\p{L}\s'.]*?)(\s*)([+-]?)\s*(\d+)(\/\d+)?$/u;
// "status: wounded, alert": a category with its values.
// The name is taken whole up to the colon (the lookahead and its
// backreference can't give anything back) and trimmed afterwards: a lazy
// name followed by "\s*" took quadratic time on a long run of spaces.
const CATEGORY = /^(?=([^:]+))\1:\s*(.+)$/;
const REPLACE = /^(.+?)\s*(?:→|->|>)\s*(.+)$/;
// "Torchlight depleted": a labelled value that ran out.
const RAN_OUT = /^(.+\S)\s+(?:depleted|agotad[oa]s?|gastad[oa]s?)$/i;

const same = (a: string, b: string) => normalizeForSearch(a) === normalizeForSearch(b);
const listOf = (values: string) =>
  values
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

function statKey(tag: string): string | null {
  const m = tag.match(STAT);
  return m ? normalizeForSearch(m[1]) : null;
}

// The add-ons' own categories, in either language: the same one.
const KNOWN_CATEGORIES: Record<string, keyof CategoryWords> = {
  status: "status",
  estado: "status",
  exits: "exits",
  salidas: "exits",
  pos: "pos",
  posicion: "pos",
  owner: "owner",
  dueno: "owner",
  duena: "owner",
  where: "where",
  lugar: "where",
  out: "out",
  fuera: "out",
};

/** A detail as it's shown: an add-on's category, in the player's language ("owner:Nela" → "dueño:Nela"). */
export function showDetail(detail: string, words: CategoryWords): string {
  const category = readCategory(detail);
  return category && Object.hasOwn(words, category.key)
    ? `${words[category.key as keyof CategoryWords]}:${category.values}`
    : detail;
}

/** A category's name and what it holds; null for any other value. */
function readCategory(tag: string): { key: string; label: string; values: string } | null {
  const m = tag.match(CATEGORY);
  const label = m?.[1].trimEnd();
  if (!m || !label) return null;
  const word = normalizeForSearch(label);
  const key = Object.hasOwn(KNOWN_CATEGORIES, word) ? KNOWN_CATEGORIES[word] : word;
  return { key, label, values: m[2] };
}

/**
 * A category's list after an update: its entries one by one if they're
 * changes ("+looted", "-cleared", "alert>calm"), or the new list.
 */
function updateList(current: string[], update: string): string[] {
  const entries = listOf(update);
  // A number ("+2") is a value, not an addition.
  const isChange = (e: string) => /^[+-]\s*\S/.test(e) && !/^[+-]\s*\d+$/.test(e);
  if (!entries.some((e) => isChange(e) || REPLACE.test(e))) return entries;
  let list = current.filter((x) => !/^(none|ningun[oa]?|nada)$/i.test(x));
  const add = (x: string) => {
    if (!list.some((y) => same(x, y))) list.push(x);
  };
  for (const entry of entries) {
    const swap = isChange(entry) ? null : entry.match(REPLACE);
    if (swap) {
      const index = list.findIndex((x) => same(x, swap[1]));
      if (index >= 0) list.splice(index, 1, swap[2]);
      else if (list.length <= 1) list = [swap[2]];
      else add(swap[2]);
    } else if (isChange(entry) && entry.startsWith("-"))
      list = list.filter((x) => !same(x, entry.slice(1).trim()));
    else add(isChange(entry) ? entry.slice(1).trim() : entry);
  }
  return list;
}

/** Applies a tag's details to an element's current tags (see the header). */
export function applyTagUpdates(current: string[], updates: string[]): string[] {
  let tags = [...current];
  for (const update of updates) {
    const count = readCount(update);
    if (count) {
      const index = tags.findIndex((t) => COUNT.test(t));
      const before = index >= 0 ? (readCount(tags[index])?.value ?? 0) : 0;
      const next = `×${Math.max(0, count.relative ? before + count.value : count.value)}`;
      if (index >= 0) tags[index] = next;
      else tags.push(next);
      continue;
    }
    if (update.startsWith("-") && update.length > 1) {
      const target = update.slice(1).trim();
      const kept = tags.filter((t) => !same(t, target));
      const category = kept.length === tags.length ? readCategory(target) : null;
      tags = kept;
      if (!category) continue;
      // "-status:armed": out of the category's list.
      tags = tags.flatMap((t) => {
        const c = readCategory(t);
        if (c?.key !== category.key) return [t];
        const left = listOf(c.values).filter((x) => !same(x, category.values));
        return left.length ? [`${c.label}:${left.join(", ")}`] : [];
      });
      continue;
    }
    const value = update.startsWith("+") ? update.slice(1).trim() : update;
    const category = readCategory(value);
    if (category) {
      const index = tags.findIndex((t) => readCategory(t)?.key === category.key);
      const before = index >= 0 ? readCategory(tags[index])! : null;
      const list = updateList(before ? listOf(before.values) : [], category.values);
      // A whole new list is kept as written.
      const changed = !same(list.join(","), listOf(category.values).join(","));
      const next = changed ? `${before?.label ?? category.label}:${list.join(", ")}` : value;
      if (list.length === 0) {
        if (index >= 0) tags.splice(index, 1);
      } else if (index >= 0) tags[index] = next;
      else tags.push(next);
      continue;
    }
    const replace = value.match(REPLACE);
    if (replace) {
      // "Supply d8>d6": the label stays and the value after it changes,
      // whatever it was before.
      const labelled = replace[1].match(/^(.*\s)(\S+)$/);
      const label = labelled && !/\s/.test(replace[2].trim()) ? labelled[1] : null;
      const next = label ? `${label}${replace[2]}` : replace[2];
      const index = tags.findIndex(
        (t) => same(t, replace[1]) || (!!label && same(t.slice(0, label.length), label)),
      );
      // Never twice: "wary>ally" when it's already an ally.
      const existing = tags.findIndex((t) => same(t, next));
      if (index >= 0) {
        tags[index] = next;
        if (existing >= 0 && existing !== index) tags.splice(existing, 1);
      } else if (existing < 0) tags.push(next);
      continue;
    }
    const stat = value.match(STAT);
    if (stat) {
      const [, label, space, sign, digits, max = ""] = stat;
      const key = normalizeForSearch(label);
      const index = tags.findIndex((t) => statKey(t) === key);
      const previous = index >= 0 ? tags[index].match(STAT)! : null;
      let next = value;
      // "HP-2" changes it; "ATK +3" (with a space) is a bonus, unless it
      // changes a number without a sign.
      const bonus = !!sign && !!space && (!previous || !!previous[3]);
      if (sign && !bonus) {
        const delta = Number(`${sign}${digits}`);
        next = previous
          ? `${previous[1]} ${Number(`${previous[3]}${previous[4]}`) + delta}${previous[5] ?? ""}`
          : `${label} ${sign === "-" ? "-" : ""}${digits}${max}`;
      }
      if (index >= 0) tags[index] = next;
      else tags.push(next);
      continue;
    }
    const out = value.match(RAN_OUT);
    if (out) {
      const index = tags.findIndex(
        (t) => /\s(?:d?\d\S*|\d+)$/.test(t) && same(t.replace(/\s+\S+$/, ""), out[1]),
      );
      if (index >= 0) {
        tags[index] = value;
        continue;
      }
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
  /** Money: whose purse it's in, if it says. */
  owner?: string;
  /** Other keys it goes by (findMember). */
  aliases?: string[];
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

/** "Open>Closed" is Closed; null when it isn't a change of state. */
function newState(detail: string): string | null {
  const m = detail.match(REPLACE);
  return m && (stateOf(m[1]) || stateOf(m[2])) ? m[2].trim() : null;
}

/** A thread's change of state, as the spec writes it: "Open>Closed". */
export function threadChange(member: CastMember, to: string): string {
  const from = [...member.tags].reverse().find(stateOf);
  return from ? `${from}>${to}` : to;
}

/** A thread's state: its last state tag (open if none). */
export function threadStatus(member: CastMember): ThreadStatus {
  for (const tag of [...member.tags].reverse()) {
    const state = stateOf(tag);
    if (state) return state;
  }
  return "open";
}

// A foe's range band (combat add-on §3.3), in English and Spanish: one at a time.
const RANGES = new Set([
  "close",
  "near",
  "medium",
  "far",
  "engaged",
  "cerca",
  "media",
  "medio",
  "lejos",
  "trabado",
  "cuerpo a cuerpo",
]);
const isRange = (tag: string) => RANGES.has(normalizeForSearch(tag.trim()));
const isPosition = (tag: string) => /^(pos|zone|zona)\s*:/i.test(tag);
// "depleted", "agotado": an item or supply that's gone.
const DEPLETED = /^(depleted|agotad[oa]s?|gastad[oa]s?)$/i;

const STATUS = /^status$/;
const EXITS = /^exits$/;
// As written before 1.7: "exits N:R2, E:R5(secret)", merged by direction.
const OLD_EXITS = /^(exits|salidas)\s+(.+)$/i;
// The dungeon crawling add-on's statuses, in English and Spanish.
const ROOM_STATUS =
  /^(unexplored|active|explored|cleared|looted|locked|trapped|safe|collapsed|sin explorar|inexplorada|activa|explorada|despejada|saqueada|cerrada|con trampas?|segura|derrumbada)$/i;
const isRoomStatus = (detail: string) => listOf(detail).every((x) => ROOM_STATUS.test(x));

/** A room's state, kept by field (dungeon crawling add-on §1–2). */
interface RoomState {
  status: string[];
  description?: string;
  /** Its other categories and numbers ("level:2"). */
  rest: string[];
  /** By direction (or by room, when there's none): "N" → "N R2". */
  exits: Map<string, string>;
  /** The word written before them, "exits" or "salidas", shown as is. */
  exitsWord?: string;
  /** Written with categories (1.7): a plain value is its description, whatever its place. */
  labelled?: boolean;
}

const newRoom = (): RoomState => ({ status: [], rest: [], exits: new Map() });

function exitKey(exit: string): string {
  // "N:R5(secret)", "N R2", "E R7 secret", "R4".
  const direction = exit.match(/^([^\s:]+)(?::|\s+(?=R?\d))/);
  return normalizeForSearch(
    direction ? direction[1] : exit.replace(/\s*\(.*\)$/, "").split(/\s/)[0],
  );
}

function applyRoomUpdates(room: RoomState, details: string[]): void {
  const categories = details.map(readCategory);
  if (categories.some((c) => c && !OLD_EXITS.test(c.label))) room.labelled = true;
  let plain = 0;
  details.forEach((detail, i) => {
    const oldExits = detail.match(OLD_EXITS);
    const category = oldExits ? null : categories[i];
    if (oldExits) {
      room.exitsWord = oldExits[1];
      for (const exit of listOf(oldExits[2])) room.exits.set(exitKey(exit), exit);
    } else if (category && STATUS.test(category.key)) {
      room.status = updateList(room.status, category.values);
    } else if (category && EXITS.test(category.key)) {
      room.exitsWord = category.label;
      const entries = listOf(category.values);
      if (!entries.some((e) => /^[+-]/.test(e))) room.exits = new Map();
      for (const entry of entries) {
        const exit = entry.replace(/^[+-]\s*/, "");
        if (entry.startsWith("-")) room.exits.delete(exitKey(exit));
        else room.exits.set(exitKey(exit), exit);
      }
    } else if (category || STAT.test(detail)) {
      room.rest = applyTagUpdates(room.rest, [detail]);
    } else if (/^[+-]\S/.test(detail)) {
      const value = detail.slice(1).trim();
      if (detail.startsWith("-") && room.description && same(room.description, value))
        room.description = undefined;
      else if (room.labelled && detail.startsWith("+") && !isRoomStatus(value))
        room.description = value;
      else room.status = updateList(room.status, detail);
    } else if (isRoomStatus(detail) || (!room.labelled && plain === 0)) {
      // "cleared, looted": a status can be several at once.
      room.status = listOf(detail);
      plain++;
    } else {
      room.description = detail.match(REPLACE)?.[2] ?? detail;
      plain++;
    }
  });
}

function roomTags(room: RoomState): string[] {
  return [
    room.status.join(", "),
    room.description ?? "",
    ...room.rest,
    room.exits.size ? `${room.exitsWord ?? "exits"} ${[...room.exits.values()].join(", ")}` : "",
  ].filter(Boolean);
}

/** The add-ons' categories in the player's language ("status" / "estado"). */
export interface CategoryWords {
  status: string;
  exits: string;
  pos: string;
  owner: string;
  where: string;
  out: string;
}

/**
 * What's typed for an element, as the add-ons write it: a room's status
 * and a foe's range go in their categories, so a new one replaces the
 * old ("Close" → "pos:Close", "cleared" → "status:cleared").
 */
export function writeDetails(kind: CastKind, values: string[], words: CategoryWords): string[] {
  const details = values.map((v) => v.trim()).filter(Boolean);
  if (kind === "foe") return details.map((d) => (isRange(d) ? `pos:${d}` : d));
  if (kind !== "room") return details;
  const status: string[] = [];
  const rest: string[] = [];
  details.forEach((d, i) => {
    const bare = d.replace(/^[+-]\s*/, "");
    const other = d.includes(":") || OLD_EXITS.test(d) || REPLACE.test(d) || STAT.test(d);
    if (!other && (ROOM_STATUS.test(bare) || (i === 0 && bare === d))) status.push(d);
    else rest.push(d);
  });
  return [...(status.length ? [`${words.status}:${status.join(", ")}`] : []), ...rest];
}

/**
 * The adventure's characters, places, threads and progress, and the
 * add-ons' rooms, foes, items and money, derived from its entries (the
 * journal is the only source of truth: nothing is stored apart). Roll
 * entries are skipped: a `[...]` inside `d:` is roll context (§4.1.9),
 * not a persistent element. In order of first appearance.
 */
export function buildCast(entries: JournalEntry[]): CastMember[] {
  const byKey = new Map<string, CastMember>();
  const rooms = new Map<string, RoomState>();
  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);

  function mention(member: CastMember, entry: JournalEntry): CastMember {
    member.lastSeen = entry.timestamp;
    if (member.mentions.at(-1) !== entry.id) member.mentions.push(entry.id);
    return member;
  }

  function memberFor(
    kind: CastKind,
    name: string,
    entry: JournalEntry,
    key = castKey(kind, name),
  ): CastMember {
    let member = byKey.get(key);
    if (!member) {
      member = { key, kind, name, tags: [], mentions: [], lastSeen: entry.timestamp };
      byKey.set(key, member);
    }
    return mention(member, entry);
  }

  const money = () => [...new Set(byKey.values())].filter((m) => m.kind === "wealth");

  /** A currency in someone's purse; one that had no owner yet (before 1.7) becomes theirs. */
  function purse(owner: string, currency: string, entry: JournalEntry): CastMember {
    const key = purseKey(owner, currency);
    const loose = byKey.get(castKey("wealth", currency));
    if (!byKey.has(key) && loose && !loose.owner) {
      loose.aliases = [key];
      byKey.set(key, loose);
    }
    const member = memberFor("wealth", currency, entry, key);
    member.owner ??= owner;
    member.tags = [member.owner];
    return member;
  }

  /** A currency with no owner: the only one there is of it, or loose money. */
  function currency(name: string, entry: JournalEntry): CastMember {
    const known = money().filter((m) => same(m.name, name));
    return known.length === 1 ? mention(known[0], entry) : memberFor("wealth", name, entry);
  }

  function applyProgress(member: CastMember, progress: Progress) {
    const before = member.progress;
    member.progress = progress.relative
      ? {
          value: (before?.value ?? 0) + progress.value,
          ...(before?.max !== undefined ? { max: before.max } : {}),
        }
      : {
          value: progress.value,
          ...((progress.max ?? before?.max) !== undefined
            ? { max: progress.max ?? before!.max }
            : {}),
        };
  }

  for (const entry of sorted) {
    if (entry.kind === "roll" || entry.kind === "session") continue;
    for (const part of splitTags(entry.text)) {
      if (!part.tag) continue;
      const { kind, name, details, progress, reference } = part.tag;

      if (reference) {
        // It changes nothing. `[#E:Alarm]` may be a clock from before 1.7,
        // and `[#Wealth:Kael]` everything in a purse.
        const owned =
          kind === "wealth" ? money().filter((m) => m.owner && same(m.owner, name)) : [];
        if (owned.length) for (const member of owned) mention(member, entry);
        else if (kind === "wealth") currency(name, entry);
        else if (
          kind === "event" &&
          !byKey.has(castKey("event", name)) &&
          byKey.has(castKey("clock", name))
        )
          memberFor("clock", name, entry);
        else memberFor(kind, name, entry);
        continue;
      }

      if (kind === "wealth") {
        // Each currency counts on its own: "Gold 45|Silver 12" is two.
        for (const { name: coin, progress: amount } of [
          ...(part.tag.owned ? [] : [{ name, progress }]),
          ...details.map((d) => readProgress(toLatest(d))),
        ]) {
          if (part.tag.owned && !amount) continue;
          const member = part.tag.owned ? purse(name, coin, entry) : currency(coin, entry);
          if (amount) applyProgress(member, amount);
        }
        continue;
      }

      // "[E:Alarm]" or "[E:Alarm 3]" of one already a clock (before 1.7).
      const counted = kind === "event" ? readProgress(name) : null;
      const clock =
        counted && !byKey.has(castKey("event", name)) && byKey.get(castKey("clock", counted.name));
      if (clock) {
        mention(clock, entry);
        if (counted.progress) applyProgress(clock, counted.progress);
        continue;
      }

      const member = memberFor(kind, name, entry);
      // A multi-line tag is a full status block.
      if (part.tag.block) {
        member.tags = [];
        rooms.delete(member.key);
      }
      if (kind === "room") {
        const room = rooms.get(member.key) ?? newRoom();
        rooms.set(member.key, room);
        applyRoomUpdates(room, details);
        member.tags = roomTags(room);
        continue;
      }

      if (QUANTITY_KINDS.has(kind)) {
        // The quantity: "×3", "×-1", "×3>2" or "depleted" (before 1.7, "3",
        // "3→2", or "Torch-1" in the name); anything else is a property.
        const rest: string[] = [];
        for (const detail of details) {
          const amount = readCount(detail);
          const plain = toLatest(detail);
          if (amount) applyProgress(member, amount);
          else if (/^\d+$/.test(plain)) applyProgress(member, { value: Number(plain) });
          else if (DEPLETED.test(detail)) applyProgress(member, { value: 0 });
          else rest.push(detail);
        }
        if (progress) applyProgress(member, progress);
        member.tags = applyTagUpdates(member.tags, rest);
        continue;
      }

      // One state at a time for a thread and one range band for a foe: a
      // new one replaces the old, however it's written.
      let current = member.tags;
      let updates = details;
      if (kind === "thread") {
        updates = details.map((d) => newState(d) ?? d);
        if (updates.some((d, i) => stateOf(d) || newState(details[i]) !== null)) {
          const replaced = details.map((d) => d.match(REPLACE)?.[1].trim() ?? "");
          current = current.filter((t) => !stateOf(t) && !replaced.some((r) => same(r, t)));
        }
      }
      if (kind === "foe") {
        if (details.some((d) => isRange(d)))
          current = current.filter((t) => !isRange(t) && !isPosition(t));
        else if (details.some(isPosition)) current = current.filter((t) => !isRange(t));
      }
      member.tags = applyTagUpdates(current, updates);
      if (progress) applyProgress(member, progress);
    }
  }
  return [...new Set(byKey.values())];
}

/** A foe that's out of the fight ("dead", "fled"…): shown dimmed. */
export function foeIsOut(member: CastMember): boolean {
  return member.tags.some((t) =>
    /^(?:(?:status|estado)\s*:\s*)?(×0|dead|fled|muert[oa]s?|huid[oa]s?|derrotad[oa]s?|defeated)$/i.test(
      t.trim(),
    ),
  );
}

/** "5/12", "3", "+1". */
/**
 * A clock or a track that's full, or a timer that's run out: shown
 * apart (colour and a word), quietly, where its number is.
 */
export function progressDone(
  kind: CastKind,
  progress: Progress | { value: number; max?: number } | undefined,
): boolean {
  if (!progress || ("relative" in progress && progress.relative)) return false;
  if (kind === "timer") return progress.value <= 0;
  return (
    (kind === "clock" || kind === "track") &&
    progress.max !== undefined &&
    progress.value >= progress.max
  );
}

export function progressText(progress: Progress | { value: number; max?: number }): string {
  if ("relative" in progress && progress.relative)
    return `${progress.value >= 0 ? "+" : ""}${progress.value}`;
  return `${progress.value}${progress.max !== undefined ? `/${progress.max}` : ""}`;
}

/** The text with each tag as just its name, for short previews. */
export function tagsToPlainText(text: string): string {
  return splitTags(text)
    .map((part) => {
      if (!part.tag) return part.text;
      const { name, progress, kind, details, owned } = part.tag;
      const amount = progress
        ? progressText(progress)
        : owned
          ? details.join(", ")
          : kind === "item"
            ? (details.find((d) => COUNT.test(d)) ?? "")
            : "";
      return amount ? `${name} ${amount}` : name;
    })
    .join("");
}

/** The reference that names an element: a purse, by whose it is (`[#Wealth:Kael]`). */
export function formatReference(member: Pick<CastMember, "kind" | "name" | "owner">): string {
  return formatTag(member.kind, member.owner ?? member.name, [], true);
}

/**
 * How much there is of something, or how it changes ("+1", "-8"), as the
 * spec writes it: `[Inv:Torch|×-1]`, `[Wealth:Kael|Gold+15]`. Money with
 * no owner known keeps the form from before 1.7 (`[Wealth:Gold+15]`).
 */
export function formatQuantity(
  kind: CastKind,
  name: string,
  amount: string,
  owner?: string,
): string {
  if (kind !== "wealth") return formatTag(kind, name, [`×${amount}`]);
  const currency = `${name.replace(/[[\]|]/g, " ").trim()}${/^[+-]/.test(amount) ? "" : " "}${amount}`;
  return owner ? formatTag("wealth", owner, [currency]) : formatTag("wealth", currency);
}

export interface TagQuery {
  /** Where the "[" is, in the text. */
  start: number;
  /** If a type was already typed ("[N:Od"). */
  kind?: CastKind;
  /** What's typed after it, to filter by. */
  text: string;
  /**
   * Not a tag but who does an action ("(Od" at the start of someone
   * else's, `@(Odile) …`) or says a line ("N (Od", `N (Odile): "…"`):
   * the same list, characters only, and picking one writes the name.
   */
  actor?: "action" | "dialogue";
}

// An unclosed "[" right before the caret, with an optional type.
// Any case while typing ("[clock:"): picking an option writes the
// notation's own ("[Clock:…]").
const OPEN_TAG = new RegExp(`\\[(#?)(?:(${PREFIXES}):)?([^[\\]|\\n]*)$`, "i");
const KIND_OF_TYPED_PREFIX = new Map(
  Object.entries(KIND_OF_PREFIX).map(([p, kind]) => [p.toLowerCase(), kind]),
);

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
  return {
    start: match.index!,
    kind: match[2] ? KIND_OF_TYPED_PREFIX.get(match[2].toLowerCase()) : undefined,
    text,
  };
}

/**
 * The character being typed as who acts or speaks, at the start of an
 * action's text ("(Od") or of a note ("N (Od"): Lonelog's own notation,
 * which stays as it is (other tools read it), offered like a tag.
 */
export function findActorQuery(beforeCaret: string, context: "action" | "note"): TagQuery | null {
  const match = beforeCaret.match(
    context === "action" ? /^\(([^()\n]{0,40})$/ : /^N \(([^()\n]{0,40})$/,
  );
  if (!match || /^\s/.test(match[1])) return null;
  return {
    start: beforeCaret.length - match[1].length,
    text: match[1],
    actor: context === "action" ? "action" : "dialogue",
  };
}

/** Characters who can act or speak: NPCs and PCs. */
const ACTOR_KINDS = new Set<CastKind>(["npc", "pc"]);

/** The NPC or PC with this name, if the cast has one (who an action's or a line's name points to). */
export function characterNamed(cast: CastMember[], name: string): CastMember | undefined {
  const wanted = normalizeForSearch(name.trim());
  return cast.find((m) => ACTOR_KINDS.has(m.kind) && normalizeForSearch(m.name) === wanted);
}

/** Who a bare "PC:" is: the first player character named in the journal. */
export function mainPc(cast: CastMember[]): CastMember | undefined {
  return cast.find((m) => m.kind === "pc");
}

/** The cast members that fit what's typed, all of them, in alphabetical order. */
export function suggestCast(cast: CastMember[], query: TagQuery): CastMember[] {
  const q = normalizeForSearch(query.text.trim());
  return cast
    .filter((m) => (query.actor ? ACTOR_KINDS.has(m.kind) : !query.kind || m.kind === query.kind))
    .filter((m) => normalizeForSearch(m.name).includes(q))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

/** An item of the "[" list: someone already in the cast (`recent` if
 * among the last named, listed first), or a new one. */
export type TagOption = { member: CastMember; recent?: boolean } | { kind: CastKind; name: string };

/** How many of the last named go first in the "[" list. */
const RECENT = 3;
/** Every kind a new tag can be, in the order "[" offers them. */
const NEW_KINDS: CastKind[] = [
  "npc",
  "place",
  "pc",
  "thread",
  "clock",
  "track",
  "timer",
  "event",
  "room",
  "foe",
  "item",
  "wealth",
  "deck",
];

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
  // Someone not in the notebook just gets their name written.
  const kinds = query.actor ? ["npc" as const] : query.kind ? [query.kind] : NEW_KINDS;
  return [
    ...found.map((member) => ({ member })),
    ...(exists ? [] : kinds.map((kind) => ({ kind, name }))),
  ];
}

/** Size a new clock, track or timer starts with when none is typed (as in the notebook). */
const NEW_PROGRESS_SIZE = 6;

/**
 * The text a picked option writes: a reference to an existing one, or a
 * new tag (a new clock or track starts empty, a timer full, unless a
 * number was typed).
 */
export function tagOptionText(option: TagOption, query?: Pick<TagQuery, "actor">): string {
  if (query?.actor) {
    const name = ("member" in option ? option.member.name : option.name)
      .replace(/[()\n]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return query.actor === "dialogue" ? `${name}): ` : `${name}) `;
  }
  if ("member" in option) return formatReference(option.member);
  const { kind, name } = option;
  if (!PROGRESS_KINDS.has(kind) || readProgress(name).progress) return formatTag(kind, name);
  return kind === "timer"
    ? formatProgressTag(kind, name, NEW_PROGRESS_SIZE)
    : formatProgressTag(kind, name, 0, NEW_PROGRESS_SIZE);
}

/**
 * An element renamed in one entry's text ("Odille" → "Odile"): every tag
 * of its kind with that name, references and numbered ones too
 * ("[Clock:Alarm 2/6]") keeping their number and details; for a
 * character, also the lines they say (`N (Odille): …`), what they do
 * (`@(Odille) …`, alone or with others), a storyline's point of view and
 * what they own (`[Wealth:Odille|…]`, `owner:Odille`); for money, its
 * currency in that purse. The text as it was if it isn't there.
 */
export function renameInEntry(
  entry: Pick<JournalEntry, "kind" | "text">,
  member: Pick<CastMember, "kind" | "name" | "owner">,
  newName: string,
): string {
  const name = newName
    .replace(/[[\]|\n]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!name) return entry.text;
  const target = normalizeForSearch(member.name.trim());
  const same = (s: string) => normalizeForSearch(s.trim()) === target;
  const character = member.kind === "npc" || member.kind === "pc";
  const numbered = PROGRESS_KINDS.has(member.kind) || QUANTITY_KINDS.has(member.kind);
  const isGroup = member.kind === "foe" || member.kind === "npc";
  let text = entry.text.replace(
    new RegExp(TAG.source, "g"),
    (whole, hash: string, prefix: string, tagName: string, details: string) => {
      const tag = splitTags(whole)[0].tag;
      if (!tag) return whole;
      if (tag.owned || (tag.kind === "wealth" && hash)) {
        if (character && same(tagName)) return `[${hash}${prefix}:${name}${details}]`;
        if (!tag.owned && member.kind === "wealth" && same(tagName))
          return `[${hash}${prefix}:${name}${details}]`;
        if (
          !tag.owned ||
          member.kind !== "wealth" ||
          (member.owner && normalizeForSearch(member.owner) !== normalizeForSearch(tag.name))
        )
          return whole;
        return `[${hash}${prefix}:${tagName}${details.replace(
          /(\|\s*)([^|]+)/g,
          (w, bar: string, d: string) =>
            same(readProgress(toLatest(d.trim())).name)
              ? `${bar}${name}${d.trimEnd().match(/\s*[+-]?\s*\d+(?:\s*(?:→|->|>)\s*\d+)?$/)?.[0] ?? ""}`
              : w,
        )}]`;
      }
      const owner = character
        ? details.replace(
            /(\|\s*(?:owner|dueñ[oa])\s*:\s*)([^|]+)/gi,
            (w, a: string, who: string) => (same(who) ? a + name : w),
          )
        : details;
      if (tag.kind !== member.kind) return `[${hash}${prefix}:${tagName}${owner}]`;
      const split = numbered
        ? tagName.match(/^(.*?)(\s*[+-]?\s*\d+(?:\/\d+|\s*(?:→|->|>)\s*\d+)?)?$/)
        : isGroup
          ? tagName.match(/^(.*?)(\s*[×x]\s*\d+)?$/)
          : null;
      const base = same(tagName) ? tagName : split ? split[1] : tagName;
      if (!same(base)) return whole;
      return `[${hash}${prefix}:${name}${tagName.slice(base.length)}${owner}]`;
    },
  );
  if (!character) return text;
  if (entry.kind === "note") {
    const speaker =
      member.kind === "npc"
        ? /^(N\s*\()([^()\n]+)(\)\s*:)/
        : /^(PC\s*\()([^(),\n]+)((?:,[^()\n]*)?\)\s*:)/;
    text = text.replace(speaker, (w, a, n: string, b) => (same(n) ? a + name + b : w));
  }
  const actors = (list: string) =>
    list
      .split(/(\s*[>+]\s*)/)
      .map((n) => (same(n) ? name : n))
      .join("");
  if (entry.kind === "action")
    text = text.replace(/^\(([^()\n]+)\)/, (_, n: string) => `(${actors(n)})`);
  if (entry.kind === "scene")
    text = text.replace(/(@\()([^()\n]+)(\)\s*)$/, (_, a, n: string, b) => a + actors(n) + b);
  return text;
}

/**
 * Where an element stands, as one tag that reads back to the same
 * state: what carries an adventure's notebook over into a new one
 * (continueAdventure.ts). Its name, its details as they are now, and its
 * number (a clock's 3/6, how many torches, a purse's coins).
 */
export function snapshotTag(member: CastMember): string {
  const { kind, name, tags, progress } = member;
  if (PROGRESS_KINDS.has(kind) && progress)
    return formatProgressTag(kind, name, progress.value, progress.max);
  if (kind === "wealth")
    return formatQuantity("wealth", name, String(progress?.value ?? 0), member.owner);
  if (QUANTITY_KINDS.has(kind) && progress)
    return formatTag(kind, name, [`×${progress.value}`, ...tags]);
  return formatTag(kind, name, tags);
}
