import { useState } from "react";
import { ORACLES } from "../lib/oracles";
import { useOracleContext } from "../hooks/useOracleContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { interpolate } from "../lib/i18n";
import { IconCheck, IconExternalLink, IconStar, IconSwap } from "./icons/Icons";
import { DialogBody, DialogHeader } from "./Dialog";
import { Modal } from "./Modal";

export function OracleSwitcher() {
  const { oracleId, setOracleId, favoriteOracleId, setFavoriteOracleId } = useOracleContext();
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
        <Modal
          onClose={() => setOpen(false)}
          label={t.oracleSwitcher.dialogTitle}
          size="lg"
        >
          <DialogHeader title={t.oracleSwitcher.dialogTitle} onClose={() => setOpen(false)} />
          <DialogBody>
            <div className="grid gap-2 md:grid-cols-2 md:gap-3">
              {ORACLES.map((oracleInfo) => {
                const active = oracleInfo.id === oracleId;
                const favorite = oracleInfo.id === favoriteOracleId;
                return (
                  <div
                    key={oracleInfo.id}
                    className={[
                      "flex flex-col justify-between rounded-2xl border p-3",
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
                        <span className="mt-0.5 block text-xs text-parchment">
                          {t.oracleSwitcher.blurb[oracleInfo.id]}
                        </span>
                        <span className="mt-0.5 block text-xs text-parchment-dim">
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
                    <div className="mt-2 flex gap-1.5">
                      {/* One favourite at a time: the oracle the app opens with. */}
                      <button
                        type="button"
                        onClick={() => setFavoriteOracleId(favorite ? null : oracleInfo.id)}
                        aria-pressed={favorite}
                        className={[
                          "flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-1.5 text-xs transition",
                          favorite
                            ? "border-gold/50 bg-gold/10 font-medium text-gold hover:bg-gold/20"
                            : "border-ink-border text-parchment-dim hover:text-gold",
                        ].join(" ")}
                      >
                        <IconStar size={12} filled={favorite} />
                        {favorite ? t.oracleSwitcher.favorite : t.oracleSwitcher.markFavorite}
                      </button>
                      <a
                        href={oracleInfo.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-ink-border py-1.5 text-xs text-parchment-dim transition hover:text-gold"
                      >
                        {t.common.viewOriginal}
                        <IconExternalLink size={11} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-center text-xs text-parchment-dim">{t.oracleSwitcher.favoriteHint}</p>
          </DialogBody>
        </Modal>
      )}
    </>
  );
}
