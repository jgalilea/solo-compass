/**
 * Full app backup: history + journal (every adventure and entry) +
 * settings, in a single .json — so as not to rely only on browser
 * storage (see "Your data" in the README: everything lives in this
 * device's IndexedDB/localStorage, with no server or sync).
 *
 * Built on top of each module's load/save functions (history.ts,
 * journal.ts, customTables.ts, savedRolls.ts, theme.ts, mode.ts, i18n, oracles.ts,
 * tableFavorites.ts, diceFavorites.ts, activeAdventure.ts) instead of reading/writing the storage keys by
 * hand here — so none of the validation/migration logic those modules
 * already handle gets duplicated.
 */

import { loadHistory, normalizeHistoryEntry, replaceHistory, type HistoryEntry } from "./history";
import {
  loadAdventures,
  loadJournalEntries,
  normalizeAdventure,
  normalizeJournalEntry,
  replaceAdventures,
  replaceJournalEntries,
  type Adventure,
} from "./journal";
import type { JournalEntry } from "./lonelog";
import { isCustomTable, loadCustomTables, replaceCustomTables, type CustomTable } from "./customTables";
import { loadSavedRolls, normalizeSavedRoll, replaceSavedRolls, type SavedRoll } from "./savedRolls";
import { loadTheme, saveTheme, isThemeId } from "./theme";
import { loadMode, saveMode, isThemeMode } from "./mode";
import { loadLocale, saveLocale, isLocale, type Dictionary } from "./i18n";
import { isOracleId, loadFavoriteOracleId, loadOracleId, saveFavoriteOracleId, saveOracleId } from "./oracles";
import { loadFavoriteTableIds, saveFavoriteTableIds } from "./tableFavorites";
import { loadFavoriteDice, saveFavoriteDice } from "./diceFavorites";
import { isBuiltinDie } from "./dice";
import { loadActiveAdventureId, saveActiveAdventureId } from "./activeAdventure";
import { saveLastBackupAt } from "./backupReminder";
import { mergeData } from "./backupMerge";
import { loadDeletions, recentDeletions, replaceDeletions, type Deletion } from "./deletions";
import { announceChange } from "./sync";

// 2: journal.adventures (formerly journal.campaigns) — backups are so
// new there's no need to migrate old ones.
// 3: customTables (the player's own tables). Version 2 backups still
// restore; they just leave this device's own tables as they are.
// 4: journal.deleted (ids deleted on that device, for merging). Older
// backups merge as if nothing had been deleted there.
// 5: savedRolls (the player's saved dice rolls). Older backups leave
// this device's as they are.
export const BACKUP_SCHEMA_VERSION = 5;

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
  savedRolls?: SavedRoll[];
  settings: {
    theme: string;
    mode: string;
    locale: string;
    oracleId: string;
    /** Missing in backups from before it existed: left as it is. */
    favoriteOracleId?: string | null;
    activeAdventureId: string | null;
    favoriteTableIds: string[];
    /** Missing in backups from before it existed: left as it is. */
    favoriteDice?: string[];
  };
}

export class BackupError extends Error {}

export async function buildBackup(t: Dictionary): Promise<BackupPayload> {
  const [history, adventures, entries, customTables, savedRolls, deleted] = await Promise.all([
    loadHistory(t),
    loadAdventures(t),
    loadJournalEntries(t),
    loadCustomTables(t),
    loadSavedRolls(t),
    loadDeletions(),
  ]);
  return {
    app: "solo-compass",
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    history,
    journal: { adventures, entries, deleted },
    customTables,
    savedRolls,
    settings: {
      theme: loadTheme(),
      mode: loadMode(),
      locale: loadLocale(),
      oracleId: loadOracleId(),
      favoriteOracleId: loadFavoriteOracleId(),
      activeAdventureId: loadActiveAdventureId(),
      favoriteTableIds: [...loadFavoriteTableIds()],
      favoriteDice: [...loadFavoriteDice()],
    },
  };
}

