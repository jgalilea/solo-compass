/**
 * Copia de seguridad completa de la app: historial + diario (todas
 * las campañas y entradas) + ajustes, en un único .json — para no
 * depender solo del almacenamiento del navegador (ver "Almacenamiento"
 * en el README: todo vive en IndexedDB/localStorage de este
 * dispositivo, sin servidor ni sincronización).
 *
 * Se construye encima de las funciones load/save de cada módulo
 * (history.ts, journal.ts, theme.ts, mode.ts, i18n, oracles.ts,
 * tableFavorites.ts, activeCampaign.ts) en vez de leer/escribir las
 * claves de almacenamiento a mano aquí — así no se duplica ninguna
 * lógica de validación/migración que esos módulos ya resuelven.
 */

import { loadHistory, saveHistory, type HistoryEntry } from "./history";
import { loadCampaigns, saveCampaigns, loadJournalEntries, saveJournalEntries, type Campaign } from "./journal";
import type { JournalEntry } from "./lonelog";
import { loadTheme, saveTheme, isThemeId } from "./theme";
import { loadMode, saveMode, isThemeMode } from "./mode";
import { loadLocale, saveLocale, isLocale, type Dictionary } from "./i18n";
import { loadOracleId, saveOracleId } from "./oracles";
import { loadFavoriteTableIds, saveFavoriteTableIds } from "./tableFavorites";
import { loadActiveCampaignId, saveActiveCampaignId } from "./activeCampaign";

export const BACKUP_SCHEMA_VERSION = 1;

export interface BackupPayload {
  app: "solo-compass";
  schemaVersion: number;
  exportedAt: string;
  history: HistoryEntry[];
  journal: {
    campaigns: Campaign[];
    entries: JournalEntry[];
  };
  settings: {
    theme: string;
    mode: string;
    locale: string;
    oracleId: string;
    activeCampaignId: string | null;
    favoriteTableIds: string[];
  };
}

export class BackupError extends Error {}

export async function buildBackup(t: Dictionary): Promise<BackupPayload> {
  const [history, campaigns, entries] = await Promise.all([
    loadHistory(t),
    loadCampaigns(t),
    loadJournalEntries(t),
  ]);
  return {
    app: "solo-compass",
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    history,
    journal: { campaigns, entries },
    settings: {
      theme: loadTheme(),
      mode: loadMode(),
      locale: loadLocale(),
      oracleId: loadOracleId(),
      activeCampaignId: loadActiveCampaignId(),
      favoriteTableIds: [...loadFavoriteTableIds()],
    },
  };
}

/** Solo valida la forma mínima imprescindible para no reventar al
 * restaurar — los ajustes son deliberadamente laxos (best-effort). */
function isBackupPayload(value: unknown): value is BackupPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v.app !== "solo-compass" || typeof v.schemaVersion !== "number") return false;
  if (!Array.isArray(v.history)) return false;
  const journal = v.journal as Record<string, unknown> | undefined;
  if (!journal || !Array.isArray(journal.campaigns) || !Array.isArray(journal.entries)) {
    return false;
  }
  return true;
}

/**
 * Restaura una copia de seguridad: sustituye por completo el
 * historial y el diario actuales de este dispositivo (no los
 * combina — ver el aviso de confirmación en la interfaz). Los
 * ajustes se restauran uno a uno y en silencio si alguno no es
 * válido, para no bloquear el resto por un solo campo suelto.
 */
export async function restoreBackup(t: Dictionary, text: string): Promise<void> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BackupError(t.about.importAllError);
  }
  if (!isBackupPayload(parsed)) {
    throw new BackupError(t.about.importAllError);
  }

  await Promise.all([
    saveHistory(t, parsed.history),
    saveCampaigns(t, parsed.journal.campaigns),
    saveJournalEntries(t, parsed.journal.entries),
  ]);

  const s = parsed.settings as unknown as Record<string, unknown> | undefined;
  if (s) {
    if (typeof s.theme === "string" && isThemeId(s.theme)) saveTheme(s.theme);
    if (typeof s.mode === "string" && isThemeMode(s.mode)) saveMode(s.mode);
    if (typeof s.locale === "string" && isLocale(s.locale)) saveLocale(s.locale);
    if (typeof s.oracleId === "string") saveOracleId(s.oracleId);
    if (typeof s.activeCampaignId === "string" || s.activeCampaignId === null) {
      saveActiveCampaignId((s.activeCampaignId as string | null) ?? null);
    }
    if (Array.isArray(s.favoriteTableIds)) {
      saveFavoriteTableIds(new Set(s.favoriteTableIds.filter((id): id is string => typeof id === "string")));
    }
  }
}

export function backupFilename(): string {
  const date = new Date().toISOString().slice(0, 10);
  return `solo-compass-backup-${date}.json`;
}

/** Sin BOM a propósito (a diferencia de journalUi.ts's downloadTextFile):
 * JSON.parse rechaza un BOM inicial, y el archivo se vuelve a leer
 * con nuestro propio parser al restaurar. */
export function downloadBackupFile(filename: string, payload: BackupPayload): void {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
