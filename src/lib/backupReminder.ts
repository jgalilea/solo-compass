/**
 * Backup reminder: a dot on the Settings button, a "Last backup: … ago"
 * line on the backup card, and a note in the journal list (BackupNote)
 * while something has no backup. No toasts or dialogs, nothing inside an adventure — the journal is for playing.
 *
 * The dot only shows if there really is something to lose: enough new
 * entries since the last backup and enough time without one. Opening
 * Settings turns it off for a while even if no backup is made (it's
 * been seen; no need to insist).
 */

const LAST_BACKUP_KEY = "solo-compass:last-backup";
const NUDGE_SEEN_KEY = "solo-compass:backup-nudge-seen";

const NOTE_CLOSED_KEY = "solo-compass:backup-note-closed";

const DAY = 24 * 60 * 60 * 1000;
/** New entries since the last backup from which it's worth it. */
export const NUDGE_MIN_NEW_ENTRIES = 10;
/** Days since the last backup (or since the first entry, if there never was one). */
export const NUDGE_AFTER_DAYS = 14;
/** Days the dot stays off after opening Settings. */
export const NUDGE_SNOOZE_DAYS = 7;

function loadTime(key: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const n = Number(window.localStorage.getItem(key));
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function saveTime(key: string, time: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, String(time));
  } catch {
    // Not critical: at worst the dot shows up again.
  }
}

export function loadLastBackupAt(): number | null {
  return loadTime(LAST_BACKUP_KEY);
}

export function saveLastBackupAt(time: number): void {
  saveTime(LAST_BACKUP_KEY, time);
}

export function markBackupNudgeSeen(now = Date.now()): void {
  saveTime(NUDGE_SEEN_KEY, now);
}

export function shouldNudgeBackup(
  entryTimestamps: number[],
  now = Date.now(),
  lastBackupAt = loadLastBackupAt(),
  nudgeSeenAt = loadTime(NUDGE_SEEN_KEY),
): boolean {
  if (nudgeSeenAt !== null && now - nudgeSeenAt < NUDGE_SNOOZE_DAYS * DAY) return false;
  const since = lastBackupAt ?? 0;
  const fresh = entryTimestamps.filter((ts) => ts > since);
  if (fresh.length < NUDGE_MIN_NEW_ENTRIES) return false;
  const reference = lastBackupAt ?? Math.min(...fresh);
  return now - reference >= NUDGE_AFTER_DAYS * DAY;
}

/** Days the journal list's note stays closed. */
export const NOTE_SNOOZE_DAYS = 30;

export function dismissBackupNote(now = Date.now()): void {
  saveTime(NOTE_CLOSED_KEY, now);
}

/** The journal list's note: something no backup has, and not closed lately. */
export function shouldShowBackupNote(
  entryTimestamps: number[],
  now = Date.now(),
  lastBackupAt = loadLastBackupAt(),
  closedAt = loadTime(NOTE_CLOSED_KEY),
): boolean {
  if (closedAt !== null && now - closedAt < NOTE_SNOOZE_DAYS * DAY) return false;
  return entryTimestamps.some((ts) => ts > (lastBackupAt ?? 0));
}

/** "3 days ago", "2 months ago"… in the app's language. */
export function formatSince(time: number, locale: string, now = Date.now()): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const days = Math.round((time - now) / DAY);
  if (Math.abs(days) < 1) return rtf.format(0, "day");
  if (Math.abs(days) < 30) return rtf.format(days, "day");
  if (Math.abs(days) < 365) return rtf.format(Math.round(days / 30), "month");
  return rtf.format(Math.round(days / 365), "year");
}
