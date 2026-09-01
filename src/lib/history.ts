import type { OracleRoll } from "./oracle";

export interface TableRollEntry {
  kind: "tabla";
  id: string;
  timestamp: number;
  tableId: string;
  tableName: string;
  rolls: number[];
  total: number;
  resultText: string;
}

export type HistoryEntry = OracleRoll | TableRollEntry;

const STORAGE_KEY = "solo-compass:history";
const STORAGE_VERSION = 1;

interface StoredPayload {
  version: number;
  entries: HistoryEntry[];
}

export class HistoryStorageError extends Error {}

function isBrowserStorageAvailable(): boolean {
  try {
    const testKey = "solo-compass:__test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  if (!isBrowserStorageAvailable()) {
    throw new HistoryStorageError(
      "El almacenamiento local no está disponible en este navegador.",
    );
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as StoredPayload | HistoryEntry[];
    // Compatibilidad hacia atrás por si el formato cambia en el futuro.
    const entries = Array.isArray(parsed) ? parsed : parsed.entries;
    if (!Array.isArray(entries)) {
      throw new Error("Formato inesperado");
    }
    return entries;
  } catch {
    throw new HistoryStorageError(
      "El historial guardado está dañado y no se pudo leer.",
    );
  }
}

export function saveHistory(entries: HistoryEntry[]): void {
  if (typeof window === "undefined") return;
  const payload: StoredPayload = { version: STORAGE_VERSION, entries };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    throw new HistoryStorageError(
      "No se pudo guardar el historial (¿almacenamiento lleno o bloqueado?).",
    );
  }
}

export function clearHistory(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    throw new HistoryStorageError("No se pudo borrar el historial.");
  }
}
