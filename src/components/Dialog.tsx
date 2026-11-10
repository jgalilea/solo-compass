import type { ComponentType, ReactNode } from "react";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { IconClose } from "./icons/Icons";

/**
 * A dialog's header, the same in all of them: title (with an optional
 * icon and a line under it) and the close button. It doesn't scroll
 * with the body. `children` replaces the visible title (the game
 * table's tabs); the title is still there for screen readers.
 */
export function DialogHeader({
  id,
  title,
  subtitle,
  Icon,
  onClose,
  children,
}: {
  id?: string;
  title: string;
  subtitle?: ReactNode;
  Icon?: ComponentType<{ size?: number; className?: string }>;
  onClose: () => void;
  children?: ReactNode;
}) {
  const { t } = useLocaleContext();
  return (
    <div className="flex shrink-0 items-start gap-3 border-b border-ink-border/70 px-5 py-3.5 sm:px-6">
      {children ? (
        <>
          <h2 id={id} className="sr-only">
            {title}
          </h2>
          <div className="min-w-0 flex-1">{children}</div>
        </>
      ) : (
        <div className="min-w-0 flex-1 py-0.5">
          <h2 id={id} className="flex items-center gap-2 font-display text-xl text-parchment">
            {Icon && <Icon size={20} className="shrink-0 text-gold" />}
            <span className="min-w-0">{title}</span>
          </h2>
          {subtitle && <div className="mt-0.5 text-sm text-parchment-dim">{subtitle}</div>}
        </div>
      )}
      <button
        type="button"
        onClick={onClose}
        aria-label={t.common.close}
        className="-mr-1.5 shrink-0 rounded-full p-1.5 text-parchment-dim transition hover:text-parchment"
      >
        <IconClose size={20} />
      </button>
    </div>
  );
}

/** The part of a dialog that scrolls. */
/**
 * The dialog's scrolling content. `focusable` when there's nothing to
 * focus inside (only text): the keyboard can still scroll it.
 */
export function DialogBody({
  className = "flex flex-col gap-4",
  focusable = false,
  children,
}: {
  className?: string;
  focusable?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      tabIndex={focusable ? 0 : undefined}
      className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 ${className}`}
    >
      {children}
    </div>
  );
}
