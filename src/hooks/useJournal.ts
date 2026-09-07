import { useCallback, useEffect, useState } from "react";
import {
  createCampaign as buildCampaign,
  createJournalEntryId,
  JournalStorageError,
  loadCampaigns,
  loadJournalEntries,
  saveCampaigns,
  saveJournalEntries,
  type Campaign,
  type CampaignStatus,
} from "../lib/journal";
import {
  parseMarkdownToEntries,
  type JournalEntry,
  type JournalLineKind,
} from "../lib/lonelog";
import { loadActiveCampaignId, saveActiveCampaignId } from "../lib/activeCampaign";
import { useLocaleContext } from "./useLocaleContext";

export type JournalStatus = "loading" | "ready" | "error";

interface UseJournalResult {
  status: JournalStatus;
  error: string | null;
  campaigns: Campaign[];
  entries: JournalEntry[];
  activeCampaignId: string | null;
  setActiveCampaignId: (id: string | null) => void;
  createCampaign: (name: string) => Campaign;
  renameCampaign: (id: string, name: string) => void;
  deleteCampaign: (id: string) => void;
  reorderCampaigns: (orderedIds: string[]) => void;
  toggleCampaignFavorite: (id: string) => void;
  setCampaignStatus: (id: string, status: CampaignStatus) => void;
  addEntry: (
    campaignId: string,
    kind: JournalLineKind,
    text: string,
    linkedRollId?: string,
  ) => void;
  removeEntry: (id: string) => void;
  editEntry: (id: string, text: string) => void;
  importCampaign: (name: string, markdownText: string) => Campaign;
  retry: () => void;
}

export function useJournal(): UseJournalResult {
  const { t } = useLocaleContext();
  const [status, setStatus] = useState<JournalStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [activeCampaignId, setActiveCampaignIdState] = useState<string | null>(
    () => loadActiveCampaignId(),
  );

  const load = useCallback(() => {
    let cancelled = false;
    setStatus("loading");
    setError(null);
    Promise.all([loadCampaigns(t), loadJournalEntries(t)])
      .then(([loadedCampaigns, loadedEntries]) => {
        if (cancelled) return;
        setCampaigns(loadedCampaigns);
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

  // updateCampaigns/updateEntries siempre parten del estado más
  // reciente (forma funcional de setState), no de "campaigns"/
  // "entries" capturados por closure — así, si addEntry se llama dos
  // veces seguidas en el mismo evento (p. ej. pregunta + tirada), la
  // segunda no pisa a la primera antes de que React repinte.
  const updateCampaigns = useCallback(
    (updater: (prev: Campaign[]) => Campaign[]) => {
      setCampaigns((prev) => {
        const next = updater(prev);
        saveCampaigns(t, next).catch((err: unknown) => {
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

  // Una campaña pausada o archivada no puede ser la activa a la vez —
  // no tiene sentido registrar solo en algo "en pausa". Activarla es
  // justo la señal de que se vuelve a usar, así que la reanuda sola.
  const setActiveCampaignId = useCallback(
    (id: string | null) => {
      setActiveCampaignIdState(id);
      saveActiveCampaignId(id);
      if (id) {
        updateCampaigns((prev) =>
          prev.map((c) =>
            c.id === id && c.status !== "ongoing" ? { ...c, status: "ongoing" } : c,
          ),
        );
      }
    },
    [updateCampaigns],
  );

  const createCampaignFn = useCallback(
    (name: string) => {
      const campaign = buildCampaign(name);
      updateCampaigns((prev) => [campaign, ...prev]);
      return campaign;
    },
    [updateCampaigns],
  );

  const renameCampaign = useCallback(
    (id: string, name: string) => {
      updateCampaigns((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, name: name.trim(), updatedAt: Date.now() } : c,
        ),
      );
    },
    [updateCampaigns],
  );

  const reorderCampaigns = useCallback(
    (orderedIds: string[]) => {
      updateCampaigns((prev) => {
        const byId = new Map(prev.map((c) => [c.id, c]));
        const reordered = orderedIds.map((id) => byId.get(id)).filter((c): c is Campaign => !!c);
        // Por si acaso algún id no estuviera en orderedIds (no debería
        // pasar), se añaden al final para no perder ninguna campaña.
        const missing = prev.filter((c) => !orderedIds.includes(c.id));
        return [...reordered, ...missing];
      });
    },
    [updateCampaigns],
  );

  const toggleCampaignFavorite = useCallback(
    (id: string) => {
      updateCampaigns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, favorite: !c.favorite } : c)),
      );
    },
    [updateCampaigns],
  );

  const deleteCampaign = useCallback(
    (id: string) => {
      updateCampaigns((prev) => prev.filter((c) => c.id !== id));
      updateEntries((prev) => prev.filter((e) => e.campaignId !== id));
      if (activeCampaignId === id) setActiveCampaignId(null);
    },
    [activeCampaignId, updateCampaigns, updateEntries, setActiveCampaignId],
  );

  // Pausar o archivar la campaña activa la desactiva (una campaña que
  // no está en curso no puede ser la que recibe el auto-registro).
  const setCampaignStatus = useCallback(
    (id: string, status: CampaignStatus) => {
      updateCampaigns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status, updatedAt: Date.now() } : c)),
      );
      if (status !== "ongoing" && activeCampaignId === id) {
        setActiveCampaignId(null);
      }
    },
    [activeCampaignId, updateCampaigns, setActiveCampaignId],
  );

  const addEntry = useCallback(
    (campaignId: string, kind: JournalLineKind, text: string, linkedRollId?: string) => {
      const entry: JournalEntry = {
        id: createJournalEntryId(),
        campaignId,
        timestamp: Date.now(),
        kind,
        text,
        linkedRollId,
      };
      updateEntries((prev) => [...prev, entry]);
      updateCampaigns((prev) =>
        prev.map((c) => (c.id === campaignId ? { ...c, updatedAt: entry.timestamp } : c)),
      );
    },
    [updateEntries, updateCampaigns],
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

  const importCampaign = useCallback(
    (name: string, markdownText: string) => {
      const campaign = buildCampaign(name);
      const imported = parseMarkdownToEntries(markdownText, campaign.id, campaign.createdAt);
      updateCampaigns((prev) => [campaign, ...prev]);
      updateEntries((prev) => [...prev, ...imported]);
      return campaign;
    },
    [updateCampaigns, updateEntries],
  );

  return {
    status,
    error,
    campaigns,
    entries,
    activeCampaignId,
    setActiveCampaignId,
    createCampaign: createCampaignFn,
    renameCampaign,
    deleteCampaign,
    reorderCampaigns,
    toggleCampaignFavorite,
    setCampaignStatus,
    addEntry,
    removeEntry,
    editEntry,
    importCampaign,
    retry: load,
  };
}
