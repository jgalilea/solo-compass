import { useMemo, useState } from "react";
import { useJournalContext } from "../hooks/useJournalContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { dismissBackupNote, saveLastBackupAt, shouldShowBackupNote } from "../lib/backupReminder";
import { IconAlertTriangle, IconClose, IconDownload } from "./icons/Icons";

/**
 * Journal list: the adventures are only in this browser, and nothing
 * copies them anywhere. Shown while there's something no backup has;
 * closed, it comes back in a month (backupReminder.ts).
 */
export function BackupNote() {
  const { entries } = useJournalContext();
  const { t } = useLocaleContext();
  const [hidden, setHidden] = useState(false);
  const [failed, setFailed] = useState(false);
  const due = useMemo(() => shouldShowBackupNote(entries.map((e) => e.editedAt ?? e.timestamp)), [entries]);
  if (hidden || !due) return null;

  async function exportAll() {
    try {
      // Loaded on demand: the list doesn't need the backup.
      const { backupFilename, buildBackup, downloadBackupFile } = await import("../lib/backup");
      downloadBackupFile(backupFilename(), await buildBackup(t));
      saveLastBackupAt(Date.now());
      setHidden(true);
    } catch {
      setFailed(true);
    }
  }

  return (
    <div role="note" className="relative flex items-start gap-2.5 rounded-2xl border border-no/50 bg-no/10 py-3 pl-3.5 pr-10">
      <IconAlertTriangle size={18} className="mt-0.5 shrink-0 text-no" />
      <div className="flex flex-col items-start gap-2 text-sm text-parchment">
        <p>
          <span className="font-semibold">{t.backupNote.title}</span> {t.backupNote.text}
        </p>
        <button
          type="button"
          onClick={() => void exportAll()}
          className="flex items-center gap-1.5 rounded-lg border border-ink-border px-2.5 py-1.5 text-xs font-medium text-parchment transition hover:border-gold/50 hover:text-gold"
        >
          <IconDownload size={15} />
          {t.backupNote.button}
        </button>
        {failed && <p className="text-xs text-no">{t.backupNote.failed}</p>}
      </div>
      <button
        type="button"
        onClick={() => {
          dismissBackupNote();
          setHidden(true);
        }}
        aria-label={t.common.close}
        className="absolute right-1.5 top-1.5 p-2 text-parchment-faint transition hover:text-parchment"
      >
        <IconClose size={15} />
      </button>
    </div>
  );
}
