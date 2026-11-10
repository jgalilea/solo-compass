import { useLocaleContext } from "../hooks/useLocaleContext";
import { IconMinus, IconPlus } from "./icons/Icons";

/**
 * A small number with −/+ on either side, instead of the browser's
 * spinners (which don't follow the themes). The field can still be
 * typed into; the value is always kept within min and max.
 */
export function NumberField({
  value,
  onChange,
  min = 0,
  max = Infinity,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
}) {
  const { t } = useLocaleContext();
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  const stepClass =
    "flex size-8 shrink-0 items-center justify-center text-parchment-dim transition hover:text-gold disabled:text-parchment-dim/30 disabled:hover:text-parchment-dim/30";
  return (
    <div className="flex flex-none items-center rounded-xl border border-ink-border bg-ink-900/70 focus-within:border-gold">
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= min}
        aria-label={t.common.decrease}
        className={stepClass}
      >
        <IconMinus size={14} />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={Number.isFinite(max) ? max : undefined}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(clamp(Number(e.target.value) || min))}
        // Selected on focus so typing replaces the number.
        onFocus={(e) => e.target.select()}
        className="w-10 min-w-0 bg-transparent py-1 text-center text-base tabular-nums text-parchment focus:outline-none"
      />
      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
        aria-label={t.common.increase}
        className={stepClass}
      >
        <IconPlus size={14} />
      </button>
    </div>
  );
}
