import { LIKELIHOOD_LABELS, type Likelihood } from "../lib/oracle";

const ORDER: Likelihood[] = [
  "muy-improbable",
  "improbable",
  "equilibrado",
  "probable",
  "muy-probable",
];

export function LikelihoodPicker({
  value,
  onChange,
}: {
  value: Likelihood;
  onChange: (v: Likelihood) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-parchment-dim">
        Probabilidad del suceso
      </p>
      <div
        role="radiogroup"
        aria-label="Probabilidad del suceso"
        className="grid grid-cols-5 gap-1 rounded-full border border-ink-border bg-ink-900/60 p-1"
      >
        {ORDER.map((option) => {
          const active = option === value;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option)}
              className={[
                "rounded-full px-1.5 py-1.5 text-[11px] font-medium leading-tight transition sm:text-xs",
                active
                  ? "bg-gold text-ink-950 shadow-sm"
                  : "text-parchment-dim hover:text-parchment",
              ].join(" ")}
              title={LIKELIHOOD_LABELS[option]}
            >
              {LIKELIHOOD_LABELS[option]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
