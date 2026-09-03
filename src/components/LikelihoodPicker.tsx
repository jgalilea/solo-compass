import type { Likelihood } from "../lib/oracle";
import { useLocaleContext } from "../hooks/useLocaleContext";

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
  const { t } = useLocaleContext();

  return (
    <div
      role="radiogroup"
      aria-label={t.likelihoodGroupLabel}
      className="grid grid-cols-5 gap-1 rounded-2xl border border-ink-border bg-ink-900/60 p-1.5"
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
              "rounded-xl px-1 py-2 text-[11px] font-medium leading-tight transition",
              active
                ? "bg-gold text-ink-950 shadow-sm"
                : "text-parchment-dim hover:text-parchment",
            ].join(" ")}
            title={t.likelihood[option]}
          >
            {t.likelihood[option]}
          </button>
        );
      })}
    </div>
  );
}
