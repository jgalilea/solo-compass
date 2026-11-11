import { useEffect, useState } from "react";
import { useLocaleContext } from "../hooks/useLocaleContext";
import type { ChangelogEntry } from "../lib/changelog";
import { IconChevronRight, IconChronicle } from "./icons/Icons";
import { DialogBody, DialogHeader } from "./Dialog";
import { Modal } from "./Modal";

function formatDate(dateLocale: string, iso: string): string {
  // Midday UTC so the time zone never shifts the day.
  return new Intl.DateTimeFormat(dateLocale, { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(`${iso}T12:00:00Z`),
  );
}

/**
 * Button (in Settings → About) + dialog with the changelog. The text of
 * every chapter in both languages is loaded when it's opened, not with
 * the app: it's a good part of the main bundle otherwise.
 */
export function ChangelogDialog() {
  const { t, locale } = useLocaleContext();
  const [open, setOpen] = useState(false);
  const [chapters, setChapters] = useState<ChangelogEntry[] | null>(null);
  useEffect(() => {
    if (!open || chapters) return;
    import("../lib/changelog").then((m) => setChapters(m.CHANGELOG)).catch(() => setChapters([]));
  }, [open, chapters]);

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
          size="lg"
        >
          <DialogHeader
            title={t.changelog.title}
            subtitle={t.changelog.intro}
            Icon={IconChronicle}
            onClose={() => setOpen(false)}
          />
          <DialogBody>
            {!chapters && <p className="text-sm text-parchment-dim">{t.common.loading}</p>}
            <ol className="flex flex-col gap-6">
              {(chapters ?? []).map((entry, i) => {
                const text = entry.text[locale];
                return (
                  <li key={entry.version} className="relative border-l-2 border-ink-border pl-5">
                    <span
                      aria-hidden
                      className={[
                        "absolute -left-[7px] top-1.5 h-3 w-3 rounded-full border-2",
                        i === 0 ? "border-gold bg-gold" : "border-ink-500 bg-ink-800",
                      ].join(" ")}
                    />
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-xs uppercase tracking-wide text-parchment-dim">
                        <span className="font-medium text-gold">v{entry.version}</span>
                        {" · "}
                        <time dateTime={entry.date}>{formatDate(t.dateLocale, entry.date)}</time>
                      </span>
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
          </DialogBody>
        </Modal>
      )}
    </>
  );
}
