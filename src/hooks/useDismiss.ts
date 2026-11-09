import { useEffect, type RefObject } from "react";
import { lockPageScroll, unlockPageScroll } from "../lib/scrollLock";

/**
 * Closes a dropdown on a click outside `rootRef`, on Esc or when
 * tabbing out of it, while it's open. Shared by the app's menus
 * (actions, entry kind, sessions). Like a dialog, an open menu keeps
 * the page behind from scrolling.
 *
 * With the keyboard: the arrows (and Home/End) move through the menu's
 * options, and Esc returns focus to the button that opened it (the one
 * with `aria-haspopup`) so it isn't left lost on the page.
 */
export function useDismiss(open: boolean, rootRef: RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const root = rootRef.current;
    lockPageScroll();
    function handlePointerDown(e: PointerEvent) {
      if (!root?.contains(e.target as Node)) onClose();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (root?.contains(document.activeElement)) {
          root.querySelector<HTMLElement>("[aria-haspopup]")?.focus();
        }
        onClose();
        return;
      }
      if (!root?.contains(document.activeElement) || !["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
        return;
      }
      // The options: everything clickable except the opening button itself.
      const items = [...root.querySelectorAll<HTMLElement>("button:not([aria-haspopup]), a[href]")];
      if (items.length === 0) return;
      e.preventDefault();
      const current = items.indexOf(document.activeElement as HTMLElement);
      const next =
        e.key === "Home"
          ? 0
          : e.key === "End"
            ? items.length - 1
            : e.key === "ArrowDown"
              ? (current + 1) % items.length
              : (current - 1 + items.length) % items.length;
      items[next].focus();
    }
    function handleFocusOut(e: FocusEvent) {
      // relatedTarget is null when clicking a non-focusable area: pointerdown
      // already takes care of that.
      if (e.relatedTarget instanceof Node && !root?.contains(e.relatedTarget)) onClose();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    root?.addEventListener("focusout", handleFocusOut);
    return () => {
      unlockPageScroll();
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      root?.removeEventListener("focusout", handleFocusOut);
    };
  }, [open, rootRef, onClose]);
}
