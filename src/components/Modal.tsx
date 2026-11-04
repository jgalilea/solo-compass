import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Pila de diálogos abiertos, para que Esc cierre solo el de arriba
// (p. ej. la confirmación de restaurar copia, abierta encima de
// "Acerca de").
const openStack: symbol[] = [];

const FOCUSABLE =
  "input:not([type='hidden']):not(.hidden), textarea, select, button:not(:disabled), a[href], [tabindex]:not([tabindex='-1'])";

/**
 * Fondo + panel de diálogo. Se monta con un portal en <body> para que
 * ningún ancestro lo recorte ni lo deje por debajo (la cabecera fija
 * de escritorio crea su propio contexto de apilamiento). Se cierra con
 * Esc o pinchando en el fondo.
 *
 * Con teclado: al abrirse el foco entra en el panel (salvo que un hijo
 * ya lo haya tomado con autoFocus), Tab no sale de él mientras esté
 * arriba en la pila y, al cerrarse, el foco vuelve a quien lo abrió.
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
  /** Centrado siempre; si no, en móvil sale como hoja desde abajo. */
  centered?: boolean;
  /** Hoja desde abajo en todos los tamaños (las herramientas del diario). */
  sheet?: boolean;
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
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = Symbol();
    openStack.push(id);
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
      // Si quien abrió el diálogo ya no existe (p. ej. el menú que lo
      // lanzó se cerró), el foco se queda donde lo deje el navegador.
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <div
      className={[
        "fixed inset-0 z-50 flex justify-center bg-black/60",
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
        // Con un portal los eventos de React siguen subiendo por el
        // árbol de componentes (no el del DOM): se cortan aquí para
        // que no lleguen a quien abrió el diálogo.
        e.stopPropagation();
        if (e.target === e.currentTarget && pressedOnBackdrop.current) onClose();
      }}
    >
      {/* tabIndex -1: enfocable por código (al abrir), sin anillo ni parada de Tab. */}
      <div ref={panelRef} tabIndex={-1} className={`${className} outline-none`}>
        {children}
      </div>
    </div>,
    document.body,
  );
}
