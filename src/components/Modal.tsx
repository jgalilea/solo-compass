import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useCloseOnBack } from "../hooks/useCloseOnBack";
import { lockPageScroll, unlockPageScroll } from "../lib/scrollLock";

// Stack of open dialogs, so Esc only closes the top one (e.g. the
// restore-backup confirmation, opened on top of "About").
const openStack: symbol[] = [];

/**
 * Panel widths: one for every dialog, so they all open the same on
 * desktop, and a narrower one for a question to answer. From `sm` up
 * they're centred windows; below, full-width bottom sheets.
 */
const SIZES = {
  /** A question: confirmations, restoring a backup. */
  sm: "sm:max-w-lg",
  /** Everything else; its content uses the width (columns on desktop). */
  lg: "sm:max-w-xl md:max-w-3xl lg:max-w-5xl",
};

const FOCUSABLE =
  "input:not([type='hidden']):not(.hidden), textarea, select, button:not(:disabled), a[href], [tabindex]:not([tabindex='-1'])";

/**
 * Backdrop + dialog panel. Mounted through a portal in <body> so no
 * ancestor clips it or leaves it underneath (the sticky desktop header
 * creates its own stacking context). Closes on Esc or on a backdrop
 * click.
 *
 * The panel is the same frame for all of them (border, corners, height
 * limit, room for the phone's home bar); its content is usually a
 * `DialogHeader` and a `DialogBody` (Dialog.tsx), so the header stays
 * put and only the body scrolls.
 *
 * With the keyboard: on open, focus moves into the panel (unless a
 * child already took it with autoFocus), Tab doesn't leave it while
 * it's on top of the stack and, on close, focus goes back to whoever
 * opened it.
 */
export function Modal({
  onClose,
  label,
  labelledBy,
  centered = false,
  sheet = false,
  size,
  className = "",
  children,
}: {
  onClose: () => void;
  label?: string;
  labelledBy?: string;
  /** Always centred; otherwise on phones it comes up as a bottom sheet. */
  centered?: boolean;
  /** Bottom sheet at every size (the journal's tools). */
  sheet?: boolean;
  size: keyof typeof SIZES;
  /** Extra panel classes. */
  className?: string;
  children: ReactNode;
}) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  // Only counts as a "click outside" if the gesture started on the
  // backdrop: so it doesn't close when selecting panel text and
  // releasing outside.
  const pressedOnBackdrop = useRef(false);
  // Back (the phone's gesture) closes it, not the screen behind.
  useCloseOnBack(true, onClose);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = Symbol();
    openStack.push(id);
    lockPageScroll();
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) panel.focus({ preventScroll: true });

    function handleKeyDown(e: KeyboardEvent) {
      if (openStack[openStack.length - 1] !== id) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const inside = panel.contains(document.activeElement);
      if (e.shiftKey && (!inside || document.activeElement === first || document.activeElement === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (!inside || document.activeElement === last)) {
        e.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      openStack.splice(openStack.indexOf(id), 1);
      unlockPageScroll();
      // If whoever opened the dialog no longer exists (e.g. the menu that
      // launched it closed), focus stays wherever the browser leaves it.
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <div
      className={[
        // overscroll-contain: a scroll that reaches the end of the panel stops there.
        "animate-scrim-in fixed inset-0 z-50 flex justify-center overscroll-contain bg-black/60",
        centered ? "items-center px-4" : sheet ? "items-end" : "items-end sm:items-center sm:px-4",
      ].join(" ")}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      aria-labelledby={labelledBy}
      onPointerDown={(e) => {
        pressedOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        // With a portal, React events still bubble up the component tree
        // (not the DOM's): they're stopped here so they don't reach
        // whoever opened the dialog.
        e.stopPropagation();
        if (e.target === e.currentTarget && pressedOnBackdrop.current) onClose();
      }}
    >
      {/* tabIndex -1: focusable from code (on open), with no ring and no Tab stop. */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={[
          "animate-dialog-in flex max-h-[88dvh] w-full flex-col overflow-hidden border border-ink-border bg-ink-800 shadow-2xl outline-none",
          SIZES[size],
          centered
            ? "rounded-3xl"
            : sheet
              ? "rounded-t-3xl border-b-0 pb-[env(safe-area-inset-bottom)]"
              : "rounded-t-3xl max-sm:pb-[env(safe-area-inset-bottom)] sm:rounded-3xl",
          className,
        ].join(" ")}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
