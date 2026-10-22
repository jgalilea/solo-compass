import { useEffect, useRef, useState, type ComponentType } from "react";
import { IconMore } from "./icons/Icons";

export interface ActionMenuItem {
  label: string;
  Icon: ComponentType<{ size?: number; className?: string }>;
  onSelect: () => void;
  danger?: boolean;
}

/**
 * Botón "⋯" con un desplegable de acciones secundarias, para no
 * llenar una cabecera de iconos sueltos. Se cierra al elegir, con Esc
 * o pinchando fuera.
 */
export function ActionMenu({ label, items }: { label: string; items: ActionMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className={[
          "-m-1 rounded-full p-1.5 transition",
          open ? "bg-ink-700 text-parchment" : "text-parchment-dim hover:text-gold",
        ].join(" ")}
      >
        <IconMore size={22} />
      </button>

      {open && (
        <div
          role="menu"
          className="animate-fade-up absolute right-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-2xl border border-ink-border bg-ink-800 py-1.5 shadow-2xl"
        >
          {items.map(({ label: itemLabel, Icon, onSelect, danger }) => (
            <button
              key={itemLabel}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onSelect();
              }}
              className={[
                "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-ink-700",
                danger ? "text-no" : "text-parchment",
              ].join(" ")}
            >
              <Icon size={18} className={danger ? "text-no" : "text-parchment-dim"} />
              {itemLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
