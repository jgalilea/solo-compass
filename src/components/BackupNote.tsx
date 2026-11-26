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
    <div role="note" className="rounded-2xl border border-no/50 bg-no/10 px-3.5 py-3 text-sm text-parchment">
      <button
        type="button"
        onClick={() => {
          dismissBackupNote();
          setHidden(true);
        }}
        aria-label={t.common.close}
        title={t.common.close}
        className="float-right -mr-2.5 -mt-2 flex size-10 items-center justify-center text-parchment-faint transition hover:text-parchment"
      >
        <IconClose size={16} />
      </button>
      <p>
        <IconAlertTriangle size={16} className="mr-1.5 inline align-[-0.15em] text-no" />
        <span className="font-semibold">{t.backupNote.title}</span> {t.backupNote.text}
      </p>
      <button
        type="button"
        onClick={() => void exportAll()}
        className="mt-2 flex h-10 items-center gap-1.5 rounded-xl border border-ink-border px-3 text-sm font-medium text-parchment transition hover:border-gold/50 hover:text-gold"
      >
        <IconDownload size={16} />
        {t.backupNote.button}
      </button>
      {failed && <p className="mt-2 text-xs text-no">{t.backupNote.failed}</p>}
    </div>
  );
}
