import { useEffect } from "react";
import { IconClose, IconDownload } from "./icons/Icons";

export function Toast({
  title,
  description,
  closeLabel,
  onDismiss,
}: {
  title: string;
  description?: string;
  closeLabel: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 4000);
    return () => window.clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      role="status"
      className="animate-fade-up fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-sm items-start gap-3 rounded-2xl border border-gold/40 bg-ink-800 p-4 shadow-2xl"
    >
      <IconDownload size={18} className="mt-0.5 shrink-0 text-gold" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-parchment">{title}</p>
        {description && (
          <p className="mt-0.5 text-xs text-parchment-dim">{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={closeLabel}
        className="-m-1 shrink-0 p-1 text-parchment-dim/60 transition hover:text-parchment"
      >
        <IconClose size={14} />
      </button>
    </div>
  );
}
