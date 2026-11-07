import { useLocaleContext } from "../hooks/useLocaleContext";
import { HelpDialog, HelpHeading } from "./HelpDialog";

/**
 * "?" in the game table's dice: how the rolls pile up into one entry,
 * what the buttons roll and the formulas rollFormula reads, each with
 * the line it leaves in the journal.
 */
export function DiceHelp() {
  const { t } = useLocaleContext();
  const help = t.diceHelp;

  return (
    <HelpDialog button={help.button} title={help.title}>
      <p className="text-sm text-parchment">{help.intro}</p>

      <div className="flex flex-col gap-1.5">
        <HelpHeading>{help.buttonsHeading}</HelpHeading>
        <dl className="flex flex-col gap-1 text-sm">
          {help.buttons.map(({ label, text }) => (
            <div key={label}>
              <dt className="inline font-medium text-parchment">{label}:</dt>{" "}
              <dd className="inline text-parchment-dim">{text}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="flex flex-col gap-2">
        <HelpHeading>{help.formulasHeading}</HelpHeading>
        <ul className="flex flex-col gap-2.5">
          {help.formulas.map(({ formula, text, example }) => (
            <li key={formula} className="flex flex-col gap-1 rounded-xl border border-ink-border bg-ink-900/50 px-3 py-2">
              <code className="font-mono text-sm font-semibold text-gold">{formula}</code>
              <p className="text-sm text-parchment-dim">{text}</p>
              <p className="font-mono text-xs text-parchment-dim/80">{example}</p>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-sm text-parchment-dim">{help.reading}</p>
      <p className="text-sm text-parchment-dim">{help.tip}</p>
    </HelpDialog>
  );
}
