import { useEffect, type ComponentType } from "react";
import { IconClose, IconDownload } from "./icons/Icons";

/**
 * Short notice that blocks nothing and goes away by itself. It sits
 * above the journal composer (on phones, above the bottom nav too) so it
 * doesn't cover what's being typed. With `action` it serves as "Undo":
 * a new toast replaces the previous one instead of stacking.
 */
export function Toast({
  title,
  description,
  closeLabel,
  onDismiss,
  Icon = IconDownload,
  action,
  duration = 4000,
}: {
  title: string;
  description?: string;
  closeLabel: string;
  onDismiss: () => void;
  Icon?: ComponentType<{ size?: number; className?: string }>;
  action?: { label: string; onClick: () => void };
  duration?: number;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, duration);
    return () => window.clearTimeout(timer);
  }, [onDismiss, duration]);

  return (
    <div
      role="status"
      className="animate-fade-up fixed inset-x-4 bottom-[calc(var(--spacing-nav)+5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-gold/40 bg-ink-800 py-3 pl-4 pr-3 shadow-2xl lg:bottom-24"
    >
      <Icon size={18} className="shrink-0 text-gold" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-parchment">{title}</p>
        {description && <p className="mt-0.5 text-xs text-parchment-dim">{description}</p>}
      </div>
      {action && (
        <button
          type="button"
          onClick={() => {
            action.onClick();
            onDismiss();
          }}
          className="shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-medium text-gold transition hover:bg-gold/10"
        >
          {action.label}
        </button>
      )}
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
