import { useCallback, useEffect, useRef, useState } from "react";
import { forgetDeletions, recordDeletions } from "../lib/deletions";
import {
  createCustomTable,
  CustomTablesStorageError,
  loadCustomTables,
  saveCustomTableChanges,
  type CustomTable,
  type CustomTableDraft,
} from "../lib/customTables";
import { announceChange, onExternalChange } from "../lib/sync";
import { useLocaleContext } from "./useLocaleContext";
import { useStoredList } from "./useStoredList";

export type CustomTablesStatus = "idle" | "loading" | "ready" | "error";

/**
 * The player's own tables (see src/lib/customTables.ts). Like the
 * built-in games, they aren't read at start-up: only once a screen that
 * shows tables asks for them (`load`).
 */
export function useCustomTables() {
  const { t } = useLocaleContext();
  const [requested, setRequested] = useState(false);
  const [status, setStatus] = useState<CustomTablesStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const failSave = useCallback(
    (err: unknown) => setError(err instanceof CustomTablesStorageError ? err.message : t.history.genericSaveError),
    [t],
  );
  const save = useCallback(
    (prev: CustomTable[], next: CustomTable[]) =>
      saveCustomTableChanges(t, prev, next).then(() => announceChange("customTables")),
    [t],
  );
  const { items: tables, version, setLoaded: setTables, update: updateStored } = useStoredList(save, failSave);
  // Changes before the stored tables are in would overwrite them with an empty list.
  const readyRef = useRef(false);

  const load = useCallback(() => {
    setRequested(true);
    setStatus((prev) => (prev === "idle" ? "loading" : prev));
  }, []);

  useEffect(() => {
    if (!requested) return;
    let cancelled = false;
    loadCustomTables(t)
      .then((loaded) => {
        if (cancelled) return;
        readyRef.current = true;
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
  }, [requested, setTables, t]);

  // Another tab changed them: read them again, if they're loaded here.
  useEffect(() => {
    if (!requested) return;
    let cancelled = false;
    function refresh() {
      if (!readyRef.current) return;
      const started = version.current;
      loadCustomTables(t)
        .then((loaded) => {
          if (cancelled) return;
          if (version.current !== started) return refresh();
          setTables(loaded);
        })
        .catch(() => {
          // What's on screen stays.
        });
    }
    const stop = onExternalChange("customTables", refresh);
    return () => {
      cancelled = true;
      stop();
    };
  }, [requested, setTables, t, version]);

  // As in useJournal: several changes in the same event (importing a
  // file with many tables) build on each other.
  const update = useCallback(
    (updater: (prev: CustomTable[]) => CustomTable[]) => {
      if (readyRef.current) updateStored(updater);
    },
    [updateStored],
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
      recordDeletions([id]);
    },
    [update],
  );

  /** Puts a deleted table (Undo) back where it was. */
  const restoreTable = useCallback(
    (table: CustomTable, index: number) => {
      forgetDeletions([table.id]);
      update((prev) => {
        if (prev.some((x) => x.id === table.id)) return prev;
        const next = [...prev];
        next.splice(Math.min(index, next.length), 0, table);
        return next;
      });
    },
    [update],
  );

  return { status, error, tables, load, addTables, updateTable, removeTable, restoreTable };
}
