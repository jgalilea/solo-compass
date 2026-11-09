import { useEffect, useState } from "react";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { dismissSafariStorageNote, shouldShowSafariStorageNote } from "../lib/safariStorageNote";
import { IconClose, IconInstall } from "./icons/Icons";

/** Journal list, iPhone/iPad Safari only: see src/lib/safariStorageNote.ts. */
export function SafariStorageNote() {
  const { t } = useLocaleContext();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void shouldShowSafariStorageNote().then((show) => {
      if (!cancelled) setVisible(show);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="relative flex items-start gap-2.5 rounded-2xl border border-ink-border bg-ink-900/60 py-3 pl-3.5 pr-10">
      <IconInstall size={18} className="mt-0.5 shrink-0 text-gold" />
      <div className="flex flex-col gap-1 text-sm text-parchment-dim">
        <p>{t.safariNote.text}</p>
        <p className="text-xs text-parchment-dim/80">{t.safariNote.moveData}</p>
      </div>
      <button
        type="button"
        onClick={() => {
          dismissSafariStorageNote();
          setVisible(false);
        }}
        aria-label={t.common.close}
        className="absolute right-1.5 top-1.5 p-2 text-parchment-dim/60 transition hover:text-parchment"
      >
        <IconClose size={15} />
      </button>
    </div>
  );
}
