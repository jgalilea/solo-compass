import { useState } from "react";
import { ORACLES } from "../lib/oracles";
import { useOracleContext } from "../hooks/useOracleContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { interpolate } from "../lib/i18n";
import { IconCheck, IconClose, IconExternalLink, IconSwap } from "./icons/Icons";

export function OracleSwitcher() {
  const { oracleId, setOracleId } = useOracleContext();
  const { t } = useLocaleContext();
  const [open, setOpen] = useState(false);
  const current = ORACLES.find((o) => o.id === oracleId) ?? ORACLES[0];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t.oracleSwitcher.triggerLabel}
        className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-gold transition hover:bg-gold/20"
      >
        {current.name}
        <IconSwap size={11} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={t.oracleSwitcher.dialogTitle}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-3xl border border-ink-border bg-ink-800 p-5 shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg text-parchment">
                {t.oracleSwitcher.dialogTitle}
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
              {ORACLES.map((oracleInfo) => {
                const active = oracleInfo.id === oracleId;
                return (
                  <div
                    key={oracleInfo.id}
                    className={[
                      "rounded-2xl border p-3",
                      active
                        ? "border-gold/50 bg-gold/10"
                        : "border-ink-border",
                    ].join(" ")}
                  >
                    <button
                      type="button"
                      onClick={() => setOracleId(oracleInfo.id)}
                      aria-pressed={active}
                      className="flex w-full items-center gap-3 text-left"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-parchment">
                          {oracleInfo.name}
                        </span>
                        <span className="block truncate text-xs text-parchment-dim">
                          {interpolate(t.about.creditBy, {
                            author: oracleInfo.author,
                          })}{" "}
                          {oracleInfo.license}
                        </span>
                      </span>
                      {active && (
                        <IconCheck size={18} className="shrink-0 text-gold" />
                      )}
                    </button>
                    <a
                      href={oracleInfo.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="mt-2 flex items-center justify-center gap-1.5 rounded-xl border border-ink-border py-1.5 text-xs text-parchment-dim transition hover:text-gold"
                    >
                      {t.common.viewOriginal}
                      <IconExternalLink size={11} />
                    </a>
                  </div>
                );
              })}
            </div>

            <p className="mt-4 text-center text-xs text-parchment-dim/70">
              {t.oracleSwitcher.moreComingSoon}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
