import { useCallback, useEffect, useState } from "react";
import {
  clearHistory,
  HistoryStorageError,
  loadHistory,
  saveHistory,
  type HistoryEntry,
} from "../lib/history";

export type HistoryStatus = "loading" | "ready" | "error";

interface UseHistoryResult {
  status: HistoryStatus;
  entries: HistoryEntry[];
  error: string | null;
  addEntry: (entry: HistoryEntry) => void;
  removeEntry: (id: string) => void;
  toggleFavorite: (id: string) => void;
  clear: () => void;
  retry: () => void;
}

export function useHistory(): UseHistoryResult {
  const [status, setStatus] = useState<HistoryStatus>("loading");
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setStatus("loading");
    setError(null);
    // Se difiere un tick para dejar pintar el estado de carga incluso
    // aunque localStorage responda de forma síncrona.
    const timer = window.setTimeout(() => {
      try {
        const loaded = loadHistory();
        setEntries(loaded);
        setStatus("ready");
      } catch (err) {
        setError(
          err instanceof HistoryStorageError
            ? err.message
            : "No se pudo cargar el historial.",
        );
        setStatus("error");
      }
    }, 120);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => load(), [load]);

  const persist = useCallback((next: HistoryEntry[]) => {
    setEntries(next);
    try {
      saveHistory(next);
    } catch (err) {
      setError(
        err instanceof HistoryStorageError
          ? err.message
          : "No se pudo guardar el historial.",
      );
      setStatus("error");
    }
  }, []);

  const addEntry = useCallback(
    (entry: HistoryEntry) => {
      persist([entry, ...entries]);
    },
    [entries, persist],
  );

  const removeEntry = useCallback(
    (id: string) => {
      persist(entries.filter((e) => e.id !== id));
    },
    [entries, persist],
  );

  const toggleFavorite = useCallback(
    (id: string) => {
      persist(
        entries.map((e) =>
          e.id === id ? { ...e, favorite: !e.favorite } : e,
        ),
      );
    },
    [entries, persist],
  );

  const clear = useCallback(() => {
    try {
      clearHistory();
      setEntries([]);
      setStatus("ready");
      setError(null);
    } catch (err) {
      setError(
        err instanceof HistoryStorageError
          ? err.message
          : "No se pudo borrar el historial.",
      );
      setStatus("error");
    }
  }, []);

  return {
    status,
    entries,
    error,
    addEntry,
    removeEntry,
    toggleFavorite,
    clear,
    retry: load,
  };
}
