import { useState, type ReactNode } from "react";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { Modal } from "./Modal";
import { IconClose, IconHelp } from "./icons/Icons";

/**
 * A "?" button and the short guide it opens (the oracle's, the dice's):
 * the same button and dialog shell, each guide brings its own content.
 */
export function HelpDialog({ button, title, children }: { button: string; title: string; children: ReactNode }) {
  const { t } = useLocaleContext();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={button}
        title={button}
        className="-m-1 shrink-0 rounded-full p-1 text-parchment-dim transition hover:text-gold"
      >
        <IconHelp size={20} />
      </button>

      {open && (
        <Modal
          onClose={() => setOpen(false)}
          label={title}
          className="flex max-h-[85dvh] w-full max-w-md flex-col gap-4 overflow-y-auto overscroll-contain rounded-t-3xl border border-ink-border bg-ink-800 p-5 shadow-2xl sm:rounded-3xl sm:p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg text-parchment">{title}</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t.common.close}
              className="-m-1 p-1 text-parchment-dim transition hover:text-parchment"
            >
              <IconClose size={16} />
            </button>
          </div>
          {children}
        </Modal>
      )}
    </>
  );
}

/** A small gold heading for a part of a guide. */
export function HelpHeading({ children }: { children: ReactNode }) {
  return <h3 className="text-xs font-semibold uppercase tracking-wide text-gold">{children}</h3>;
}
