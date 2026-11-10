import { useCallback, useEffect, useRef, useState } from "react";
import { forgetDeletions, recordDeletions } from "../lib/deletions";
import {
  createSavedRoll,
  loadSavedRolls,
  saveSavedRollChanges,
  SavedRollsStorageError,
  sortSavedRolls,
  type SavedRoll,
  type SavedRollDraft,
} from "../lib/savedRolls";
import { announceChange, onExternalChange } from "../lib/sync";
import { useLocaleContext } from "./useLocaleContext";
import { useStoredList } from "./useStoredList";

export type SavedRollsStatus = "idle" | "loading" | "ready" | "error";

/**
 * The player's saved rolls (see src/lib/savedRolls.ts). Like their
 * tables, read only once a screen with dice asks for them (`load`).
 */
export function useSavedRolls() {
  const { t } = useLocaleContext();
  const [requested, setRequested] = useState(false);
  const [status, setStatus] = useState<SavedRollsStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const failSave = useCallback(
    (err: unknown) => setError(err instanceof SavedRollsStorageError ? err.message : t.history.genericSaveError),
    [t],
  );
  const save = useCallback(
    (prev: SavedRoll[], next: SavedRoll[]) => saveSavedRollChanges(t, prev, next).then(() => announceChange("savedRolls")),
    [t],
  );
  const { items, version, setLoaded, update: updateStored } = useStoredList(save, failSave);
  // Changes before the stored rolls are in would overwrite them with an empty list.
  const readyRef = useRef(false);

  const load = useCallback(() => {
    setRequested(true);
    setStatus((prev) => (prev === "idle" ? "loading" : prev));
  }, []);

  useEffect(() => {
    if (!requested) return;
    let cancelled = false;
    loadSavedRolls(t)
      .then((loaded) => {
        if (cancelled) return;
        readyRef.current = true;
        setLoaded(loaded);
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof SavedRollsStorageError ? err.message : t.history.genericLoadError);
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [requested, setLoaded, t]);

  // Another tab changed them: read them again, if they're loaded here.
  useEffect(() => {
    if (!requested) return;
    let cancelled = false;
    function refresh() {
      if (!readyRef.current) return;
      const started = version.current;
      loadSavedRolls(t)
        .then((loaded) => {
          if (cancelled) return;
          if (version.current !== started) return refresh();
          setLoaded(loaded);
        })
        .catch(() => {
          // What's on screen stays.
        });
    }
    const stop = onExternalChange("savedRolls", refresh);
    return () => {
      cancelled = true;
      stop();
    };
  }, [requested, setLoaded, t, version]);

  const update = useCallback(
    (updater: (prev: SavedRoll[]) => SavedRoll[]) => {
      if (readyRef.current) updateStored((prev) => sortSavedRolls(updater(prev)));
    },
    [updateStored],
  );

  const addRoll = useCallback(
    (draft: SavedRollDraft, favorite = false): SavedRoll => {
      const created = { ...createSavedRoll(draft), favorite };
      update((prev) => [...prev, created]);
      return created;
    },
    [update],
  );

  const updateRoll = useCallback(
    (id: string, changes: Partial<SavedRollDraft & { favorite: boolean }>) => {
      update((prev) =>
        prev.map((x) =>
          x.id === id
            ? {
                ...x,
                ...changes,
                name: (changes.name ?? x.name).trim(),
                formula: (changes.formula ?? x.formula).trim(),
                updatedAt: Date.now(),
              }
            : x,
        ),
      );
    },
    [update],
  );

  const removeRoll = useCallback(
    (id: string) => {
      update((prev) => prev.filter((x) => x.id !== id));
      recordDeletions([id]);
    },
    [update],
  );

  /** Puts a deleted roll (Undo) back. */
  const restoreRoll = useCallback(
    (roll: SavedRoll) => {
      forgetDeletions([roll.id]);
      update((prev) => (prev.some((x) => x.id === roll.id) ? prev : [...prev, roll]));
    },
    [update],
  );

  return { status, error, rolls: items, load, addRoll, updateRoll, removeRoll, restoreRoll };
}
