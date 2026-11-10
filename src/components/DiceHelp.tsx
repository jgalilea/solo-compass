import { useLocaleContext } from "../hooks/useLocaleContext";
import { HelpDialog, HelpHeading } from "./HelpDialog";

/**
 * "?" in the game table's dice: how a roll gets to the journal, what
 * the buttons roll, how to read a logged roll and, formula by formula,
 * how to write it (taken apart), examples with the line each one
 * leaves (rollFormula writes them, tested) and games that use it.
 */
export function DiceHelp() {
  const { t } = useLocaleContext();
  const help = t.diceHelp;

  return (
    <HelpDialog button={help.button} title={help.title}>
      <p className="text-sm text-parchment">{help.intro}</p>

      <div className="grid gap-5 md:grid-cols-2 md:gap-6">
        <section className="flex flex-col gap-2">
          <HelpHeading>{help.stepsHeading}</HelpHeading>
          <ol className="flex flex-col gap-2">
            {help.steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-parchment-dim">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-gold/40 text-xs font-semibold text-gold">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <div className="flex flex-col gap-5">
          <section className="flex flex-col gap-1.5">
            <HelpHeading>{help.buttonsHeading}</HelpHeading>
            <dl className="flex flex-col gap-1 text-sm">
              {help.buttons.map(({ label, text }) => (
                <div key={label}>
                  <dt className="inline font-medium text-parchment">{label}:</dt>{" "}
                  <dd className="inline text-parchment-dim">{text}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="flex flex-col gap-1.5">
            <HelpHeading>{help.symbolsHeading}</HelpHeading>
            <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1 text-sm">
              {help.symbols.map(({ symbol, text }) => (
                <div key={symbol} className="contents">
                  <dt className="font-mono text-xs font-semibold text-gold">{symbol}</dt>
                  <dd className="text-parchment-dim">{text}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>

      <section className="flex flex-col gap-3 border-t border-ink-border pt-5">
        <div className="flex flex-col gap-1">
          <HelpHeading>{help.formulasHeading}</HelpHeading>
          <p className="text-sm text-parchment-dim">{help.formulasIntro}</p>
        </div>
        <ul className="grid gap-3 lg:grid-cols-2">
          {help.formulas.map(({ name, formula, text, parts, examples, usedIn }) => (
            <li
              key={formula}
              className="flex flex-col gap-3 rounded-2xl border border-ink-border bg-ink-900/50 p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h4 className="text-base font-semibold text-parchment">{name}</h4>
                <code className="font-mono text-sm font-semibold text-gold">{formula}</code>
              </div>
              <p className="text-sm text-parchment-dim">{text}</p>

              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium text-parchment">{help.partsLabel}</p>
                <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1.5 text-sm">
                  {parts.map(({ token, text }) => (
                    <div key={token} className="contents">
                      <dt>
                        <code className="rounded-md border border-gold/30 bg-gold/10 px-1.5 py-0.5 font-mono text-xs font-semibold text-gold">
                          {token}
                        </code>
                      </dt>
                      <dd className="text-parchment-dim">{text}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium text-parchment">{help.examplesLabel}</p>
                <ul className="flex flex-col gap-1.5">
                  {examples.map(({ line, text }) => (
                    <li key={line} className="rounded-lg bg-ink-950/50 px-2.5 py-1.5">
                      <code className="block break-words font-mono text-xs text-parchment">{line}</code>
                      <span className="text-xs text-parchment-dim">{text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="mt-auto text-xs text-parchment-dim/80">
                <span className="font-medium text-parchment-dim">{help.usedInLabel}:</span> {usedIn}
              </p>
            </li>
          ))}
          {/* Last card: with the formulas it fills the grid's last row on desktop. */}
          <li className="flex flex-col gap-2 rounded-2xl border border-dashed border-ink-border p-4">
            <h4 className="text-base font-semibold text-parchment">{help.rulesHeading}</h4>
            <ul className="flex list-disc flex-col gap-1.5 pl-4 text-sm text-parchment-dim marker:text-gold">
              {help.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </li>
        </ul>
      </section>
    </HelpDialog>
  );
}