/** Only the outer shape: each record is checked on its own afterwards
 * (a bad one is dropped, the rest restored), and settings are
 * deliberately lenient (best-effort). */
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

  // Record by record, like on load: a damaged or hand-edited backup
  // loses what can't be read, instead of leaving a screen that can't open.
  const incomingHistory = parsed.history.map(normalizeHistoryEntry).filter((x) => x !== null);
  const incomingAdventures = parsed.journal.adventures.map(normalizeAdventure).filter((x) => x !== null);
  const incomingEntries = parsed.journal.entries.map(normalizeJournalEntry).filter((x) => x !== null);
  const incomingTables = Array.isArray(parsed.customTables) ? parsed.customTables.filter(isCustomTable) : null;
  const incomingRolls = Array.isArray(parsed.savedRolls)
    ? parsed.savedRolls.map(normalizeSavedRoll).filter((x) => x !== null)
    : null;
  const incomingDeleted = recentDeletions(
    (Array.isArray(parsed.journal.deleted) ? parsed.journal.deleted : []).filter(
      (d): d is Deletion => !!d && typeof d.id === "string" && typeof d.at === "number",
    ),
  );

  if (mode === "merge") {
    const [history, adventures, entries, customTables, savedRolls, deleted] = await Promise.all([
      loadHistory(t),
      loadAdventures(t),
      loadJournalEntries(t),
      loadCustomTables(t),
      loadSavedRolls(t),
      loadDeletions(),
    ]);
    const merged = mergeData(
      { history, adventures, entries, customTables, savedRolls, deleted },
      {
        history: incomingHistory,
        adventures: incomingAdventures,
        entries: incomingEntries,
        customTables: incomingTables ?? [],
        savedRolls: incomingRolls ?? [],
        deleted: incomingDeleted,
      },
    );
    await Promise.all([
      replaceHistory(t, merged.history),
      replaceAdventures(t, merged.adventures),
      replaceJournalEntries(t, merged.entries),
      replaceCustomTables(t, merged.customTables),
      replaceSavedRolls(t, merged.savedRolls),
      replaceDeletions(merged.deleted),
    ]);
    announceRestore();
    return;
  }

  await Promise.all([
    replaceDeletions(incomingDeleted),
    replaceHistory(t, incomingHistory),
    replaceAdventures(t, incomingAdventures),
    replaceJournalEntries(t, incomingEntries),
    // Older backups have no custom tables: the ones here are kept.
    incomingTables ? replaceCustomTables(t, incomingTables) : Promise.resolve(),
    // The same with saved rolls, from before they existed.
    incomingRolls ? replaceSavedRolls(t, incomingRolls) : Promise.resolve(),
  ]);
  announceRestore();
  // What's here now is exactly that backup: it counts as the latest.
  const exportedAt = Date.parse(parsed.exportedAt);
  if (Number.isFinite(exportedAt)) saveLastBackupAt(exportedAt);

  const s = parsed.settings as unknown as Record<string, unknown> | undefined;
  if (s) {
    if (typeof s.theme === "string" && isThemeId(s.theme)) saveTheme(s.theme);
    if (typeof s.mode === "string" && isThemeMode(s.mode)) saveMode(s.mode);
    if (typeof s.locale === "string" && isLocale(s.locale)) saveLocale(s.locale);
    if (typeof s.oracleId === "string" && isOracleId(s.oracleId)) saveOracleId(s.oracleId);
    if (s.favoriteOracleId === null) saveFavoriteOracleId(null);
    else if (typeof s.favoriteOracleId === "string" && isOracleId(s.favoriteOracleId)) saveFavoriteOracleId(s.favoriteOracleId);
    if (typeof s.activeAdventureId === "string" || s.activeAdventureId === null) {
      saveActiveAdventureId((s.activeAdventureId as string | null) ?? null);
    }
    if (Array.isArray(s.favoriteTableIds)) {
      saveFavoriteTableIds(new Set(s.favoriteTableIds.filter((id): id is string => typeof id === "string")));
    }
    if (Array.isArray(s.favoriteDice)) saveFavoriteDice(new Set(s.favoriteDice.filter(isBuiltinDie)));
  }
}

/** This tab reloads after a restore; the others read it all again. */
function announceRestore(): void {
  announceChange("journal");
  announceChange("history");
  announceChange("customTables");
  announceChange("savedRolls");
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
