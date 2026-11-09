import { createCollection } from "./collectionStore";

/**
 * What was deleted on this device (journal entries, adventures, history
 * rolls, the player's own tables), by id: only so that merging a backup
 * from another device (backupMerge.ts) doesn't bring it back. A deleted
 * item's id is enough; nothing of its content is kept. Undoing a
 * deletion takes it off the list.
 *
 * One record per id (collectionStore.ts), so two deletions at once
 * never overwrite each other. Best-effort: a failure only means a
 * deleted item could come back on a merge. Kept for a year: a backup
 * older than that, merged, could bring back what was deleted before
 * it, a fair price for a list that doesn't grow forever.
 */

export interface Deletion {
  id: string;
  /** When it was deleted (ms). */
  at: number;
}

const KEEP_FOR = 365 * 24 * 60 * 60 * 1000;

function normalizeDeletion(value: unknown): Deletion | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  return typeof v.id === "string" && typeof v.at === "number" && Number.isFinite(v.at) ? { id: v.id, at: v.at } : null;
}

const deletionStore = createCollection<Deletion>({
  name: "deletions",
  legacyKey: "solo-compass:deleted",
  normalize: normalizeDeletion,
});

/** Only the ones still within the year. */
export function recentDeletions(deletions: Deletion[], now = Date.now()): Deletion[] {
  return deletions.filter((d) => d.at > now - KEEP_FOR);
}

/** The ones still within the year; older ones are dropped from storage on the way. */
export async function loadDeletions(): Promise<Deletion[]> {
  if (typeof window === "undefined") return [];
  try {
    const all = await deletionStore.load();
    const recent = recentDeletions(all);
    if (recent.length < all.length) {
      const kept = new Set(recent.map((d) => d.id));
      void deletionStore.save({ put: [], remove: all.filter((d) => !kept.has(d.id)).map((d) => d.id) }).catch(() => {});
    }
    return recent;
  } catch {
    return [];
  }
}

export async function replaceDeletions(deletions: Deletion[]): Promise<void> {
  if (typeof window === "undefined") return;
  await deletionStore.replace(recentDeletions(deletions.map(normalizeDeletion).filter((d) => d !== null)));
}

export function recordDeletions(ids: string[]): void {
  if (ids.length === 0 || typeof window === "undefined") return;
  const at = Date.now();
  deletionStore.save({ put: ids.map((id) => ({ id, at })), remove: [] }).catch(() => {
    // Not critical: see above.
  });
}

export function forgetDeletions(ids: string[]): void {
  if (ids.length === 0 || typeof window === "undefined") return;
  deletionStore.save({ put: [], remove: ids }).catch(() => {
    // Not critical: see above.
  });
}
