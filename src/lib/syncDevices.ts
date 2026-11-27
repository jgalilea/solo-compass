/**
 * The devices that share a sync code, as each one tells the others: its
 * own random id, a name (made from the browser at first, changed in
 * Settings) and when it last sent something. It travels inside what's
 * sealed (an op carries its sender, a snapshot the whole list), so the
 * relay still knows nothing of devices or their names. A device that only
 * reads announces itself at most once a day (ANNOUNCE_EVERY); one that
 * stops syncing drops off the list after a while (FORGET_AFTER).
 */

export interface SyncedDevice {
  id: string;
  name: string;
  /** When it last sent something (its clock). */
  seenAt: number;
}

const DAY = 24 * 60 * 60 * 1000;
/** A device that has sent nothing for this long says it's still there with an empty change. */
export const ANNOUNCE_EVERY = DAY;
/** Not heard of for this long: gone from the list (it stopped syncing, most likely). */
export const FORGET_AFTER = 60 * DAY;
export const MAX_NAME_LENGTH = 40;

/** Read from what came in: anything that isn't a device as written here is left out. */
export function readDevice(value: unknown): SyncedDevice | null {
  const d = value as SyncedDevice | null;
  if (
    !d ||
    typeof d !== "object" ||
    typeof d.id !== "string" ||
    typeof d.name !== "string" ||
    typeof d.seenAt !== "number"
  )
    return null;
  if (!d.id || d.id.length > 64) return null;
  return { id: d.id, name: d.name.trim().slice(0, MAX_NAME_LENGTH) || "?", seenAt: d.seenAt };
}

/** The devices known, with what was just seen: one per id, its latest news (and name). */
export function mergeDevices(
  known: readonly SyncedDevice[],
  seen: readonly SyncedDevice[],
  now = Date.now(),
): SyncedDevice[] {
  const byId = new Map<string, SyncedDevice>();
  for (const d of [...known, ...seen]) {
    const had = byId.get(d.id);
    if (!had || d.seenAt > had.seenAt) byId.set(d.id, d);
  }
  return [...byId.values()]
    .filter((d) => now - d.seenAt < FORGET_AFTER)
    .sort((a, b) => b.seenAt - a.seenAt);
}

/** A name for this device until the person picks one: what it is, and the browser or "app". */
export function defaultDeviceName(userAgent: string, installed: boolean, touch = false): string {
  const ua = userAgent;
  const device = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua) || (/Macintosh/.test(ua) && touch)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /CrOS/.test(ua)
          ? "ChromeOS"
          : /Windows/.test(ua)
            ? "Windows"
            : /Macintosh|Mac OS X/.test(ua)
              ? "Mac"
              : /Linux/.test(ua)
                ? "Linux"
                : "";
  const browser = installed
    ? "app"
    : /Edg\//.test(ua)
      ? "Edge"
      : /SamsungBrowser/.test(ua)
        ? "Samsung Internet"
        : /OPR\/|Opera/.test(ua)
          ? "Opera"
          : /Firefox\/|FxiOS/.test(ua)
            ? "Firefox"
            : /Chrome\/|CriOS/.test(ua)
              ? "Chrome"
              : /Safari\//.test(ua)
                ? "Safari"
                : "";
  return [device, browser].filter(Boolean).join(" · ") || "?";
}
