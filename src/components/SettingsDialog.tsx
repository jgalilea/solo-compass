import { Suspense, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { IconSettings } from "./icons/Icons";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { useJournalContext } from "../hooks/useJournalContext";
import { markBackupNudgeSeen, shouldNudgeBackup } from "../lib/backupReminder";
import { preloadable } from "../lib/preloadable";
import { settingsOpen } from "../lib/settingsOpen";
import {
  loadSyncStatus,
  PAUSE_DOT_AFTER,
  subscribeSyncStatus,
  syncNeedsAttention,
} from "../lib/syncStatus";

const SettingsPanel = preloadable(() => import("./SettingsPanel").then((m) => m.SettingsPanel));

/**
 * A single entry point for everything that isn't playing: appearance,
 * language, backup and credits. These used to be three loose icons in
 * the header, and the backup (the most important thing in an app with
 * no server) was hidden inside "About". The button lives in the main
 * bundle; what it opens (SettingsPanel) is loaded apart.
 */
export function SettingsDialog() {
  const { t } = useLocaleContext();
  const { entries } = useJournalContext();
  const open = useSyncExternalStore(settingsOpen.subscribe, settingsOpen.isOpen);
  const [nudgeSeen, setNudgeSeen] = useState(false);
  const backupDue = useMemo(() => shouldNudgeBackup(entries.map((e) => e.timestamp)), [entries]);
  const nudge = backupDue && !nudgeSeen;
  // The sync's dot stays until it's sorted (a long pause, a stop, a question).
  const syncStatus = useSyncExternalStore(subscribeSyncStatus, loadSyncStatus, () => null);
  const [, setTick] = useState(0);
  const syncDot = syncNeedsAttention(syncStatus);
  // A pause gets its dot once it has lasted a while: drawn again then.
  useEffect(() => {
    if (syncStatus?.state !== "paused" || syncDot) return;
    const id = setTimeout(
      () => setTick((n) => n + 1),
      syncStatus.since + PAUSE_DOT_AFTER - Date.now() + 1000,
    );
    return () => clearTimeout(id);
  }, [syncStatus, syncDot]);

  function openSettings() {
    settingsOpen.open();
    // Once the dot has been seen, don't insist for a while even if no backup is made.
    if (nudge) {
      markBackupNudgeSeen();
      setNudgeSeen(true);
    }
  }

  const triggerLabel = syncDot
    ? t.settings.triggerLabelSync
    : nudge
      ? t.settings.triggerLabelBackupDue
      : t.settings.triggerLabel;

  return (
    <>
      <button
        type="button"
        onClick={() => openSettings()}
        aria-label={triggerLabel}
        title={triggerLabel}
        className="relative -mr-2 flex size-10 shrink-0 items-center justify-center rounded-full text-parchment-dim transition hover:text-gold"
      >
        <IconSettings size={22} />
        {/* Backup due, or the sync needs a look: just a dot, no text and no notice. */}
        {(nudge || syncDot) && (
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-gold ring-2 ring-ink-950" />
        )}
      </button>

      {open && (
        <Suspense fallback={null}>
          <SettingsPanel onClose={settingsOpen.close} />
        </Suspense>
      )}
    </>
  );
}
