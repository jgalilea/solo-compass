import { useEffect, useState, useSyncExternalStore } from "react";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { interpolate } from "../lib/i18n";
import { settingsOpen } from "../lib/settingsOpen";
import {
  askForSyncCard,
  isSyncBusy,
  isSyncEnabled,
  isSyncPending,
  loadSyncStatus,
  subscribeSyncStatus,
  syncAvailable,
  syncGlance,
  type SyncGlance,
} from "../lib/syncStatus";
import { IconAlertTriangle, IconCloud, IconCloudCheck, IconCloudOff, IconCloudUp, IconSync } from "./icons/Icons";

/** Each state its own shape (a theme's colours alone may not tell them apart), and a colour on top. */
const LOOK: Record<Exclude<SyncGlance, "off">, { Icon: typeof IconCloud; className: string }> = {
  ok: { Icon: IconCloudCheck, className: "text-yes" },
  syncing: { Icon: IconSync, className: "animate-spin text-gold" },
  pending: { Icon: IconCloudUp, className: "text-parchment-dim" },
  waiting: { Icon: IconCloud, className: "text-parchment-dim" },
  offline: { Icon: IconCloudOff, className: "text-parchment-dim" },
  paused: { Icon: IconCloudOff, className: "text-gold" },
  problem: { Icon: IconAlertTriangle, className: "text-no" },
};

function ago(time: number, locale: string, now: number): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const seconds = Math.round((time - Math.max(now, time)) / 1000);
  if (seconds > -60) return rtf.format(0, "second");
  if (seconds > -3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (seconds > -86400) return rtf.format(Math.round(seconds / 3600), "hour");
  return rtf.format(Math.round(seconds / 86400), "day");
}

/**
 * How the device sync is going, at a glance: an icon beside Settings on a
 * device that syncs (synced, sending, changes waiting, offline, paused,
 * or something to look at), its name the detail, and a tap opens
 * Settings at the sync's card. `onlyTrouble`: in an adventure's bar on a
 * phone, where room is short, only when something isn't right.
 */
export function SyncIndicator({ onlyTrouble = false }: { onlyTrouble?: boolean }) {
  const { t, locale } = useLocaleContext();
  const enabled = useSyncExternalStore(subscribeSyncStatus, isSyncEnabled, () => false);
  const status = useSyncExternalStore(subscribeSyncStatus, loadSyncStatus, () => null);
  const busy = useSyncExternalStore(subscribeSyncStatus, isSyncBusy, () => false);
  const pending = useSyncExternalStore(subscribeSyncStatus, isSyncPending, () => false);
  // "Synced 3 minutes ago", and a pause turning into a problem: read again every minute.
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [enabled]);

  if (!syncAvailable()) return null;
  const glance = syncGlance(enabled, status, busy, pending);
  if (glance === "off") return null;
  if (onlyTrouble && glance !== "offline" && glance !== "paused" && glance !== "problem") return null;
  const { Icon, className } = LOOK[glance];
  const label =
    glance === "ok" && status?.state === "ok"
      ? interpolate(t.syncGlance.ok, { when: ago(status.at, locale, now) })
      : t.syncGlance[glance === "ok" ? "waiting" : glance];

  return (
    <button
      type="button"
      onClick={() => {
        askForSyncCard();
        settingsOpen.open();
      }}
      aria-label={label}
      title={label}
      data-sync-glance={glance}
      className="flex size-10 shrink-0 items-center justify-center rounded-full transition hover:bg-ink-800/60"
    >
      <Icon size={21} className={className} />
    </button>
  );
}
