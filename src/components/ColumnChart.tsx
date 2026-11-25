/**
 * Small columns for the statistics, one colour, with a line across at
 * `line` if given. Each column's `said` on hover and, all of them, for
 * screen readers.
 */
export function ColumnChart({ bars, line }: { bars: { label: string; value: number; said: string }[]; line?: number }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <div role="img" aria-label={bars.map((b) => b.said).join(", ")}>
      <div className="relative flex h-20 gap-[2px] border-b border-ink-border">
        {bars.map((b, i) => (
          // The whole column answers to the pointer, not just the bar.
          <span key={i} title={b.said} className="group flex h-full min-w-0 flex-1 items-end justify-center">
            <span
              className="w-full max-w-6 rounded-t bg-gold transition group-hover:bg-gold-soft"
              style={{ height: `${(b.value / max) * 100}%` }}
            />
          </span>
        ))}
        {/* Edged in the surface, to show over the bars too. */}
        {line !== undefined && (
          <span
            className="pointer-events-none absolute inset-x-0 h-px bg-parchment ring-1 ring-ink-900"
            style={{ bottom: `${(line / max) * 100}%` }}
          />
        )}
      </div>
      <div className="mt-1 flex gap-[2px] text-[0.65rem] leading-none tabular-nums text-parchment-dim">
        {bars.map((b, i) => (
          <span key={i} className="flex min-w-0 flex-1 justify-center whitespace-nowrap">
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}
