/**
 * Full app backup: history + journal (every adventure and entry) +
 * settings, in a single .json — so as not to rely only on browser
 * storage (see "Your data" in the README: everything lives in this
 * device's IndexedDB/localStorage, with no server or sync).
 *
 * Built on top of each module's load/save functions (history.ts,
 * journal.ts, customTables.ts, theme.ts, mode.ts, i18n, oracles.ts,
 * tableFavorites.ts, activeAdventure.ts) instead of reading/writing the storage keys by
 * hand here — so none of the validation/migration logic those modules
 * already handle gets duplicated.
 */

import { loadHistory, saveHistory, type HistoryEntry } from "./history";
import { loadAdventures, saveAdventures, loadJournalEntries, saveJournalEntries, type Adventure } from "./journal";
import type { JournalEntry } from "./lonelog";
import { isCustomTable, loadCustomTables, saveCustomTables, type CustomTable } from "./customTables";
import { loadTheme, saveTheme, isThemeId } from "./theme";
import { loadMode, saveMode, isThemeMode } from "./mode";
import { loadLocale, saveLocale, isLocale, type Dictionary } from "./i18n";
import { loadOracleId, saveOracleId } from "./oracles";
import { loadFavoriteTableIds, saveFavoriteTableIds } from "./tableFavorites";
import { loadActiveAdventureId, saveActiveAdventureId } from "./activeAdventure";
import { saveLastBackupAt } from "./backupReminder";
import { mergeData } from "./backupMerge";
import { loadDeletions, saveDeletions, type Deletion } from "./deletions";

// 2: journal.adventures (formerly journal.campaigns) — backups are so
// new there's no need to migrate old ones.
// 3: customTables (the player's own tables). Version 2 backups still
// restore; they just leave this device's own tables as they are.
// 4: journal.deleted (ids deleted on that device, for merging). Older
// backups merge as if nothing had been deleted there.
export const BACKUP_SCHEMA_VERSION = 4;

export interface BackupPayload {
  app: "solo-compass";
  schemaVersion: number;
  exportedAt: string;
  history: HistoryEntry[];
  journal: {
    adventures: Adventure[];
    entries: JournalEntry[];
    deleted?: Deletion[];
  };
  customTables?: CustomTable[];
  settings: {
    theme: string;
    mode: string;
    locale: string;
    oracleId: string;
    activeAdventureId: string | null;
    favoriteTableIds: string[];
  };
}

export class BackupError extends Error {}

export async function buildBackup(t: Dictionary): Promise<BackupPayload> {
  const [history, adventures, entries, customTables, deleted] = await Promise.all([
    loadHistory(t),
    loadAdventures(t),
    loadJournalEntries(t),
    loadCustomTables(t),
    loadDeletions(),
  ]);
  return {
    app: "solo-compass",
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    history,
    journal: { adventures, entries, deleted },
    customTables,
    settings: {
      theme: loadTheme(),
      mode: loadMode(),
      locale: loadLocale(),
      oracleId: loadOracleId(),
      activeAdventureId: loadActiveAdventureId(),
      favoriteTableIds: [...loadFavoriteTableIds()],
    },
  };
}

/** Only validates the bare minimum shape so restoring doesn't blow up
 * — settings are deliberately lenient (best-effort). */
function isBackupPayload(value: unknown): value is BackupPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v.app !== "solo-compass" || typeof v.schemaVersion !== "number") return false;
  if (!Array.isArray(v.history)) return false;
  const journal = v.journal as Record<string, unknown> | undefined;
  if (!journal || !Array.isArray(journal.adventures) || !Array.isArray(journal.entries)) {
    return false;
  }
  return true;
}

export type RestoreMode = "merge" | "replace";

/**
 * Restores a backup, in one of two ways (the UI asks):
 *
 * - "merge": joins it with what's on this device (backupMerge.ts), to
 *   carry a game between devices. This device's settings stay.
 * - "replace": this device's history, journal and tables become
 *   exactly the backup's. Settings are restored one by one, silently
 *   skipping any that are invalid, so a single stray field doesn't
 *   block the rest.
 */
export async function restoreBackup(t: Dictionary, text: string, mode: RestoreMode = "replace"): Promise<void> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BackupError(t.about.importAllError);
  }
  if (!isBackupPayload(parsed)) {
    throw new BackupError(t.about.importAllError);
  }

  const incomingTables = Array.isArray(parsed.customTables) ? parsed.customTables.filter(isCustomTable) : null;
  const incomingDeleted = Array.isArray(parsed.journal.deleted) ? parsed.journal.deleted : [];

  if (mode === "merge") {
    const [history, adventures, entries, customTables, deleted] = await Promise.all([
      loadHistory(t),
      loadAdventures(t),
      loadJournalEntries(t),
      loadCustomTables(t),
      loadDeletions(),
    ]);
    const merged = mergeData(
      { history, adventures, entries, customTables, deleted },
      {
        history: parsed.history,
        adventures: parsed.journal.adventures,
        entries: parsed.journal.entries,
        customTables: incomingTables ?? [],
        deleted: incomingDeleted,
      },
    );
    await Promise.all([
      saveHistory(t, merged.history),
      saveAdventures(t, merged.adventures),
      saveJournalEntries(t, merged.entries),
      saveCustomTables(t, merged.customTables),
      saveDeletions(merged.deleted),
    ]);
    return;
  }

  await Promise.all([
    saveDeletions(incomingDeleted),
    saveHistory(t, parsed.history),
    saveAdventures(t, parsed.journal.adventures),
    saveJournalEntries(t, parsed.journal.entries),
    // Older backups have no custom tables: the ones here are kept.
    incomingTables ? saveCustomTables(t, incomingTables) : Promise.resolve(),
  ]);
  // What's here now is exactly that backup: it counts as the latest.
  const exportedAt = Date.parse(parsed.exportedAt);
  if (Number.isFinite(exportedAt)) saveLastBackupAt(exportedAt);

  const s = parsed.settings as unknown as Record<string, unknown> | undefined;
  if (s) {
    if (typeof s.theme === "string" && isThemeId(s.theme)) saveTheme(s.theme);
    if (typeof s.mode === "string" && isThemeMode(s.mode)) saveMode(s.mode);
    if (typeof s.locale === "string" && isLocale(s.locale)) saveLocale(s.locale);
    if (typeof s.oracleId === "string") saveOracleId(s.oracleId);
    if (typeof s.activeAdventureId === "string" || s.activeAdventureId === null) {
      saveActiveAdventureId((s.activeAdventureId as string | null) ?? null);
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

/**
 * The backup through the system's share sheet, to send it straight to
 * another device (AirDrop, Quick Share, a chat with yourself…). As
 * .txt on Chromium, which won't share .json; it's restored the same.
 */
export function backupText(payload: BackupPayload): string {
  return JSON.stringify(payload, null, 2);
}

/** No BOM on purpose (unlike journalUi.ts's downloadTextFile):
 * JSON.parse rejects a leading BOM, and the file is read back with
 * our own parser on restore. */
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
