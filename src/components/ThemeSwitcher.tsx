import { useState } from "react";
import { THEMES } from "../lib/theme";
import { useThemeContext } from "../hooks/useThemeContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { IconCheck, IconClose, IconPalette } from "./icons/Icons";

export function ThemeSwitcher() {
  const { theme, setTheme } = useThemeContext();
  const { t } = useLocaleContext();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t.themeSwitcher.triggerLabel}
        className="-m-1.5 p-1.5 text-parchment-dim transition hover:text-gold"
      >
        <IconPalette size={20} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={t.themeSwitcher.dialogTitle}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-3xl border border-ink-border bg-ink-800 p-5 shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg text-parchment">
                {t.themeSwitcher.dialogTitle}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t.common.close}
                className="-m-1 p-1 text-parchment-dim transition hover:text-parchment"
              >
                <IconClose size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {THEMES.map((themeInfo) => {
                const active = themeInfo.id === theme;
                const label = t.theme[themeInfo.id];
                return (
                  <button
                    key={themeInfo.id}
                    type="button"
                    onClick={() => {
                      setTheme(themeInfo.id);
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
                      {themeInfo.swatch.map((c, i) => (
                        <span
                          key={i}
                          className="h-full flex-1"
                          style={{ background: c }}
                        />
                      ))}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-parchment">
                        {label.name}
                      </span>
                      <span className="block truncate text-xs text-parchment-dim">
                        {label.tagline}
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
