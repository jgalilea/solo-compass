import { useState } from "react";
import { LOCALES } from "../lib/i18n";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { IconCheck, IconClose, IconLanguage } from "./icons/Icons";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocaleContext();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t.language.triggerLabel}
        className="-m-1.5 p-1.5 text-parchment-dim transition hover:text-gold"
      >
        <IconLanguage size={20} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={t.language.dialogTitle}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-3xl border border-ink-border bg-ink-800 p-5 shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg text-parchment">
                {t.language.dialogTitle}
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
              {LOCALES.map((l) => {
                const active = l === locale;
                return (
                  <button
                    key={l}
                    type="button"
                    onClick={() => {
                      setLocale(l);
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
                    <span className="min-w-0 flex-1 text-sm font-medium text-parchment">
                      {t.language.names[l]}
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
