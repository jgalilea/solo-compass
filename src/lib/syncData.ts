/**
 * What a sync sends and what it takes in, worked out from the data alone
 * (no hooks into how it's saved): every record has a fingerprint, and
 * the device remembers the fingerprint of each record the relay already
 * has (its "prints"). A record whose fingerprint differs is a change to
 * send, however it came about: typed here, saved by another tab,
 * imported, or made while sync was off. Pure, so it's tested on its own;
 * syncEngine.ts loads, sends and saves.
 *
 * A fingerprint is a hash of the record with its keys in order, so the
 * same content always gives the same one, whichever device built it.
 */

import type { MergeData } from "./backupMerge";

export const SYNC_KINDS = [
  "history",
  "adventures",
  "entries",
  "customTables",
  "savedRolls",
  "generators",
  "deleted",
] as const;
export type SyncKind = (typeof SYNC_KINDS)[number];

/** A record's fingerprint, by `${kind}:${id}`. */
export type Prints = Map<string, string>;

export function emptyData(): MergeData {
  return {
    history: [],
    adventures: [],
    entries: [],
    customTables: [],
    savedRolls: [],
    generators: [],
    deleted: [],
  };
}

export function isEmptyData(data: MergeData): boolean {
  return SYNC_KINDS.every((kind) => data[kind].length === 0);
}

export function countRecords(data: MergeData): number {
  return SYNC_KINDS.reduce((sum, kind) => sum + data[kind].length, 0);
}

/** Several changes as one (later ones after earlier ones: the merge picks the newest). */
export function combineData(parts: readonly MergeData[]): MergeData {
  const all = emptyData();
  for (const part of parts) {
    for (const kind of SYNC_KINDS) (all[kind] as unknown[]).push(...part[kind]);
  }
  return all;
}

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value))
    return `[${value.map((v) => (v === undefined ? "null" : stable(v))).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .filter((k) => record[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stable(record[k])}`)
    .join(",")}}`;
}

/** cyrb53: a fast 53-bit hash; a clash would only mean one change not sent. */
function hash(text: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export function fingerprint(record: unknown): string {
  return hash(stable(record));
}

function key(kind: SyncKind, id: string): string {
  return `${kind}:${id}`;
}

/** The longest the page is kept busy at once while fingerprinting (ms). */
const SLICE_MS = 10;

/**
 * A pause for the page to draw and answer, between slices of long work.
 * Only while it's in view: a hidden tab's timers are slowed down to a
 * second or more, and the exchange made on leaving the app has to be
 * quick (nobody is typing then anyway).
 */
function breather(): (() => Promise<void>) | null {
  if (typeof document === "undefined" || document.visibilityState !== "visible") return null;
  const scheduler = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  return scheduler?.yield
    ? () => scheduler.yield!()
    : () => new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * The records the relay doesn't have yet, and the fingerprint of each one
 * sent. Every record is fingerprinted (years of play: a fifth of a second
 * on a modest phone), in slices, so writing meanwhile never stutters.
 */
export async function changedRecords(
  data: MergeData,
  prints: Prints,
): Promise<{ delta: MergeData; sent: Prints }> {
  const pause = breather();
  let sliceStart = performance.now();
  const delta = emptyData();
  const sent: Prints = new Map();
  for (const kind of SYNC_KINDS) {
    for (const record of data[kind] as { id: string }[]) {
      if (pause && performance.now() - sliceStart > SLICE_MS) {
        await pause();
        sliceStart = performance.now();
      }
      const print = fingerprint(record);
      if (prints.get(key(kind, record.id)) === print) continue;
      (delta[kind] as unknown[]).push(record);
      sent.set(key(kind, record.id), print);
    }
  }
  return { delta, sent };
}

/** A big first upload in parts the relay takes (each one a change of its own). */
export function splitData(data: MergeData, perPart: number): MergeData[] {
  if (countRecords(data) <= perPart) return [data];
  const parts: MergeData[] = [];
  let part = emptyData();
  let size = 0;
  for (const kind of SYNC_KINDS) {
    for (const record of data[kind]) {
      (part[kind] as unknown[]).push(record);
      if (++size === perPart) {
        parts.push(part);
        part = emptyData();
        size = 0;
      }
    }
  }
  if (size > 0) parts.push(part);
  return parts;
}

/**
 * The prints once an exchange is done: what was sent is the relay's now;
 * of what came in, a record is too when this device ended up with the
 * same content (it came in as is, or it's what this device had just
 * sent). One kept here over what came in (newer here) stays a change to
 * send; nothing is remembered for records no longer here.
 */
export function printsAfter(
  prints: Prints,
  sent: Prints,
  incoming: MergeData,
  merged: MergeData,
): Prints {
  const next: Prints = new Map(prints);
  for (const [k, print] of sent) next.set(k, print);
  for (const kind of SYNC_KINDS) {
    const here = new Map((merged[kind] as { id: string }[]).map((r) => [r.id, r]));
    for (const record of incoming[kind] as { id: string }[]) {
      const k = key(kind, record.id);
      const mine = here.get(record.id);
      if (!mine) continue;
      const print = fingerprint(mine);
      if (print === fingerprint(record) || print === sent.get(k)) next.set(k, print);
    }
  }
  const present = new Set<string>();
  for (const kind of SYNC_KINDS)
    for (const r of merged[kind] as { id: string }[]) present.add(key(kind, r.id));
  for (const k of [...next.keys()]) if (!present.has(k)) next.delete(k);
  return next;
}

/** Which of the app's change topics a write touched (to tell the screens). */
export function changedKinds(before: MergeData, after: MergeData): Set<SyncKind> {
  const kinds = new Set<SyncKind>();
  for (const kind of SYNC_KINDS) {
    const prev = new Map((before[kind] as { id: string }[]).map((r) => [r.id, r]));
    const next = after[kind] as { id: string }[];
    if (next.length !== prev.size || next.some((r) => prev.get(r.id) !== r)) kinds.add(kind);
  }
  return kinds;
}
