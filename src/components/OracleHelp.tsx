import { useLocaleContext } from "../hooks/useLocaleContext";
import { useOracleContext } from "../hooks/useOracleContext";
import { interpolate } from "../lib/i18n";
import { getOracle } from "../lib/oracles";
import { HelpDialog, HelpHeading } from "./HelpDialog";
import { IconExternalLink } from "./icons/Icons";

/**
 * "?" next to the oracle's name: a short guide for someone new to solo
 * play (ask, pick a likelihood, read the answer). Deliberately not the
 * oracle's rules: those are in the original, linked at the end.
 */
export function OracleHelp() {
  const { t } = useLocaleContext();
  const { oracleId } = useOracleContext();
  const oracle = getOracle(oracleId);
  const help = t.oracleHelp;

  return (
    <HelpDialog button={help.button} title={help.title}>
      <p className="text-sm text-parchment">{help.intro}</p>
      <div className="grid gap-5 md:grid-cols-2 md:gap-6">
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

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <HelpHeading>{help.answersHeading}</HelpHeading>
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
        </div>
      </div>

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
    </HelpDialog>
  );
}
