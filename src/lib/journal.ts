import { get, set } from "idb-keyval";
import type { Dictionary } from "./i18n";
import type { JournalEntry } from "./lonelog";

/**
 * "ongoing": en curso, aparece en la lista principal.
 * "paused": en pausa — solo organizativo, sigue en la lista principal
 * pero marcada, no afecta a si puede ser la campaña activa.
 * "archived": fuera de la lista principal (va en su propia sección
 * plegada), no puede ser la campaña activa — activarla la desarchiva.
 */
export type CampaignStatus = "ongoing" | "paused" | "archived";

export interface Campaign {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  favorite: boolean;
  status: CampaignStatus;
}

// Igual que el historial: sin techo natural de tamaño, así que va en
// IndexedDB en vez de localStorage (ver src/lib/history.ts para el
// razonamiento completo). Todas las campañas y todas las entradas
// comparten una única clave cada una; se filtran por campaignId en
// memoria — con los volúmenes reales de un diario de rol, de sobra.
const CAMPAIGNS_KEY = "solo-compass:journal-campaigns";
const ENTRIES_KEY = "solo-compass:journal-entries";

export class JournalStorageError extends Error {}

export async function loadCampaigns(t: Dictionary): Promise<Campaign[]> {
  if (typeof window === "undefined") return [];
  try {
    const stored = await get<Campaign[]>(CAMPAIGNS_KEY);
    if (!Array.isArray(stored)) return [];
    // Compatibilidad con campañas guardadas antes de añadir favoritos
    // y antes de añadir estado (pausa/archivo).
    return stored.map((c) => ({
      ...c,
      favorite: c.favorite ?? false,
      status: c.status ?? "ongoing",
    }));
  } catch {
    throw new JournalStorageError(t.history.storageUnavailableError);
  }
}

export async function saveCampaigns(t: Dictionary, campaigns: Campaign[]): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await set(CAMPAIGNS_KEY, campaigns);
  } catch {
    throw new JournalStorageError(t.history.storageSaveError);
  }
}

export async function loadJournalEntries(t: Dictionary): Promise<JournalEntry[]> {
  if (typeof window === "undefined") return [];
  try {
    const stored = await get<JournalEntry[]>(ENTRIES_KEY);
    return Array.isArray(stored) ? stored : [];
  } catch {
    throw new JournalStorageError(t.history.storageUnavailableError);
  }
}

export async function saveJournalEntries(t: Dictionary, entries: JournalEntry[]): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await set(ENTRIES_KEY, entries);
  } catch {
    throw new JournalStorageError(t.history.storageSaveError);
  }
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createCampaign(name: string): Campaign {
  const now = Date.now();
  return {
    id: makeId(),
    name: name.trim(),
    createdAt: now,
    updatedAt: now,
    favorite: false,
    status: "ongoing",
  };
}

export function createJournalEntryId(): string {
  return makeId();
}
