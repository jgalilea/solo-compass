import { useRef, useState, type ComponentType } from "react";
import { useDismiss } from "../hooks/useDismiss";
import { IconMore } from "./icons/Icons";

export interface ActionMenuItem {
  label: string;
  Icon: ComponentType<{ size?: number; className?: string }>;
  onSelect: () => void;
  danger?: boolean;
}

/**
 * "⋯" button with a dropdown of secondary actions, so a header doesn't
 * fill up with loose icons. Closes on pick, on Esc or on a click
 * outside.
 *
 * `compact` is the small version that sits among a journal entry's
 * buttons; near the bottom of the screen (under the composer) it opens
 * upwards.
 */
export function ActionMenu({ label, items, compact = false }: { label: string; items: ActionMenuItem[]; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [upwards, setUpwards] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  function toggle() {
    if (!open && rootRef.current) {
      const menuHeight = items.length * 44 + 16;
      // Room for the composer and the bottom bar below.
      setUpwards(rootRef.current.getBoundingClientRect().bottom + menuHeight > window.innerHeight - 160);
    }
    setOpen((v) => !v);
  }

  useDismiss(open, rootRef, () => setOpen(false));

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className={[
          compact ? "p-2 transition" : "-m-1 rounded-full p-1.5 transition",
          open ? (compact ? "text-gold" : "bg-ink-700 text-parchment") : "text-parchment-dim hover:text-gold",
        ].join(" ")}
      >
        <IconMore size={compact ? 15 : 22} />
      </button>

      {open && (
        <div
          role="menu"
          className={`animate-fade-up absolute right-0 z-40 ${upwards ? "bottom-full mb-2" : "top-full mt-2"} w-56 overflow-hidden rounded-2xl border border-ink-border bg-ink-800 py-1.5 shadow-2xl`}
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
