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
  addEntry: (
    campaignId: string,
    kind: JournalLineKind,
    text: string,
    linkedRollId?: string,
  ) => void;
  removeEntry: (id: string) => void;
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

  const setActiveCampaignId = useCallback((id: string | null) => {
    setActiveCampaignIdState(id);
    saveActiveCampaignId(id);
  }, []);

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

  const deleteCampaign = useCallback(
    (id: string) => {
      updateCampaigns((prev) => prev.filter((c) => c.id !== id));
      updateEntries((prev) => prev.filter((e) => e.campaignId !== id));
      if (activeCampaignId === id) setActiveCampaignId(null);
    },
    [activeCampaignId, updateCampaigns, updateEntries, setActiveCampaignId],
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
    addEntry,
    removeEntry,
    importCampaign,
    retry: load,
  };
}
