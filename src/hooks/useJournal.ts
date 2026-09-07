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
  type JournalEntry,
  type JournalLineKind,
} from "../lib/lonelog";
import { loadActiveAdventureId, saveActiveAdventureId } from "../lib/activeAdventure";
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
  addEntry: (
    adventureId: string,
    kind: JournalLineKind,
    text: string,
    linkedRollId?: string,
  ) => void;
  removeEntry: (id: string) => void;
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

  const load = useCallback(() => {
    let cancelled = false;
    setStatus("loading");
    setError(null);
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

  // updateAdventures/updateEntries siempre parten del estado más
  // reciente (forma funcional de setState), no de "adventures"/
  // "entries" capturados por closure — así, si addEntry se llama dos
  // veces seguidas en el mismo evento (p. ej. pregunta + tirada), la
  // segunda no pisa a la primera antes de que React repinte.
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

  // Una aventura archivada no puede ser la activa a la vez — activarla
  // es justo la señal de que se vuelve a usar, así que la desarchiva
  // sola. "En pausa" no es un estado propio: es solo cómo se ve una
  // aventura "ongoing" que no es esta, así que no hay nada que
  // "despausar" aparte de activarla.
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
        // Por si acaso algún id no estuviera en orderedIds (no debería
        // pasar), se añaden al final para no perder ninguna aventura.
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
      updateEntries((prev) => prev.filter((e) => e.adventureId !== id));
      if (activeAdventureId === id) setActiveAdventureId(null);
    },
    [activeAdventureId, updateAdventures, updateEntries, setActiveAdventureId],
  );

  // Archivar la aventura activa la desactiva (una aventura archivada
  // no puede ser la que recibe el auto-registro).
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
    },
    [updateEntries],
  );

  const editEntry = useCallback(
    (id: string, text: string) => {
      updateEntries((prev) => prev.map((e) => (e.id === id ? { ...e, text } : e)));
    },
    [updateEntries],
  );

  const importAdventure = useCallback(
    (name: string, markdownText: string) => {
      const adventure = buildAdventure(name);
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
    addEntry,
    removeEntry,
    editEntry,
    importAdventure,
    retry: load,
  };
}
