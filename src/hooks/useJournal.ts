import { useCallback, useEffect, useRef, useState } from "react";
import { saveDraft } from "../lib/drafts";
import {
  createAdventure as buildAdventure,
  createJournalEntryId,
  JournalStorageError,
  loadAdventures,
  loadJournalEntries,
  saveAdventureChanges,
  saveJournalEntryChanges,
  type Adventure,
  type AdventureStatus,
} from "../lib/journal";
import {
  isoDate,
  parseDescriptionsFromMarkdown,
  parseMarkdownToEntries,
  parseNotesFromMarkdown,
  type JournalEntry,
  type JournalLineKind,
} from "../lib/lonelog";
import { loadActiveAdventureId, saveActiveAdventureId } from "../lib/activeAdventure";
import { forgetDeletions, recordDeletions } from "../lib/deletions";
import { insertEntryAfter, moveEntryIn } from "../lib/journalOrder";
import { announceChange, onExternalChange } from "../lib/sync";
import { useLocaleContext } from "./useLocaleContext";
import { useStoredList } from "./useStoredList";

export type JournalStatus = "loading" | "ready" | "error";

/** Where new entries go instead of the end ("Write below" an entry). */
export interface InsertionPoint {
  adventureId: string;
  /** The entry they're written after; it moves on to each new one. */
  afterId: string;
}

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
  setCastDescription: (adventureId: string, key: string, text: string) => void;
  addEntry: (
    adventureId: string,
    kind: JournalLineKind,
    text: string,
    linkedRollId?: string,
  ) => void;
  removeEntry: (id: string) => void;
  /** One place up or down in the journal (across sessions too). */
  moveEntry: (id: string, direction: "up" | "down") => void;
  insertionPoint: InsertionPoint | null;
  setInsertionPoint: (point: InsertionPoint | null) => void;
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
  const [activeAdventureId, setActiveAdventureIdState] = useState<string | null>(
    () => loadActiveAdventureId(),
  );

  // Optimistic: the screen changes at once and each list saves only
  // what changed (useStoredList), then tells the app's other tabs.
  const failSave = useCallback(
    (err: unknown) => {
      setError(err instanceof JournalStorageError ? err.message : t.history.genericSaveError);
      setStatus("error");
    },
    [t],
  );
  const saveAdventures = useCallback(
    (prev: Adventure[], next: Adventure[]) =>
      saveAdventureChanges(t, prev, next).then(() => announceChange("journal")),
    [t],
  );
  const saveEntries = useCallback(
    (prev: JournalEntry[], next: JournalEntry[]) =>
      saveJournalEntryChanges(t, prev, next).then(() => announceChange("journal")),
    [t],
  );
  const {
    items: adventures,
    version: adventuresVersion,
    setLoaded: setAdventures,
    update: updateAdventures,
  } = useStoredList(saveAdventures, failSave);
  const {
    items: entries,
    latest: latestEntries,
    version: entriesVersion,
    setLoaded: setEntries,
    update: updateEntries,
  } = useStoredList(saveEntries, failSave);

  const read = useCallback(() => Promise.all([loadAdventures(t), loadJournalEntries(t)]), [t]);

  // IndexedDB read. It doesn't touch "loading" itself: the initial
  // state is already "loading", and on retry retry() sets it (an
  // event), so the mount effect doesn't call setState synchronously.
  const load = useCallback(() => {
    let cancelled = false;
    read()
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
  }, [read, setAdventures, setEntries, t]);

  useEffect(() => load(), [load]);

  // Another tab saved: read it all again. If something changed here
  // while reading, that read may have missed it, so read once more.
  useEffect(() => {
    let cancelled = false;
    function refresh() {
      const started = adventuresVersion.current + entriesVersion.current;
      read()
        .then(([loadedAdventures, loadedEntries]) => {
          if (cancelled) return;
          if (adventuresVersion.current + entriesVersion.current !== started) return refresh();
          setAdventures(loadedAdventures);
          setEntries(loadedEntries);
        })
        .catch(() => {
          // What's on screen stays; the next change elsewhere reads again.
        });
    }
    const stop = onExternalChange("journal", refresh);
    return () => {
      cancelled = true;
      stop();
    };
  }, [read, adventuresVersion, entriesVersion, setAdventures, setEntries]);

  const retry = useCallback(() => {
    setStatus("loading");
    setError(null);
    load();
  }, [load]);

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
      // Recorded so a merged backup from another device doesn't bring them back.
      recordDeletions([id, ...latestEntries.current.filter((e) => e.adventureId === id).map((e) => e.id)]);
      updateAdventures((prev) => prev.filter((a) => a.id !== id));
      updateEntries((prev) => prev.filter((e) => e.adventureId !== id));
      if (activeAdventureId === id) setActiveAdventureId(null);
      saveDraft(id, { text: "", mode: "note" });
    },
    [activeAdventureId, latestEntries, updateAdventures, updateEntries, setActiveAdventureId],
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

  // Writing below an entry: every new entry of that adventure (typed,
  // or from the oracle, tables and dice) goes there, each one after the
  // previous. Kept in a ref as well as in state because a single event
  // can log two entries (question + roll), and the second must follow
  // the first before React repaints.
  const [insertionPoint, setInsertionPointState] = useState<InsertionPoint | null>(null);
  const insertionRef = useRef<InsertionPoint | null>(null);
  const setInsertionPoint = useCallback((point: InsertionPoint | null) => {
    insertionRef.current = point;
    setInsertionPointState(point);
  }, []);

  // Like the notes: no trace, updatedAt stays as it was. An emptied
  // one is kept (blank, with its date) so a merge doesn't bring it back.
  const setCastDescription = useCallback(
    (adventureId: string, key: string, text: string) => {
      const description = { text: text.replace(/\s+$/, ""), updatedAt: Date.now() };
      updateAdventures((prev) =>
        prev.map((a) => (a.id === adventureId ? { ...a, descriptions: { ...a.descriptions, [key]: description } } : a)),
      );
    },
    [updateAdventures],
  );

  const addEntry = useCallback(
    (adventureId: string, kind: JournalLineKind, text: string, linkedRollId?: string) => {
      const now = Date.now();
      const entry: JournalEntry = {
        id: createJournalEntryId(),
        adventureId,
        timestamp: now,
        kind,
        text,
        linkedRollId,
        // The day of play, which moving the session won't change.
        ...(kind === "session" ? { date: isoDate(now) } : {}),
      };
      const point = insertionRef.current;
      if (point?.adventureId === adventureId) {
        updateEntries((prev) => insertEntryAfter(prev, entry, point.afterId, now));
        setInsertionPoint({ adventureId, afterId: entry.id });
      } else {
        updateEntries((prev) => [...prev, entry]);
      }
      updateAdventures((prev) =>
        prev.map((a) => (a.id === adventureId ? { ...a, updatedAt: now } : a)),
      );
    },
    [updateEntries, updateAdventures, setInsertionPoint],
  );

  const moveEntry = useCallback(
    (id: string, direction: "up" | "down") => {
      updateEntries((prev) => moveEntryIn(prev, id, direction, Date.now()));
    },
    [updateEntries],
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
      const descriptions = parseDescriptionsFromMarkdown(markdownText);
      const adventure: Adventure = {
        ...buildAdventure(name),
        ...(notes ? { notes } : {}),
        ...(Object.keys(descriptions).length ? { descriptions } : {}),
      };
      // One millisecond per line, ending now: dated from the adventure's
      // creation on, a long file would run into the future and what's
      // written next could land among its lines.
      const parsed = parseMarkdownToEntries(markdownText, adventure.id, adventure.createdAt);
      const imported = parsed.map((e) => ({ ...e, timestamp: e.timestamp - parsed.length }));
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
    setCastDescription,
    addEntry,
    removeEntry,
    moveEntry,
    insertionPoint,
    setInsertionPoint,
    restoreEntry,
    editEntry,
    importAdventure,
    retry,
  };
}
