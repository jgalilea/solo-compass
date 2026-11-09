import { useLocaleContext } from "../hooks/useLocaleContext";
import { useOracleContext } from "../hooks/useOracleContext";
import { interpolate } from "../lib/i18n";
import { getOracle } from "../lib/oracles";
import { oracleLevels, oracleOdds, oracleTarget, type OracleId, type OracleOdds } from "../lib/oracleEngines";
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
  const rules = help.rules[oracle.id];

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
              {[...help.answers, ...(rules.special ? [rules.special] : [])].map(({ label, text }) => (
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

      <div className="flex flex-col gap-1.5">
        <HelpHeading>{rules.heading}</HelpHeading>
        <p className="text-sm text-parchment-dim">{rules.text}</p>
      </div>

      <OddsTable oracleId={oracle.id} />

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

/**
 * What comes up at each likelihood with this oracle, worked out from
 * every possible roll (oracleOdds), so it always matches the dice.
 */
function OddsTable({ oracleId }: { oracleId: OracleId }) {
  const { t, locale } = useLocaleContext();
  const help = t.oracleHelp;
  const special = help.oddsSpecial[oracleId];
  const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
  const format = (value: number) => (value > 0 && value < 0.005 ? "<1 %" : percent.format(value));
  const columns: { label: string; value: (odds: OracleOdds) => number; className: string }[] = [
    { label: help.oddsColumns.yes, value: (o) => o.yes, className: "text-yes" },
    { label: help.oddsColumns.no, value: (o) => o.no, className: "text-no" },
    { label: `…${help.oddsColumns.and}`, value: (o) => o.and, className: "whitespace-nowrap text-parchment" },
    { label: `…${help.oddsColumns.but}`, value: (o) => o.but, className: "whitespace-nowrap text-parchment" },
    ...(special
      ? [{ label: special, value: (o: OracleOdds) => o.contradiction + o.special, className: "text-contradiction" }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-1.5">
      <HelpHeading>{help.oddsHeading}</HelpHeading>
      <p className="text-sm text-parchment-dim">{help.oddsIntro}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs tabular-nums sm:text-sm">
          <thead>
            <tr className="border-b border-ink-border text-xs text-parchment-dim">
              <th scope="col" className="py-1.5 pr-2 text-left align-bottom font-medium">
                {help.oddsColumns.likelihood}
              </th>
              {columns.map((c) => (
                <th key={c.label} scope="col" className={`hyphens-auto px-1 py-1.5 text-right align-bottom font-medium sm:px-1.5 ${c.className}`}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {oracleLevels(oracleId).map((level) => {
              const odds = oracleOdds(oracleId, level);
              return (
                <tr key={level} className="border-b border-ink-border/50 last:border-0">
                  <th scope="row" className="py-1.5 pr-2 text-left font-normal text-parchment">
                    {t.likelihood[level]}
                    {oracleTarget(oracleId, level) !== undefined && (
                      <span className="ml-1 text-xs text-parchment-dim">({oracleTarget(oracleId, level)}+)</span>
                    )}
                  </th>
                  {columns.map((c) => (
                    <td key={c.label} className="whitespace-nowrap px-1 py-1.5 text-right text-parchment-dim sm:px-1.5">
                      {format(c.value(odds))}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
