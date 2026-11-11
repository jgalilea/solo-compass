import { Suspense, useMemo, useState } from "react";
import { IconSettings } from "./icons/Icons";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { useJournalContext } from "../hooks/useJournalContext";
import { markBackupNudgeSeen, shouldNudgeBackup } from "../lib/backupReminder";
import { preloadable } from "../lib/preloadable";

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
  const [open, setOpen] = useState(false);
  const [nudgeSeen, setNudgeSeen] = useState(false);
  const backupDue = useMemo(() => shouldNudgeBackup(entries.map((e) => e.timestamp)), [entries]);
  const nudge = backupDue && !nudgeSeen;

  function openSettings() {
    setOpen(true);
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
        className="relative -m-1.5 p-1.5 text-parchment-dim transition hover:text-gold"
      >
        <IconSettings size={22} />
        {/* Backup due: just a dot, no text and no notice. */}
        {nudge && (
          <span className="absolute right-1 top-1 size-2 rounded-full bg-gold ring-2 ring-ink-950" />
        )}
      </button>

      {open && (
        <Suspense fallback={null}>
          <SettingsPanel onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
