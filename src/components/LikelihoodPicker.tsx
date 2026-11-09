import type { Likelihood } from "../lib/oracle";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { IconEquals, IconMinus, IconPlus } from "./icons/Icons";

const ORDER: Likelihood[] = [
  "muy-improbable",
  "improbable",
  "equilibrado",
  "probable",
  "muy-probable",
];

// The five full labels don't fit in a narrow row (they got cut off:
// "Equilibrad…"), so there a short scale is shown with the chosen
// option's name below. It depends on the picker's own width
// (container query), not the screen's: on desktop it also lives in
// the game table's narrow column.
// The scale uses icons, not typed "+"/"−": some themes' fonts (OSR,
// fantasy) draw the "+" as a cross.
const SHORT: Record<Likelihood, { Icon: typeof IconPlus; count: number }> = {
  "muy-improbable": { Icon: IconMinus, count: 2 },
  improbable: { Icon: IconMinus, count: 1 },
  equilibrado: { Icon: IconEquals, count: 1 },
  probable: { Icon: IconPlus, count: 1 },
  "muy-probable": { Icon: IconPlus, count: 2 },
};

function ShortScale({ option }: { option: Likelihood }) {
  const { Icon, count } = SHORT[option];
  return (
    <span aria-hidden className="flex items-center justify-center -space-x-0.5 @md:hidden">
      {Array.from({ length: count }, (_, i) => (
        <Icon key={i} size={15} strokeWidth={2.25} />
      ))}
    </span>
  );
}

export function LikelihoodPicker({
  value,
  onChange,
  levels = ORDER,
}: {
  value: Likelihood;
  onChange: (v: Likelihood) => void;
  /** The ones the oracle offers (oracleLevels): three for Loner and OPSE. */
  levels?: Likelihood[];
}) {
  const { t } = useLocaleContext();

  return (
    <div className="@container flex flex-col gap-1.5">
      <div
        role="radiogroup"
        aria-label={t.likelihoodGroupLabel}
        className={`grid ${levels.length === 3 ? "grid-cols-3" : "grid-cols-5"} gap-1 rounded-2xl border border-ink-border bg-ink-900/60 p-1.5`}
      >
        {levels.map((option) => {
          const active = option === value;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={t.likelihood[option]}
              onClick={() => onChange(option)}
              className={[
                "flex min-h-9 items-center justify-center rounded-xl px-1 py-2 font-medium leading-tight transition",
                active
                  ? "bg-gold text-ink-950 shadow-sm"
                  : "text-parchment-dim hover:text-parchment",
              ].join(" ")}
              title={t.likelihood[option]}
            >
              <ShortScale option={option} />
              <span aria-hidden className="hidden text-xs @md:inline">
                {t.likelihood[option]}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-center text-xs text-parchment-dim @md:hidden">
        {t.likelihoodGroupLabel}:{" "}
        <span className="font-medium text-parchment">{t.likelihood[value]}</span>
      </p>
    </div>
  );
}
