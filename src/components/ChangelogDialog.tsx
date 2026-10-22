import { useState } from "react";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { CHANGELOG } from "../lib/changelog";
import { IconChevronRight, IconChronicle, IconClose } from "./icons/Icons";
import { Modal } from "./Modal";

function formatDate(dateLocale: string, iso: string): string {
  // Mediodía UTC para que la zona horaria nunca cambie el día.
  return new Intl.DateTimeFormat(dateLocale, { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(`${iso}T12:00:00Z`),
  );
}

/** Botón (en Ajustes → Acerca de) + diálogo con la crónica de cambios. */
export function ChangelogDialog() {
  const { t, locale } = useLocaleContext();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-2xl border border-ink-border bg-ink-900/60 p-4 text-left transition hover:border-gold/50"
      >
        <IconChronicle size={22} className="shrink-0 text-gold" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-parchment">{t.changelog.button}</span>
          <span className="block text-xs text-parchment-dim">{t.changelog.buttonHint}</span>
        </span>
        <IconChevronRight size={16} className="shrink-0 text-parchment-dim" />
      </button>

      {open && (
        <Modal
          onClose={() => setOpen(false)}
          label={t.changelog.title}
          className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-ink-border bg-ink-800 shadow-2xl sm:rounded-3xl lg:max-w-2xl"
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-ink-border/70 px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-display text-xl text-parchment">{t.changelog.title}</h2>
              <p className="mt-0.5 text-sm text-parchment-dim">{t.changelog.intro}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t.common.close}
              className="-m-1.5 shrink-0 p-1.5 text-parchment-dim transition hover:text-parchment"
            >
              <IconClose size={20} />
            </button>
          </div>

          <ol className="flex min-h-0 flex-col gap-6 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 sm:py-6">
            {CHANGELOG.map((entry, i) => {
              const text = entry.text[locale];
              return (
                <li key={entry.date} className="relative border-l-2 border-ink-border pl-5">
                  <span
                    aria-hidden
                    className={[
                      "absolute -left-[7px] top-1.5 h-3 w-3 rounded-full border-2",
                      i === 0 ? "border-gold bg-gold" : "border-ink-500 bg-ink-800",
                    ].join(" ")}
                  />
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <time dateTime={entry.date} className="text-xs uppercase tracking-wide text-parchment-dim">
                      {formatDate(t.dateLocale, entry.date)}
                    </time>
                    {i === 0 && (
                      <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gold">
                        {t.changelog.latestBadge}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1 font-display text-lg text-parchment">{text.title}</h3>
                  {text.intro && <p className="mt-1 text-sm italic text-parchment-dim">{text.intro}</p>}
                  <ul className="mt-2.5 flex list-disc flex-col gap-1.5 pl-4 text-sm text-parchment/90 marker:text-gold">
                    {text.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ol>
        </Modal>
      )}
    </>
  );
}
