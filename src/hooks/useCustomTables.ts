import { useCallback, useEffect, useState } from "react";
import {
  createCustomTable,
  CustomTablesStorageError,
  loadCustomTables,
  saveCustomTables,
  type CustomTable,
  type CustomTableDraft,
} from "../lib/customTables";
import { useLocaleContext } from "./useLocaleContext";

export type CustomTablesStatus = "loading" | "ready" | "error";

/** The player's own tables (see src/lib/customTables.ts). */
export function useCustomTables() {
  const { t } = useLocaleContext();
  const [status, setStatus] = useState<CustomTablesStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [tables, setTables] = useState<CustomTable[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadCustomTables(t)
      .then((loaded) => {
        if (cancelled) return;
        setTables(loaded);
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof CustomTablesStorageError ? err.message : t.history.genericLoadError);
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  // Functional setState, as in useJournal: several changes in the same
  // event (e.g. importing a file with many tables) don't overwrite each other.
  const update = useCallback(
    (updater: (prev: CustomTable[]) => CustomTable[]) => {
      setTables((prev) => {
        const next = updater(prev);
        saveCustomTables(t, next).catch((err: unknown) => {
          setError(err instanceof CustomTablesStorageError ? err.message : t.history.genericSaveError);
        });
        return next;
      });
    },
    [t],
  );

  const addTables = useCallback(
    (drafts: CustomTableDraft[]): CustomTable[] => {
      const created = drafts.map(createCustomTable);
      update((prev) => [...prev, ...created]);
      return created;
    },
    [update],
  );

  const updateTable = useCallback(
    (id: string, draft: CustomTableDraft) => {
      update((prev) => prev.map((x) => (x.id === id ? { ...x, ...draft, updatedAt: Date.now() } : x)));
    },
    [update],
  );

  const removeTable = useCallback(
    (id: string) => {
      update((prev) => prev.filter((x) => x.id !== id));
    },
    [update],
  );

  /** Puts a deleted table (Undo) back where it was. */
  const restoreTable = useCallback(
    (table: CustomTable, index: number) => {
      update((prev) => {
        if (prev.some((x) => x.id === table.id)) return prev;
        const next = [...prev];
        next.splice(Math.min(index, next.length), 0, table);
        return next;
      });
    },
    [update],
  );

  return { status, error, tables, addTables, updateTable, removeTable, restoreTable };
}
