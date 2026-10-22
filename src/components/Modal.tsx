import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Pila de diálogos abiertos, para que Esc cierre solo el de arriba
// (p. ej. la confirmación de restaurar copia, abierta encima de
// "Acerca de").
const openStack: symbol[] = [];

/**
 * Fondo + panel de diálogo. Se monta con un portal en <body> para que
 * ningún ancestro lo recorte ni lo deje por debajo (la cabecera fija
 * de escritorio crea su propio contexto de apilamiento). Se cierra con
 * Esc o pinchando en el fondo.
 */
export function Modal({
  onClose,
  label,
  labelledBy,
  centered = false,
  className,
  children,
}: {
  onClose: () => void;
  label?: string;
  labelledBy?: string;
  /** Centrado siempre; si no, en móvil sale como hoja desde abajo. */
  centered?: boolean;
  /** Clases del panel. */
  className: string;
  children: ReactNode;
}) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  // Solo cuenta como "pinchar fuera" si el gesto empezó en el fondo:
  // así no se cierra al seleccionar texto del panel y soltar fuera.
  const pressedOnBackdrop = useRef(false);

  useEffect(() => {
    const id = Symbol();
    openStack.push(id);

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape" || openStack[openStack.length - 1] !== id) return;
      e.preventDefault();
      onCloseRef.current();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      openStack.splice(openStack.indexOf(id), 1);
    };
  }, []);

  return createPortal(
    <div
      className={[
        "fixed inset-0 z-50 flex justify-center bg-black/60",
        centered ? "items-center px-4" : "items-end sm:items-center",
      ].join(" ")}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      aria-labelledby={labelledBy}
      onPointerDown={(e) => {
        pressedOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        // Con un portal los eventos de React siguen subiendo por el
        // árbol de componentes (no el del DOM): se cortan aquí para
        // que no lleguen a quien abrió el diálogo.
        e.stopPropagation();
        if (e.target === e.currentTarget && pressedOnBackdrop.current) onClose();
      }}
    >
      <div className={className}>{children}</div>
    </div>,
    document.body,
  );
}
