/**
 * Recordatorio de copia de seguridad, a propósito casi invisible: un
 * punto en el botón de Ajustes y una línea "Última copia: hace…" en la
 * tarjeta de copia. Nada de avisos ni diálogos — el diario es para
 * jugar.
 *
 * El punto sale solo si de verdad hay algo que perder: bastantes
 * entradas nuevas desde la última copia y tiempo suficiente sin
 * hacerla. Abrir Ajustes lo apaga una temporada aunque no se haga la
 * copia (se ha visto; no se insiste).
 */

const LAST_BACKUP_KEY = "solo-compass:last-backup";
const NUDGE_SEEN_KEY = "solo-compass:backup-nudge-seen";

const DAY = 24 * 60 * 60 * 1000;
/** Entradas nuevas desde la última copia a partir de las cuales merece la pena. */
export const NUDGE_MIN_NEW_ENTRIES = 10;
/** Días desde la última copia (o desde la primera entrada, si nunca hubo). */
export const NUDGE_AFTER_DAYS = 14;
/** Días que el punto se queda apagado tras abrir Ajustes. */
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
    // No es crítico: en el peor caso el punto vuelve a salir.
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

/** "hace 3 días", "hace 2 meses"… en el idioma de la app. */
export function formatSince(time: number, locale: string, now = Date.now()): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const days = Math.round((time - now) / DAY);
  if (Math.abs(days) < 1) return rtf.format(0, "day");
  if (Math.abs(days) < 30) return rtf.format(days, "day");
  if (Math.abs(days) < 365) return rtf.format(Math.round(days / 30), "month");
  return rtf.format(Math.round(days / 365), "year");
}
