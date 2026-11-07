import { useState } from "react";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { useOracleContext } from "../hooks/useOracleContext";
import { interpolate } from "../lib/i18n";
import { getOracle } from "../lib/oracles";
import { Modal } from "./Modal";
import { IconClose, IconExternalLink, IconHelp } from "./icons/Icons";

/**
 * "?" next to the oracle's name: a short guide for someone new to solo
 * play (ask, pick a likelihood, read the answer). Deliberately not the
 * oracle's rules: those are in the original, linked at the end.
 */
export function OracleHelp() {
  const { t } = useLocaleContext();
  const { oracleId } = useOracleContext();
  const [open, setOpen] = useState(false);
  const oracle = getOracle(oracleId);
  const help = t.oracleHelp;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={help.button}
        title={help.button}
        className="-m-1 rounded-full p-1 text-parchment-dim transition hover:text-gold"
      >
        <IconHelp size={20} />
      </button>

      {open && (
        <Modal
          onClose={() => setOpen(false)}
          label={help.title}
          className="flex max-h-[85dvh] w-full max-w-md flex-col gap-4 overflow-y-auto overscroll-contain rounded-t-3xl border border-ink-border bg-ink-800 p-5 shadow-2xl sm:rounded-3xl sm:p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg text-parchment">{help.title}</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t.common.close}
              className="-m-1 p-1 text-parchment-dim transition hover:text-parchment"
            >
              <IconClose size={16} />
            </button>
          </div>

          <p className="text-sm text-parchment">{help.intro}</p>
          <ol className="flex flex-col gap-2.5">
            {help.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-parchment-dim">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-gold/40 text-xs font-semibold text-gold">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>

          <div className="flex flex-col gap-1.5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gold">{help.answersHeading}</h3>
            <dl className="flex flex-col gap-1 text-sm">
              {help.answers.map(({ label, text }) => (
                <div key={label}>
                  <dt className="inline font-medium text-parchment">{label}:</dt>{" "}
                  <dd className="inline text-parchment-dim">{text}</dd>
                </div>
              ))}
            </dl>
          </div>

          <p className="text-sm text-parchment-dim">{help.stuck}</p>

          <div className="flex flex-col gap-2 border-t border-ink-border pt-4">
            <p className="text-xs text-parchment-dim/80">
              {interpolate(help.credit, { name: oracle.name, author: oracle.author, license: oracle.license })}
            </p>
            <a
              href={oracle.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-xl border border-ink-border py-1.5 text-xs text-parchment-dim transition hover:text-gold"
            >
              {t.common.viewOriginal}
              <IconExternalLink size={11} />
            </a>
          </div>
        </Modal>
      )}
    </>
  );
}
