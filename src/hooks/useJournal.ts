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

  const persistCampaigns = useCallback(
    (next: Campaign[]) => {
      setCampaigns(next);
      saveCampaigns(t, next).catch((err: unknown) => {
        setError(
          err instanceof JournalStorageError ? err.message : t.history.genericSaveError,
        );
        setStatus("error");
      });
    },
    [t],
  );

  const persistEntries = useCallback(
    (next: JournalEntry[]) => {
      setEntries(next);
      saveJournalEntries(t, next).catch((err: unknown) => {
        setError(
          err instanceof JournalStorageError ? err.message : t.history.genericSaveError,
        );
        setStatus("error");
      });
    },
    [t],
  );

  const createCampaignFn = useCallback(
    (name: string) => {
      const campaign = buildCampaign(name);
      persistCampaigns([campaign, ...campaigns]);
      return campaign;
    },
    [campaigns, persistCampaigns],
  );

  const renameCampaign = useCallback(
    (id: string, name: string) => {
      persistCampaigns(
        campaigns.map((c) =>
          c.id === id ? { ...c, name: name.trim(), updatedAt: Date.now() } : c,
        ),
      );
    },
    [campaigns, persistCampaigns],
  );

  const deleteCampaign = useCallback(
    (id: string) => {
      persistCampaigns(campaigns.filter((c) => c.id !== id));
      persistEntries(entries.filter((e) => e.campaignId !== id));
      if (activeCampaignId === id) setActiveCampaignId(null);
    },
    [campaigns, entries, activeCampaignId, persistCampaigns, persistEntries, setActiveCampaignId],
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
      persistEntries([...entries, entry]);
      persistCampaigns(
        campaigns.map((c) =>
          c.id === campaignId ? { ...c, updatedAt: entry.timestamp } : c,
        ),
      );
    },
    [entries, campaigns, persistEntries, persistCampaigns],
  );

  const removeEntry = useCallback(
    (id: string) => {
      persistEntries(entries.filter((e) => e.id !== id));
    },
    [entries, persistEntries],
  );

  const importCampaign = useCallback(
    (name: string, markdownText: string) => {
      const campaign = buildCampaign(name);
      const imported = parseMarkdownToEntries(markdownText, campaign.id, campaign.createdAt);
      persistCampaigns([campaign, ...campaigns]);
      persistEntries([...entries, ...imported]);
      return campaign;
    },
    [campaigns, entries, persistCampaigns, persistEntries],
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
