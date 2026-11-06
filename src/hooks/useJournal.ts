import { useCallback, useEffect, useState } from "react";
import {
  createAdventure as buildAdventure,
  createJournalEntryId,
  JournalStorageError,
  loadAdventures,
  loadJournalEntries,
  saveAdventures,
  saveJournalEntries,
  type Adventure,
  type AdventureStatus,
} from "../lib/journal";
import {
  parseMarkdownToEntries,
  parseNotesFromMarkdown,
  type JournalEntry,
  type JournalLineKind,
} from "../lib/lonelog";
import { loadActiveAdventureId, saveActiveAdventureId } from "../lib/activeAdventure";
import { forgetDeletions, recordDeletions } from "../lib/deletions";
import { useLocaleContext } from "./useLocaleContext";

export type JournalStatus = "loading" | "ready" | "error";

interface UseJournalResult {
  status: JournalStatus;
  error: string | null;
  adventures: Adventure[];
  entries: JournalEntry[];
  activeAdventureId: string | null;
  setActiveAdventureId: (id: string | null) => void;
  createAdventure: (name: string) => Adventure;
  renameAdventure: (id: string, name: string) => void;
  deleteAdventure: (id: string) => void;
  reorderAdventures: (orderedIds: string[]) => void;
  toggleAdventureFavorite: (id: string) => void;
  setAdventureStatus: (id: string, status: AdventureStatus) => void;
  setAdventureNotes: (id: string, notes: string) => void;
  addEntry: (
    adventureId: string,
    kind: JournalLineKind,
    text: string,
    linkedRollId?: string,
  ) => void;
  removeEntry: (id: string) => void;
  /** Puts a deleted entry (Undo) back, with its original id and date. */
  restoreEntry: (entry: JournalEntry) => void;
  editEntry: (id: string, text: string) => void;
  importAdventure: (name: string, markdownText: string) => Adventure;
  retry: () => void;
}

