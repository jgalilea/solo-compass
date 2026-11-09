import { useCallback, useRef, useState } from "react";

/**
 * A list kept in memory and saved record by record (see
 * collectionStore.ts): `update` works out the next list from the
 * latest one, shows it and hands both lists to `save`, which writes
 * only what changed.
 *
 * The latest list lives in a ref as well as in state, so several
 * updates in one event (a question and its roll) build on each other
 * before React repaints, and the updater runs exactly once, outside
 * React, so it never saves twice.
 *
 * `version` goes up with each local change: a reload started before
 * one (another tab saved meanwhile) knows to read again.
 */
export function useStoredList<T extends { id: string }>(
  save: (prev: T[], next: T[]) => Promise<void>,
  onSaveError: (err: unknown) => void,
) {
  const [items, setItems] = useState<T[]>([]);
  const latest = useRef<T[]>([]);
  const version = useRef(0);

  /** What was read from storage, as it is. */
  const setLoaded = useCallback((loaded: T[]) => {
    latest.current = loaded;
    setItems(loaded);
  }, []);

  const update = useCallback(
    (updater: (prev: T[]) => T[]) => {
      const prev = latest.current;
      const next = updater(prev);
      if (next === prev) return;
      latest.current = next;
      version.current += 1;
      setItems(next);
      save(prev, next).catch(onSaveError);
    },
    [save, onSaveError],
  );

  return { items, latest, version, setLoaded, update };
}
