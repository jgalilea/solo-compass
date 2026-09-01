import { useState } from "react";
import { THEMES } from "../lib/theme";
import { useThemeContext } from "../hooks/useThemeContext";
import { IconCheck, IconClose, IconPalette } from "./icons/Icons";

export function ThemeSwitcher() {
  const { theme, setTheme } = useThemeContext();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Cambiar tema visual"
        className="-m-1.5 p-1.5 text-parchment-dim transition hover:text-gold"
      >
        <IconPalette size={20} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Selector de tema visual"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-3xl border border-ink-border bg-ink-800 p-5 shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg text-parchment">Tema visual</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="-m-1 p-1 text-parchment-dim transition hover:text-parchment"
              >
                <IconClose size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {THEMES.map((t) => {
                const active = t.id === theme;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTheme(t.id);
                      setOpen(false);
                    }}
                    aria-pressed={active}
                    className={[
                      "flex items-center gap-3 rounded-2xl border p-3 text-left transition",
                      active
                        ? "border-gold/50 bg-gold/10"
                        : "border-ink-border hover:border-ink-500",
                    ].join(" ")}
                  >
                    <span className="flex h-8 w-8 shrink-0 overflow-hidden rounded-full border border-ink-border/70">
                      {t.swatch.map((c, i) => (
                        <span
                          key={i}
                          className="h-full flex-1"
                          style={{ background: c }}
                        />
                      ))}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-parchment">
                        {t.name}
                      </span>
                      <span className="block truncate text-xs text-parchment-dim">
                        {t.tagline}
                      </span>
                    </span>
                    {active && (
                      <IconCheck size={18} className="shrink-0 text-gold" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
