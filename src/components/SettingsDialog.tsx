import { Suspense, useMemo, useState, useSyncExternalStore } from "react";
import { IconSettings } from "./icons/Icons";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { useJournalContext } from "../hooks/useJournalContext";
import { markBackupNudgeSeen, shouldNudgeBackup } from "../lib/backupReminder";
import { preloadable } from "../lib/preloadable";
import { settingsOpen } from "../lib/settingsOpen";

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

  function openSettings() {
    settingsOpen.open();
    // Once the dot has been seen, don't insist for a while even if no backup is made.
    if (nudge) {
      markBackupNudgeSeen();
      setNudgeSeen(true);
    }
  }

  const triggerLabel = nudge ? t.settings.triggerLabelBackupDue : t.settings.triggerLabel;

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
        {/* Backup due: just a dot, no text and no notice. */}
        {nudge && (
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
