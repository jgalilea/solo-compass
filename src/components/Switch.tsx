import type { ReactNode } from "react";

/**
 * An on/off setting: a sliding knob (filled in the accent when on) and
 * its label, read by screen readers as a switch. For an option that
 * stays as it is (no cards repeat, test the scene), not an action.
 */
export function Switch({
  checked,
  onChange,
  children,
  describedBy,
  className = "",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  describedBy?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-describedby={describedBy}
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 text-left text-xs text-parchment-dim transition hover:text-parchment ${className}`}
    >
      <span
        aria-hidden
        className={[
          "relative h-4 w-7 shrink-0 rounded-full border transition",
          checked ? "border-gold bg-gold" : "border-ink-border bg-ink-900",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-1/2 size-3 -translate-y-1/2 rounded-full transition-all",
            checked ? "left-3 bg-ink-950" : "left-0.5 bg-parchment-dim",
          ].join(" ")}
        />
      </span>
      {children}
    </button>
  );
}
