import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { countTicks } from "../lib/chartTicks";

/**
 * Small columns for the statistics, one colour, with the values at the
 * left and what each axis is. A line across at `line`, if given, with what it is below. Picking
 * a column (a tap, sliding a finger along, the arrow keys) shows its
 * detail (`said`) below, on a line that's always there; picking it again
 * leaves the chart as it was.
 */
export function ColumnChart({
  bars,
  yLabel,
  xLabel,
  line,
}: {
  bars: { label: string; value: number; said: string }[];
  yLabel: string;
  xLabel: string;
  line?: { at: number; label: string };
}) {
  const { t } = useLocaleContext();
  const [picked, setPicked] = useState<number | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const detail = picked === null ? undefined : bars[picked]?.said;

  // By where in the plot, not which bar: on a phone a d20's are thin.
  function columnAt(e: PointerEvent<HTMLElement>) {
    const { left, width } = e.currentTarget.getBoundingClientRect();
    const i = Math.floor(((e.clientX - left) / width) * bars.length);
    return Math.min(bars.length - 1, Math.max(0, i));
  }
  // The one already picked when it was pressed: letting go of it, without
  // having slid to another, unpicks it.
  const pressedAgain = useRef<number | null>(null);
  function handleDown(e: PointerEvent<HTMLElement>) {
    const i = columnAt(e);
    pressedAgain.current = i === picked ? i : null;
    setPicked(i);
  }
  function handleMove(e: PointerEvent<HTMLElement>) {
    if (e.buttons === 0) return;
    const i = columnAt(e);
    if (i !== pressedAgain.current) pressedAgain.current = null;
    setPicked(i);
  }
  function handleUp() {
    if (pressedAgain.current !== null) setPicked(null);
    pressedAgain.current = null;
  }
  function moveWithKeys(e: KeyboardEvent<HTMLElement>) {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = Math.min(bars.length - 1, Math.max(0, (picked ?? 0) + step));
    setPicked(next);
    plotRef.current?.querySelectorAll("button")[next]?.focus();
  }

  const ticks = countTicks(Math.max(0, ...bars.map((b) => b.value)));
  const top = ticks.at(-1)!;
  const at = (value: number) => `${(value / top) * 100}%`;
  return (
    <div className="flex flex-col gap-2">
      <p aria-hidden className="text-[0.65rem] leading-none text-parchment-dim">
        {yLabel}
      </p>
      <div
        role="group"
        aria-label={`${yLabel}. ${xLabel}`}
        className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 text-[0.65rem] leading-none tabular-nums text-parchment-dim"
      >
        {/* As wide as its longest value: the one in the flow, unseen. */}
        <div aria-hidden className="relative h-24">
          <span className="invisible">{top}</span>
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 translate-y-1/2"
              style={{ bottom: at(tick) }}
            >
              {tick}
            </span>
          ))}
        </div>
        <div
          ref={plotRef}
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={handleUp}
          onKeyDown={moveWithKeys}
          className="relative flex h-24 touch-pan-y border-b border-ink-border"
        >
          {ticks.slice(1).map((tick) => (
            <span
              key={tick}
              className="pointer-events-none absolute inset-x-0 border-t border-ink-border/50"
              style={{ bottom: at(tick) }}
            />
          ))}
          {bars.map((b, i) => (
            <button
              key={i}
              type="button"
              aria-label={b.said}
              aria-pressed={picked === i}
              title={b.said}
              // One stop for the keyboard; the arrows move along the rest.
              tabIndex={i === (picked ?? 0) ? 0 : -1}
              // The keyboard's: the pointer is taken care of by the plot.
              onClick={(e) => e.detail === 0 && setPicked(picked === i ? null : i)}
              className="group relative flex h-full min-w-0 flex-1 items-end justify-center px-px"
            >
              <span
                className={`w-full max-w-6 rounded-t bg-gold transition group-hover:bg-gold-soft ${picked === null || picked === i ? "" : "opacity-40"}`}
                style={{ height: at(b.value) }}
              />
            </button>
          ))}
          {/* Edged in the surface, to show over the bars too. */}
          {line !== undefined && (
            <span
              className="pointer-events-none absolute inset-x-0 h-px bg-parchment ring-1 ring-ink-900"
              style={{ bottom: at(line.at) }}
            />
          )}
        </div>
        <div aria-hidden className="col-start-2 mt-1.5 flex">
          {bars.map((b, i) => (
            <span key={i} className="flex min-w-0 flex-1 justify-center whitespace-nowrap">
              {b.label}
            </span>
          ))}
        </div>
      </div>
      <p aria-hidden className="text-center text-[0.65rem] leading-none text-parchment-dim">
        {xLabel}
      </p>
      {line && (
        <p className="flex items-center justify-center gap-1.5 text-[0.65rem] leading-none text-parchment-dim">
          <span aria-hidden className="h-px w-4 shrink-0 bg-parchment" />
          {line.label}
        </p>
      )}
      <p
        aria-hidden
        className={`min-h-[2lh] text-center md:min-h-[1lh] text-xs ${detail ? "font-medium text-parchment" : "text-parchment-faint"}`}
      >
        {detail ?? t.journal.stats.chartHint}
      </p>
    </div>
  );
}