export function useJournal(): UseJournalResult {
  const { t } = useLocaleContext();
  const [status, setStatus] = useState<JournalStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [adventures, setAdventures] = useState<Adventure[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [activeAdventureId, setActiveAdventureIdState] = useState<string | null>(
    () => loadActiveAdventureId(),
  );

  // IndexedDB read. It doesn't touch "loading" itself: the initial
  // state is already "loading", and on retry retry() sets it (an
  // event), so the mount effect doesn't call setState synchronously.
  const load = useCallback(() => {
    let cancelled = false;
    Promise.all([loadAdventures(t), loadJournalEntries(t)])
      .then(([loadedAdventures, loadedEntries]) => {
        if (cancelled) return;
        setAdventures(loadedAdventures);
        setEntries(loadedEntries);
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof JournalStorageError ? err.message : t.history.genericLoadError,
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

  // updateAdventures/updateEntries always start from the latest state
  // (functional setState), not from "adventures"/"entries" captured by
  // a closure — so if addEntry is called twice in a row in the same
  // event (e.g. question + roll), the second doesn't overwrite the
  // first before React repaints.
  const updateAdventures = useCallback(
    (updater: (prev: Adventure[]) => Adventure[]) => {
      setAdventures((prev) => {
        const next = updater(prev);
        saveAdventures(t, next).catch((err: unknown) => {
          setError(
            err instanceof JournalStorageError ? err.message : t.history.genericSaveError,
          );
          setStatus("error");
        });
        return next;
      });
    },
    [t],
  );

  const updateEntries = useCallback(
    (updater: (prev: JournalEntry[]) => JournalEntry[]) => {
      setEntries((prev) => {
        const next = updater(prev);
        saveJournalEntries(t, next).catch((err: unknown) => {
          setError(
            err instanceof JournalStorageError ? err.message : t.history.genericSaveError,
          );
          setStatus("error");
        });
        return next;
      });
    },
    [t],
  );

  // An archived adventure can't be the active one at the same time —
  // activating it is exactly the sign it's in use again, so it gets
  // unarchived automatically. "Paused" isn't a state of its own: it's
  // just how an "ongoing" adventure other than this one looks, so
  // there's nothing to "unpause" apart from activating it.
  const setActiveAdventureId = useCallback(
    (id: string | null) => {
      setActiveAdventureIdState(id);
      saveActiveAdventureId(id);
      if (id) {
        updateAdventures((prev) =>
          prev.map((a) => (a.id === id && a.status === "archived" ? { ...a, status: "ongoing" } : a)),
        );
      }
    },
    [updateAdventures],
  );

  const createAdventureFn = useCallback(
    (name: string) => {
      const adventure = buildAdventure(name);
      updateAdventures((prev) => [adventure, ...prev]);
      return adventure;
    },
    [updateAdventures],
  );

  const renameAdventure = useCallback(
    (id: string, name: string) => {
      updateAdventures((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, name: name.trim(), updatedAt: Date.now() } : a,
        ),
      );
    },
    [updateAdventures],
  );

  const reorderAdventures = useCallback(
    (orderedIds: string[]) => {
      updateAdventures((prev) => {
        const byId = new Map(prev.map((a) => [a.id, a]));
        const reordered = orderedIds.map((id) => byId.get(id)).filter((a): a is Adventure => !!a);
        // Just in case some id isn't in orderedIds (it shouldn't happen),
        // they're appended at the end so no adventure is lost.
        const missing = prev.filter((a) => !orderedIds.includes(a.id));
        return [...reordered, ...missing];
      });
    },
    [updateAdventures],
  );

  const toggleAdventureFavorite = useCallback(
    (id: string) => {
      updateAdventures((prev) =>
        prev.map((a) => (a.id === id ? { ...a, favorite: !a.favorite } : a)),
      );
    },
    [updateAdventures],
  );

  const deleteAdventure = useCallback(
    (id: string) => {
      updateAdventures((prev) => prev.filter((a) => a.id !== id));
      updateEntries((prev) => {
        // Recorded so a merged backup from another device doesn't bring them back.
        recordDeletions([id, ...prev.filter((e) => e.adventureId === id).map((e) => e.id)]);
        return prev.filter((e) => e.adventureId !== id);
      });
      if (activeAdventureId === id) setActiveAdventureId(null);
    },
    [activeAdventureId, updateAdventures, updateEntries, setActiveAdventureId],
  );

  // Archiving the active adventure deactivates it (an archived
  // adventure can't be the one receiving auto-logging).
  const setAdventureStatus = useCallback(
    (id: string, status: AdventureStatus) => {
      updateAdventures((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status, updatedAt: Date.now() } : a)),
      );
      if (status === "archived" && activeAdventureId === id) {
        setActiveAdventureId(null);
      }
    },
    [activeAdventureId, updateAdventures, setActiveAdventureId],
  );

  // Not a journal event: editing the notes leaves no trace (updatedAt
  // stays as it was, so the adventure doesn't jump in the list).
  const setAdventureNotes = useCallback(
    (id: string, notes: string) => {
      updateAdventures((prev) => prev.map((a) => (a.id === id ? { ...a, notes, notesUpdatedAt: Date.now() } : a)));
    },
    [updateAdventures],
  );

  const addEntry = useCallback(
    (adventureId: string, kind: JournalLineKind, text: string, linkedRollId?: string) => {
      const entry: JournalEntry = {
        id: createJournalEntryId(),
        adventureId,
        timestamp: Date.now(),
        kind,
        text,
        linkedRollId,
      };
      updateEntries((prev) => [...prev, entry]);
      updateAdventures((prev) =>
        prev.map((a) => (a.id === adventureId ? { ...a, updatedAt: entry.timestamp } : a)),
      );
    },
    [updateEntries, updateAdventures],
  );

  const removeEntry = useCallback(
    (id: string) => {
      updateEntries((prev) => prev.filter((e) => e.id !== id));
      recordDeletions([id]);
    },
    [updateEntries],
  );

  const restoreEntry = useCallback(
    (entry: JournalEntry) => {
      forgetDeletions([entry.id]);
      updateEntries((prev) => (prev.some((e) => e.id === entry.id) ? prev : [...prev, entry]));
    },
    [updateEntries],
  );

  const editEntry = useCallback(
    (id: string, text: string) => {
      updateEntries((prev) => prev.map((e) => (e.id === id ? { ...e, text, editedAt: Date.now() } : e)));
    },
    [updateEntries],
  );

  const importAdventure = useCallback(
    (name: string, markdownText: string) => {
      const notes = parseNotesFromMarkdown(markdownText);
      const adventure = { ...buildAdventure(name), ...(notes ? { notes } : {}) };
      const imported = parseMarkdownToEntries(markdownText, adventure.id, adventure.createdAt);
      updateAdventures((prev) => [adventure, ...prev]);
      updateEntries((prev) => [...prev, ...imported]);
      return adventure;
    },
    [updateAdventures, updateEntries],
  );

  return {
    status,
    error,
    adventures,
    entries,
    activeAdventureId,
    setActiveAdventureId,
    createAdventure: createAdventureFn,
    renameAdventure,
    deleteAdventure,
    reorderAdventures,
    toggleAdventureFavorite,
    setAdventureStatus,
    setAdventureNotes,
    addEntry,
    removeEntry,
    restoreEntry,
    editEntry,
    importAdventure,
    retry,
  };
}
