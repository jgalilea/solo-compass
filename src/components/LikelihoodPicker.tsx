import type { Likelihood } from "../lib/oracle";
import { useLocaleContext } from "../hooks/useLocaleContext";

const ORDER: Likelihood[] = [
  "muy-improbable",
  "improbable",
  "equilibrado",
  "probable",
  "muy-probable",
];

// En móvil las cinco etiquetas completas no caben en una fila (se
// cortaban: "Equilibrad…"), así que ahí se muestra una escala corta y
// debajo el nombre de la opción elegida. Desde sm caben enteras.
const SHORT: Record<Likelihood, string> = {
  "muy-improbable": "−−",
  improbable: "−",
  equilibrado: "=",
  probable: "+",
  "muy-probable": "++",
};

export function LikelihoodPicker({
  value,
  onChange,
}: {
  value: Likelihood;
  onChange: (v: Likelihood) => void;
}) {
  const { t } = useLocaleContext();

  return (
    <div className="flex flex-col gap-1.5">
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
              aria-label={t.likelihood[option]}
              onClick={() => onChange(option)}
              className={[
                "rounded-xl px-1 py-2 font-medium leading-tight transition",
                active
                  ? "bg-gold text-ink-950 shadow-sm"
                  : "text-parchment-dim hover:text-parchment",
              ].join(" ")}
              title={t.likelihood[option]}
            >
              <span aria-hidden className="text-base sm:hidden">
                {SHORT[option]}
              </span>
              <span aria-hidden className="hidden text-xs sm:inline">
                {t.likelihood[option]}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-center text-xs text-parchment-dim sm:hidden">
        {t.likelihoodGroupLabel}:{" "}
        <span className="font-medium text-parchment">{t.likelihood[value]}</span>
      </p>
    </div>
  );
}
