import { DND_DICE, formatDieLabel, formatDieRoll, formatFudgeRoll, rollDie, rollFudgeSet } from "../lib/dice";

/**
 * Row of generic dice (d&d + Fudge/Fate) for the journal composer's
 * "Roll" kind — tapping one rolls it and appends the result, already
 * formatted in Lonelog notation, to the text, without leaving the app.
 */
export function DiceRoller({ onRoll, ariaLabel }: { onRoll: (text: string) => void; ariaLabel: string }) {
  const buttonClass =
    "rounded-lg border border-ink-border px-2.5 py-1.5 text-xs font-medium text-parchment-dim transition hover:border-gold/50 hover:text-gold active:scale-95";

  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-1.5">
      {DND_DICE.map((sides) => (
        <button
          key={sides}
          type="button"
          onClick={() => onRoll(formatDieRoll(sides, rollDie(sides)))}
          className={buttonClass}
        >
          {formatDieLabel(sides)}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onRoll(formatFudgeRoll(rollFudgeSet()))}
        className={buttonClass}
      >
        4dF
      </button>
    </div>
  );
}
