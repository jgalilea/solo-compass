import { get, set } from "idb-keyval";

/**
 * What was deleted on this device (journal entries, adventures, history
 * rolls, the player's own tables), by id: only so that merging a backup
 * from another device (backupMerge.ts) doesn't bring it back. A deleted
 * item's id is enough; nothing of its content is kept. Undoing a
 * deletion takes it off the list.
 *
 * IndexedDB like the data it refers to. Best-effort: writes are queued
 * one after another (so two quick deletions don't overwrite each
 * other) and a failure only means a deleted item could come back on a
 * merge.
 */

const KEY = "solo-compass:deleted";

export interface Deletion {
  id: string;
  /** When it was deleted (ms). */
  at: number;
}

let queue: Promise<unknown> = Promise.resolve();

function enqueue(change: (prev: Deletion[]) => Deletion[]): void {
  if (typeof window === "undefined") return;
  queue = queue
    .then(() => loadDeletions())
    .then((prev) => set(KEY, change(prev)))
    .catch(() => {
      // Not critical: see above.
    });
}

export async function loadDeletions(): Promise<Deletion[]> {
  if (typeof window === "undefined") return [];
  try {
    const stored = await get<Deletion[]>(KEY);
    return Array.isArray(stored) ? stored.filter((d) => typeof d?.id === "string") : [];
  } catch {
    return [];
  }
}

export async function saveDeletions(deletions: Deletion[]): Promise<void> {
  if (typeof window === "undefined") return;
  await queue;
  await set(KEY, deletions);
}

export function recordDeletions(ids: string[]): void {
  if (ids.length === 0) return;
  const at = Date.now();
  enqueue((prev) => {
    const gone = new Set(ids);
    return [...prev.filter((d) => !gone.has(d.id)), ...ids.map((id) => ({ id, at }))];
  });
}

export function forgetDeletions(ids: string[]): void {
  if (ids.length === 0) return;
  enqueue((prev) => {
    const back = new Set(ids);
    return prev.filter((d) => !back.has(d.id));
  });
}
