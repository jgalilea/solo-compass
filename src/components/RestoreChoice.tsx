import { useState } from "react";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { BackupError, restoreBackup, type RestoreMode } from "../lib/backup";

/**
 * How to restore a backup, once it's been looked at: merging it with
 * this device's data or replacing it (see backup.ts). Then the page
 * reloads. Used by Settings and by the dialog for a file dropped on the
 * window or shared to the app.
 */
export function RestoreChoice({
  text,
  onCancel,
  onError,
}: {
  text: string;
  onCancel: () => void;
  onError: (message: string) => void;
}) {
  const { t } = useLocaleContext();
  const [restoring, setRestoring] = useState(false);
  // "Replace everything" asks again: it wipes this device and can't be
  // undone, and a file can come from somewhere the player didn't choose
  // (anyone can send one to the app's share target, IncomingFileDialog).
  const [confirmingReplace, setConfirmingReplace] = useState(false);

  async function confirm(mode: RestoreMode) {
    if (restoring) return;
    setRestoring(true);
    try {
      await restoreBackup(t, text, mode);
      // Full reload on purpose: history/journal/theme/locale… are
      // spread across several React contexts that are already mounted,
      // and the simplest, most reliable way for all of them to reflect
      // the freshly restored data is to start from scratch.
      window.location.reload();
    } catch (err) {
      setRestoring(false);
      onError(err instanceof BackupError ? err.message : t.about.importAllError);
    }
  }

  if (restoring) return <p className="mt-4 text-sm text-gold">{t.about.importAllSuccessReloading}</p>;
  if (confirmingReplace) {
    return (
      <div role="alert" className="mt-4 flex flex-col gap-3 rounded-xl border border-no/60 px-4 py-3">
        <p className="text-sm text-parchment">{t.about.restoreReplaceConfirm}</p>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            autoFocus
            onClick={() => setConfirmingReplace(false)}
            className="rounded-full px-4 py-2 text-sm text-parchment-dim transition hover:text-parchment"
          >
            {t.about.restoreReplaceBack}
          </button>
          <button
            type="button"
            onClick={() => void confirm("replace")}
            className="rounded-full bg-no/90 px-4 py-2 text-sm font-medium text-ink-950 transition hover:bg-no"
          >
            {t.about.restoreReplaceConfirmButton}
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-4 flex flex-col gap-2">
      <button
        type="button"
        onClick={() => void confirm("merge")}
        className="rounded-xl border border-gold/50 bg-gold/10 px-4 py-3 text-left transition hover:bg-gold/20"
      >
        <span className="block text-sm font-semibold text-gold">{t.about.restoreMergeLabel}</span>
        <span className="mt-0.5 block text-xs text-parchment-dim">{t.about.restoreMergeDescription}</span>
      </button>
      <button
        type="button"
        onClick={() => setConfirmingReplace(true)}
        className="rounded-xl border border-ink-border px-4 py-3 text-left transition hover:border-no/60"
      >
        <span className="block text-sm font-semibold text-no">{t.about.restoreReplaceLabel}</span>
        <span className="mt-0.5 block text-xs text-parchment-dim">{t.about.restoreReplaceDescription}</span>
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="self-end rounded-full px-4 py-2 text-sm text-parchment-dim transition hover:text-parchment"
      >
        {t.common.cancel}
      </button>
    </div>
  );
}
