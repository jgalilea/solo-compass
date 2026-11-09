import { createStore, del, get, promisifyRequest, type UseStore } from "idb-keyval";

/**
 * One kind of record (journal entries, adventures, history rolls, the
 * player's tables, deletions) in an IndexedDB store of its own, one
 * record per id. Saving writes only what changed (`diffById`): two
 * tabs or windows of the app saving at once each keep their own
 * changes, instead of the last one writing its whole list over the
 * other's, and a long history doesn't make every roll rewrite all the
 * others.
 *
 * It replaces the first layout, one key holding the whole array in
 * idb-keyval's default store: the first load moves that array over
 * (`legacyKey`) and deletes it. Every record is read through
 * `normalize`, which drops what isn't usable (from a damaged backup,
 * say) instead of letting it break a screen.
 */

export interface Changes<T> {
  put: T[];
  remove: string[];
}

export interface Collection<T extends { id: string }> {
  load(): Promise<T[]>;
  save(changes: Changes<T>): Promise<void>;
  /** Everything stored becomes exactly `items` (restoring a backup). */
  replace(items: T[]): Promise<void>;
}

/**
 * What to write to go from `prev` to `next`: the records that are new
 * or changed (the app updates immutably, so a changed record is a new
 * object) and the ids that are gone.
 */
export function diffById<T extends { id: string }>(prev: readonly T[], next: readonly T[]): Changes<T> {
  const before = new Map(prev.map((x) => [x.id, x]));
  const kept = new Set(next.map((x) => x.id));
  return {
    put: next.filter((x) => before.get(x.id) !== x),
    remove: prev.filter((x) => !kept.has(x.id)).map((x) => x.id),
  };
}

export function createCollection<T extends { id: string }>({
  name,
  legacyKey,
  normalize,
  fromLegacy,
}: {
  /** Its database's name, after "solo-compass-". */
  name: string;
  /** The key the whole array was kept under before, if there was one. */
  legacyKey?: string;
  normalize: (value: unknown) => T | null;
  /** A last step for the moved array, which still has its old order. */
  fromLegacy?: (items: T[]) => T[] | Promise<T[]>;
}): Collection<T> {
  let store: UseStore | null = null;
  const db = () => (store ??= createStore(`solo-compass-${name}`, "records"));

  function write(clearFirst: boolean, put: T[], remove: string[] = []): Promise<void> {
    return db()("readwrite", (s) => {
      if (clearFirst) s.clear();
      for (const item of put) s.put(item, item.id);
      for (const id of remove) s.delete(id);
      return promisifyRequest(s.transaction);
    });
  }

  async function moveLegacy(): Promise<void> {
    if (!legacyKey) return;
    const old = await get<unknown>(legacyKey);
    if (old === undefined) return;
    if (Array.isArray(old)) {
      const items = old.map(normalize).filter((x): x is T => x !== null);
      await write(false, fromLegacy ? await fromLegacy(items) : items);
    }
    await del(legacyKey);
  }

  return {
    async load() {
      await moveLegacy();
      const all = await db()("readonly", (s) => promisifyRequest(s.getAll()));
      return all.map(normalize).filter((x): x is T => x !== null);
    },
    async save({ put, remove }) {
      if (put.length || remove.length) await write(false, put, remove);
    },
    replace(items) {
      return write(true, items);
    },
  };
}
