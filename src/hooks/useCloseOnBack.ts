import { useEffect, useRef } from "react";
import { currentModalDepth, popModalEntry, pushModalEntry } from "../lib/modalHistory";

/**
 * While `open`, going back (the phone's back gesture or button) calls
 * `onClose` instead of leaving the screen behind: dialogs (`Modal`) and
 * dropdown menus (`useDismiss`). See `modalHistory.ts`.
 */
export function useCloseOnBack(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const depth = pushModalEntry();
    function handlePopState() {
      if (currentModalDepth() < depth) onCloseRef.current();
    }
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      popModalEntry(depth);
    };
  }, [open]);
}
