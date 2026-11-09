import type { JournalEntry } from "./lonelog";

/**
 * Where an entry goes when it's written below another one or moved.
 * The journal is ordered by timestamp alone (no position field), so
 * placing an entry means giving it a timestamp between its new
 * neighbours: halfway, fractions of a millisecond included.
 *
 * Neighbours can share a timestamp (a question and its roll are logged
 * in the same millisecond) or be too close to fit anything between;
 * then the entries that follow are nudged forward a millisecond each,
 * just as far as needed. Those nudges are returned too, so the caller
 * saves them.
 */
export interface Placement {
  timestamp: number;
  /** Entries (by id) that had to move forward to make room. */
  nudged: Map<string, number>;
}

/**
 * Timestamp for an entry placed right after `afterId` in `sorted` (one
 * adventure's entries in journal order), or first if `afterId` is null.
 * `movingId` is the entry being moved, if any: left out of the list.
 */
export function placeAfter(
  sorted: JournalEntry[],
  afterId: string | null,
  movingId?: string,
  now: number = Date.now(),
): Placement {
  const list = movingId ? sorted.filter((e) => e.id !== movingId) : sorted;
  const index = afterId === null ? -1 : list.findIndex((e) => e.id === afterId);
  const prev = index >= 0 ? list[index].timestamp : undefined;
  const next = list[index + 1]?.timestamp;

  let timestamp: number;
  if (prev === undefined) timestamp = next === undefined ? now : next - 1;
  // A new entry at the end is simply written now; a moved one keeps
  // close to its old date.
  else if (next === undefined) timestamp = movingId ? prev + 1 : Math.max(prev + 1, now);
  else {
    timestamp = (prev + next) / 2;
    if (!(timestamp > prev)) timestamp = prev + 0.5;
  }

  const nudged = new Map<string, number>();
  let last = timestamp;
  for (const entry of list.slice(index + 1)) {
    if (entry.timestamp > last) break;
    last += 1;
    nudged.set(entry.id, last);
  }
  return { timestamp, nudged };
}

/**
 * Moving an entry one place up or down: the placement, or null if it's
 * already at that end. Session titles are entries too, so stepping past
 * one moves the entry into the next or previous session.
 */
export function placeMoved(sorted: JournalEntry[], id: string, direction: "up" | "down"): Placement | null {
  const index = sorted.findIndex((e) => e.id === id);
  if (index < 0) return null;
  if (direction === "up") {
    if (index === 0) return null;
    return placeAfter(sorted, sorted[index - 2]?.id ?? null, id);
  }
  if (index === sorted.length - 1) return null;
  return placeAfter(sorted, sorted[index + 1].id, id);
}

/** One adventure's entries in journal order. */
export function sortedEntriesOf(entries: JournalEntry[], adventureId: string): JournalEntry[] {
  return entries.filter((e) => e.adventureId === adventureId).sort((a, b) => a.timestamp - b.timestamp);
}

/** The entries nudged forward to make room (see placeAfter); a nudge counts as an edit. */
function applyPlacement(entries: JournalEntry[], placement: Placement, now: number): JournalEntry[] {
  if (placement.nudged.size === 0) return entries;
  return entries.map((e) => {
    const timestamp = placement.nudged.get(e.id);
    return timestamp === undefined ? e : { ...e, timestamp, editedAt: now };
  });
}

/**
 * Every entry with `entry` added right after `afterId` in its
 * adventure ("Write below"), or at the end if that entry is gone.
 */
export function insertEntryAfter(entries: JournalEntry[], entry: JournalEntry, afterId: string, now: number): JournalEntry[] {
  const sorted = sortedEntriesOf(entries, entry.adventureId);
  if (!sorted.some((e) => e.id === afterId)) return [...entries, entry];
  const placement = placeAfter(sorted, afterId, undefined, now);
  return [...applyPlacement(entries, placement, now), { ...entry, timestamp: placement.timestamp }];
}

/**
 * Every entry with `id` one place up or down in its adventure; the same
 * list if it can't move. A move counts as an edit (editedAt), so a
 * merged backup keeps the newer order.
 */
export function moveEntryIn(entries: JournalEntry[], id: string, direction: "up" | "down", now: number): JournalEntry[] {
  const moving = entries.find((e) => e.id === id);
  if (!moving) return entries;
  const placement = placeMoved(sortedEntriesOf(entries, moving.adventureId), id, direction);
  if (!placement) return entries;
  return applyPlacement(entries, placement, now).map((e) =>
    e.id === id ? { ...e, timestamp: placement.timestamp, editedAt: now } : e,
  );
}
