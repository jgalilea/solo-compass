import { get, set } from "idb-keyval";
import type { Dictionary } from "./i18n";
import type { JournalEntry } from "./lonelog";

/**
 * "ongoing": en curso, aparece en la lista principal.
 * "paused": en pausa — solo organizativo, sigue en la lista principal
 * pero marcada, no afecta a si puede ser la aventura activa.
 * "archived": fuera de la lista principal (va en su propia sección
 * plegada), no puede ser la aventura activa — activarla la desarchiva.
 */
export type AdventureStatus = "ongoing" | "paused" | "archived";

export interface Adventure {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  favorite: boolean;
  status: AdventureStatus;
}

// Igual que el historial: sin techo natural de tamaño, así que va en
// IndexedDB en vez de localStorage (ver src/lib/history.ts para el
// razonamiento completo). Todas las aventuras y todas las entradas
// comparten una única clave cada una; se filtran por adventureId en
// memoria — con los volúmenes reales de un diario de rol, de sobra.
const ADVENTURES_KEY = "solo-compass:journal-adventures";
const ENTRIES_KEY = "solo-compass:journal-entries";

export class JournalStorageError extends Error {}

export async function loadAdventures(t: Dictionary): Promise<Adventure[]> {
  if (typeof window === "undefined") return [];
  try {
    const stored = await get<Adventure[]>(ADVENTURES_KEY);
    if (!Array.isArray(stored)) return [];
    // Compatibilidad con aventuras guardadas antes de añadir favoritos
    // y antes de añadir estado (pausa/archivo).
    return stored.map((a) => ({
      ...a,
      favorite: a.favorite ?? false,
      status: a.status ?? "ongoing",
    }));
  } catch {
    throw new JournalStorageError(t.history.storageUnavailableError);
  }
}

export async function saveAdventures(t: Dictionary, adventures: Adventure[]): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await set(ADVENTURES_KEY, adventures);
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

export function createAdventure(name: string): Adventure {
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
