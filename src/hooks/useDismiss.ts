import { useEffect, type RefObject } from "react";

/**
 * Cierra un desplegable al pinchar fuera de `rootRef`, al pulsar Esc o
 * al salir de él con Tab, mientras esté abierto. Lo comparten los menús
 * de la app (acciones, tipo de entrada, sesiones).
 *
 * Con teclado: las flechas (e Inicio/Fin) recorren las opciones del
 * menú, y Esc devuelve el foco al botón que lo abrió (el que lleva
 * `aria-haspopup`) para no dejarlo perdido en la página.
 */
export function useDismiss(open: boolean, rootRef: RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const root = rootRef.current;
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
      // Las opciones: todo lo pulsable salvo el propio botón que abre.
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
      // relatedTarget es null al pinchar en una zona no enfocable: de eso
      // ya se encarga pointerdown.
      if (e.relatedTarget instanceof Node && !root?.contains(e.relatedTarget)) onClose();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    root?.addEventListener("focusout", handleFocusOut);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      root?.removeEventListener("focusout", handleFocusOut);
    };
  }, [open, rootRef, onClose]);
}
