import { interpolate } from "../lib/i18n";
import { useLocaleContext } from "../hooks/useLocaleContext";

const PIP_LAYOUTS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [
    [28, 28],
    [72, 72],
  ],
  3: [
    [28, 28],
    [50, 50],
    [72, 72],
  ],
  4: [
    [28, 28],
    [72, 28],
    [28, 72],
    [72, 72],
  ],
  5: [
    [28, 28],
    [72, 28],
    [50, 50],
    [28, 72],
    [72, 72],
  ],
  6: [
    [28, 25],
    [72, 25],
    [28, 50],
    [72, 50],
    [28, 75],
    [72, 75],
  ],
};

export type DieColor = "blanco" | "negro";

export function Die({
  value,
  color,
  size = "md",
  animate = false,
  faded = false,
}: {
  value: number;
  color: DieColor;
  size?: "sm" | "md" | "lg";
  animate?: boolean;
  faded?: boolean;
}) {
  const { t } = useLocaleContext();
  const pips = PIP_LAYOUTS[value] ?? [];
  const dims = size === "lg" ? 72 : size === "md" ? 56 : 40;

  const isWhite = color === "blanco";

  return (
    <svg
      viewBox="0 0 100 100"
      width={dims}
      height={dims}
      role="img"
      aria-label={interpolate(t.die.ariaLabel, {
        color: t.die.color[color],
        value,
      })}
      className={[
        animate ? "animate-die-roll" : "",
        faded ? "opacity-40" : "",
        "drop-shadow-md",
      ].join(" ")}
    >
      <rect
        x="4"
        y="4"
        width="92"
        height="92"
        rx="18"
        fill={isWhite ? "var(--color-parchment)" : "#20222b"}
        stroke={isWhite ? "#c9c2b2" : "#3a3d4a"}
        strokeWidth="2"
      />
      {pips.map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={7}
          fill={isWhite ? "#20222b" : "var(--color-parchment)"}
        />
      ))}
    </svg>
  );
}
