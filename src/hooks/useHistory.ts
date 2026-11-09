import { useCallback, useEffect, useState } from "react";
import { forgetDeletions, recordDeletions } from "../lib/deletions";
import {
  clearHistory,
  HistoryStorageError,
  loadHistory,
  saveHistoryChanges,
  type HistoryEntry,
} from "../lib/history";
import { announceChange, onExternalChange } from "../lib/sync";
import { useLocaleContext } from "./useLocaleContext";
import { useStoredList } from "./useStoredList";

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
  const [error, setError] = useState<string | null>(null);

  // Optimistic, as in useJournal: shown at once, saved roll by roll
  // (only what changed), then the app's other tabs are told.
  const failSave = useCallback(
    (err: unknown) => {
      setError(err instanceof HistoryStorageError ? err.message : t.history.genericSaveError);
      setStatus("error");
    },
    [t],
  );
  const save = useCallback(
    (prev: HistoryEntry[], next: HistoryEntry[]) =>
      saveHistoryChanges(t, prev, next).then(() => announceChange("history")),
    [t],
  );
  const { items: entries, latest, version, setLoaded: setEntries, update: persist } = useStoredList(save, failSave);

  // IndexedDB read. It doesn't touch "loading" itself: the initial
  // state is already "loading", and on retry retry() sets it (an
  // event), so the mount effect doesn't call setState synchronously.
  const load = useCallback(() => {
    let cancelled = false;
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
  }, [setEntries, t]);

  useEffect(() => load(), [load]);

  // Another tab rolled or deleted: read it again (once more if
  // something changed here meanwhile).
  useEffect(() => {
    let cancelled = false;
    function refresh() {
      const started = version.current;
      loadHistory(t)
        .then((loaded) => {
          if (cancelled) return;
          if (version.current !== started) return refresh();
          setEntries(loaded);
        })
        .catch(() => {
          // What's on screen stays.
        });
    }
    const stop = onExternalChange("history", refresh);
    return () => {
      cancelled = true;
      stop();
    };
  }, [setEntries, t, version]);

  const retry = useCallback(() => {
    setStatus("loading");
    setError(null);
    load();
  }, [load]);

  const addEntry = useCallback(
    (entry: HistoryEntry) => {
      persist((prev) => [entry, ...prev]);
    },
    [persist],
  );

  const removeEntry = useCallback(
    (id: string) => {
      persist((prev) => prev.filter((e) => e.id !== id));
      recordDeletions([id]);
    },
    [persist],
  );

  const restoreEntry = useCallback(
    (entry: HistoryEntry) => {
      forgetDeletions([entry.id]);
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
    // So a merged backup from another device doesn't bring them back.
    recordDeletions(latest.current.map((e) => e.id));
    clearHistory(t)
      .then(() => {
        setEntries([]);
        announceChange("history");
        setStatus("ready");
        setError(null);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof HistoryStorageError ? err.message : t.history.genericClearError,
        );
        setStatus("error");
      });
  }, [t, latest, setEntries]);

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
