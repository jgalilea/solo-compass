import { get, set, del } from "idb-keyval";
import type { OracleRoll } from "./oracle";
import type { Dictionary } from "./i18n";

export interface TableRollEntry {
  kind: "tabla";
  id: string;
  timestamp: number;
  tableId: string;
  tableName: string;
  rolls: number[];
  total: number;
  resultText: string;
  favorite: boolean;
}

export type HistoryEntry = OracleRoll | TableRollEntry;

// Se guarda en IndexedDB (vía idb-keyval) en vez de localStorage: el
// historial no tiene techo natural de tamaño y localStorage está
// limitado a ~5 MiB por origen, compartidos además con cualquier otra
// app en el mismo dominio. IndexedDB da órdenes de magnitud más
// espacio y es igual de gratuito/sin dependencias de servidor.
const IDB_KEY = "solo-compass:history";
const LEGACY_LOCALSTORAGE_KEY = "solo-compass:history";

interface LegacyStoredPayload {
  version: number;
  entries: HistoryEntry[];
}

export class HistoryStorageError extends Error {}

/**
 * Si ya hay historial guardado en localStorage de antes de pasar a
 * IndexedDB, lo migra una vez y limpia la clave antigua (para
 * recuperar ese espacio del cupo compartido). Si algo falla aquí no
 * se propaga como error: como mucho, el historial antiguo se pierde,
 * pero no debe impedir que la app siga funcionando con IndexedDB.
 */
function migrateFromLocalStorage(): HistoryEntry[] | null {
  try {
    const raw = window.localStorage.getItem(LEGACY_LOCALSTORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LegacyStoredPayload | HistoryEntry[];
    const entries = Array.isArray(parsed) ? parsed : parsed.entries;
    if (!Array.isArray(entries)) return null;
    const normalized = entries.map((e) => ({ ...e, favorite: e.favorite ?? false }));
    window.localStorage.removeItem(LEGACY_LOCALSTORAGE_KEY);
    return normalized;
  } catch {
    return null;
  }
}

export async function loadHistory(t: Dictionary): Promise<HistoryEntry[]> {
  if (typeof window === "undefined") return [];

  let stored: HistoryEntry[] | undefined;
  try {
    stored = await get<HistoryEntry[]>(IDB_KEY);
  } catch {
    throw new HistoryStorageError(t.history.storageUnavailableError);
  }

  if (stored) {
    if (!Array.isArray(stored)) {
      throw new HistoryStorageError(t.history.storageCorruptedError);
    }
    // Compatibilidad con historiales guardados antes de añadir favoritos.
    return stored.map((e) => ({ ...e, favorite: e.favorite ?? false }));
  }

  const migrated = migrateFromLocalStorage();
  if (migrated) {
    try {
      await set(IDB_KEY, migrated);
    } catch {
      // No se pudo persistir la migración todavía, pero se devuelven
      // los datos igualmente para no perderlos de la sesión actual.
    }
    return migrated;
  }

  return [];
}

export async function saveHistory(t: Dictionary, entries: HistoryEntry[]): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await set(IDB_KEY, entries);
  } catch {
    throw new HistoryStorageError(t.history.storageSaveError);
  }
}

export async function clearHistory(t: Dictionary): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await del(IDB_KEY);
  } catch {
    throw new HistoryStorageError(t.history.storageClearError);
  }
}
