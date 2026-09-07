import { useState } from "react";
import { IconClose, IconCompass, IconExternalLink, IconInfo } from "./icons/Icons";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { useOracleContext } from "../hooks/useOracleContext";
import { getOracle } from "../lib/oracles";
import { LONELOG_LICENSE_URL, LONELOG_URL } from "../lib/lonelog";
import { interpolate } from "../lib/i18n";

export function AboutDialog() {
  const { t } = useLocaleContext();
  const { oracleId } = useOracleContext();
  const oracle = getOracle(oracleId);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t.about.triggerLabel}
        className="-m-1.5 p-1.5 text-parchment-dim transition hover:text-gold"
      >
        <IconInfo size={20} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={t.about.dialogLabel}
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-t-3xl border border-ink-border bg-ink-800 p-5 shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconCompass size={20} className="text-gold" />
                <h2 className="font-display text-lg text-parchment">
                  {t.header.appName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t.common.close}
                className="-m-1 p-1 text-parchment-dim transition hover:text-parchment"
              >
                <IconClose size={16} />
              </button>
            </div>

            <p className="text-sm text-parchment-dim">{t.about.description}</p>

            <div className="mt-4 rounded-2xl border border-ink-border bg-ink-900/60 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-parchment-dim/70">
                {t.about.oracleUsedBy}
              </p>
              <p className="mt-1 font-display text-base text-parchment">
                {oracle.name}
              </p>
              <p className="mt-1 text-sm text-parchment-dim">
                {interpolate(t.about.creditBy, { author: oracle.author })}{" "}
                <a
                  href={oracle.licenseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-dotted hover:text-parchment"
                >
                  {oracle.license}
                </a>
                .
              </p>
              <a
                href={oracle.url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-gold/40 bg-gold/10 py-2 text-sm font-medium text-gold transition hover:bg-gold/20"
              >
                {t.common.viewOriginal}
                <IconExternalLink size={14} />
              </a>
            </div>

            <div className="mt-3 rounded-2xl border border-ink-border bg-ink-900/60 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-parchment-dim/70">
                {t.about.journalUsedBy}
              </p>
              <p className="mt-1 font-display text-base text-parchment">Lonelog</p>
              <p className="mt-1 text-sm text-parchment-dim">
                {interpolate(t.about.creditBy, { author: "Roberto Bisceglie" })}{" "}
                <a
                  href={LONELOG_LICENSE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-dotted hover:text-parchment"
                >
                  CC BY-SA 4.0
                </a>
                .
              </p>
              <a
                href={LONELOG_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-gold/40 bg-gold/10 py-2 text-sm font-medium text-gold transition hover:bg-gold/20"
              >
                {t.common.viewOriginal}
                <IconExternalLink size={14} />
              </a>

              <div className="mt-4 border-t border-ink-border pt-3.5">
                <p className="text-xs font-medium uppercase tracking-wide text-parchment-dim/70">
                  {t.about.legendTitle}
                </p>
                <dl className="mt-2 flex flex-col gap-1.5">
                  <LegendRow symbol="@" description={t.about.legendAction} />
                  <LegendRow symbol="?" description={t.about.legendQuestion} />
                  <LegendRow symbol="d:" description={t.about.legendRoll} />
                  <LegendRow symbol="=>" description={t.about.legendConsequence} />
                  <LegendRow description={t.about.legendNote} />
                </dl>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function LegendRow({ symbol, description }: { symbol?: string; description: string }) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <dt className="w-6 shrink-0 pt-0.5 text-right font-display text-gold">{symbol}</dt>
      <dd className="min-w-0 flex-1 text-parchment-dim">{description}</dd>
    </div>
  );
}
