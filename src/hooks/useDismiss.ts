import { useEffect, type RefObject } from "react";

/**
 * Cierra un desplegable al pinchar fuera de `rootRef` o al pulsar Esc,
 * mientras esté abierto. Lo comparten los menús de la app (acciones,
 * tipo de entrada, sesiones).
 */
export function useDismiss(open: boolean, rootRef: RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) onClose();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, rootRef, onClose]);
}
