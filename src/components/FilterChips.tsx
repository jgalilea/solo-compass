/**
 * A row of chips to keep only one kind of what's listed (one chosen at a
 * time; tapping it again, or "all", shows everything). On phones the row
 * scrolls sideways instead of wrapping into several lines.
 */
export function FilterChips<T extends string>({
  label,
  allLabel,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  allLabel: string;
  options: readonly (readonly [T, string])[];
  value: T | null;
  onChange: (value: T | null) => void;
  /** Side margins and padding: how far the row scrolls to the edge of what holds it. */
  className: string;
}) {
  const chip = (selected: boolean) =>
    [
      "shrink-0 rounded-full border px-3 py-1.5 text-sm transition pointer-coarse:py-2",
      // Filled when selected: not colour alone (some themes' gold is near-white).
      selected
        ? "border-gold bg-gold font-medium text-ink-950"
        : "border-ink-border text-parchment-dim hover:border-gold/50 hover:text-gold",
    ].join(" ");
  return (
    <div role="group" aria-label={label} className={`overflow-x-auto lg:mx-0 lg:px-0 ${className}`}>
      <div className="flex gap-2 pb-1 lg:flex-wrap">
        <button type="button" aria-pressed={value === null} onClick={() => onChange(null)} className={chip(value === null)}>
          {allLabel}
        </button>
        {options.map(([id, name]) => (
          <button
            key={id}
            type="button"
            aria-pressed={value === id}
            onClick={() => onChange(value === id ? null : id)}
            className={chip(value === id)}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}
