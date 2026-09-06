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
  toggleFavorite: (id: string) => void;
  clear: () => void;
  retry: () => void;
}

export function useHistory(): UseHistoryResult {
  const { t } = useLocaleContext();
  const [status, setStatus] = useState<HistoryStatus>("loading");
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    setStatus("loading");
    setError(null);
    // IndexedDB es asíncrono de verdad (a diferencia del localStorage
    // de antes), así que ya no hace falta simular el estado de carga
    // con un setTimeout: la propia lectura tarda lo suyo.
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

  // Forma funcional de setState (parte siempre del estado más
  // reciente, no de "entries" capturado por closure): si addEntry se
  // llama más de una vez en el mismo evento antes de que React
  // repinte, la segunda llamada no pisa a la primera. Mismo bug que
  // se coló en useJournal con la pregunta + tirada del oráculo.
  const persist = useCallback(
    (updater: (prev: HistoryEntry[]) => HistoryEntry[]) => {
      setEntries((prev) => {
        const next = updater(prev);
        // Optimista: la UI refleja el cambio ya, sin esperar a que el
        // guardado en IndexedDB confirme (es rápido, pero sigue
        // siendo una operación asíncrona).
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
    toggleFavorite,
    clear,
    retry: load,
  };
}
