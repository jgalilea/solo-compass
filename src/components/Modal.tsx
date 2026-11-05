import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Stack of open dialogs, so Esc only closes the top one (e.g. the
// restore-backup confirmation, opened on top of "About").
const openStack: symbol[] = [];

// The page behind doesn't scroll while any dialog is open (a scroll
// inside the panel, or on the backdrop, used to move the page too). A
// counter, since dialogs can be stacked: only the last one to close
// unlocks it. The scrollbar's width is kept as padding so the page
// doesn't shift sideways on desktop.
let scrollLocks = 0;
let savedRootStyle: { overflow: string; paddingRight: string } | null = null;

function lockPageScroll() {
  if (scrollLocks++ > 0) return;
  const root = document.documentElement;
  const scrollbar = window.innerWidth - root.clientWidth;
  savedRootStyle = { overflow: root.style.overflow, paddingRight: root.style.paddingRight };
  root.style.overflow = "hidden";
  if (scrollbar > 0) root.style.paddingRight = `${scrollbar}px`;
}

function unlockPageScroll() {
  if (--scrollLocks > 0 || !savedRootStyle) return;
  const root = document.documentElement;
  root.style.overflow = savedRootStyle.overflow;
  root.style.paddingRight = savedRootStyle.paddingRight;
  savedRootStyle = null;
}

const FOCUSABLE =
  "input:not([type='hidden']):not(.hidden), textarea, select, button:not(:disabled), a[href], [tabindex]:not([tabindex='-1'])";

/**
 * Backdrop + dialog panel. Mounted through a portal in <body> so no
 * ancestor clips it or leaves it underneath (the sticky desktop header
 * creates its own stacking context). Closes on Esc or on a backdrop
 * click.
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
  className,
  children,
}: {
  onClose: () => void;
  label?: string;
  labelledBy?: string;
  /** Always centred; otherwise on phones it comes up as a bottom sheet. */
  centered?: boolean;
  /** Bottom sheet at every size (the journal's tools). */
  sheet?: boolean;
  /** Panel classes. */
  className: string;
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
        "fixed inset-0 z-50 flex justify-center overscroll-contain bg-black/60",
        centered ? "items-center px-4" : sheet ? "items-end" : "items-end sm:items-center",
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
      <div ref={panelRef} tabIndex={-1} className={`${className} outline-none`}>
        {children}
      </div>
    </div>,
    document.body,
  );
}
