import { useCallback, useEffect, useState } from "react";
import {
  clearHistory,
  HistoryStorageError,
  loadHistory,
  saveHistory,
  type HistoryEntry,
} from "../lib/history";
import { useLocaleContext } from "./useLocaleContext";

export type HistoryStatus = "loading" | "ready" | "error";

interface UseHistoryResult {
  status: HistoryStatus;
  entries: HistoryEntry[];
  error: string | null;
  addEntry: (entry: HistoryEntry) => void;
  removeEntry: (id: string) => void;
  /** Puts a deleted roll (Undo) back in its place, by date. */
  restoreEntry: (entry: HistoryEntry) => void;
  toggleFavorite: (id: string) => void;
  clear: () => void;
  retry: () => void;
}

export function useHistory(): UseHistoryResult {
  const { t } = useLocaleContext();
  const [status, setStatus] = useState<HistoryStatus>("loading");
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  // IndexedDB read. It doesn't touch "loading" itself: the initial
  // state is already "loading", and on retry retry() sets it (an
  // event), so the mount effect doesn't call setState synchronously.
  const load = useCallback(() => {
    let cancelled = false;
    // IndexedDB is truly asynchronous (unlike the old localStorage),
    // so there's no need to fake the loading state with a setTimeout:
    // the read itself takes its time.
    loadHistory(t)
      .then((loaded) => {
        if (cancelled) return;
        setEntries(loaded);
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof HistoryStorageError ? err.message : t.history.genericLoadError,
        );
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => load(), [load]);

  const retry = useCallback(() => {
    setStatus("loading");
    setError(null);
    load();
  }, [load]);

  // Functional setState (always starts from the latest state, not from
  // "entries" captured by a closure): if addEntry is called more than
  // once in the same event before React repaints, the second call
  // doesn't overwrite the first. Same bug that slipped into useJournal
  // with the oracle's question + roll.
  const persist = useCallback(
    (updater: (prev: HistoryEntry[]) => HistoryEntry[]) => {
      setEntries((prev) => {
        const next = updater(prev);
        // Optimistic: the UI reflects the change right away, without
        // waiting for the IndexedDB save to confirm (it's fast, but still
        // an asynchronous operation).
        saveHistory(t, next).catch((err: unknown) => {
          setError(
            err instanceof HistoryStorageError ? err.message : t.history.genericSaveError,
          );
          setStatus("error");
        });
        return next;
      });
    },
    [t],
  );

  const addEntry = useCallback(
    (entry: HistoryEntry) => {
      persist((prev) => [entry, ...prev]);
    },
    [persist],
  );

  const removeEntry = useCallback(
    (id: string) => {
      persist((prev) => prev.filter((e) => e.id !== id));
    },
    [persist],
  );

  const restoreEntry = useCallback(
    (entry: HistoryEntry) => {
      persist((prev) =>
        prev.some((e) => e.id === entry.id)
          ? prev
          : [...prev, entry].sort((a, b) => b.timestamp - a.timestamp),
      );
    },
    [persist],
  );

  const toggleFavorite = useCallback(
    (id: string) => {
      persist((prev) =>
        prev.map((e) => (e.id === id ? { ...e, favorite: !e.favorite } : e)),
      );
    },
    [persist],
  );

  const clear = useCallback(() => {
    clearHistory(t)
      .then(() => {
        setEntries([]);
        setStatus("ready");
        setError(null);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof HistoryStorageError ? err.message : t.history.genericClearError,
        );
        setStatus("error");
      });
  }, [t]);

  return {
    status,
    entries,
    error,
    addEntry,
    removeEntry,
    restoreEntry,
    toggleFavorite,
    clear,
    retry,
  };
}
