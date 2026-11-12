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

const SIZES = { lg: 72, md: 56, sm: 40 };

function DieFace({ color }: { color: DieColor }) {
  const isWhite = color === "blanco";
  return (
    <rect
      x="4"
      y="4"
      width="92"
      height="92"
      rx="18"
      fill={isWhite ? "var(--color-die-white)" : "var(--color-die-black)"}
      // The black die's edge is light enough to stand out on a dark card.
      stroke={isWhite ? "#c9c2b2" : "#636878"}
      strokeWidth={isWhite ? 2 : 2.5}
    />
  );
}

/** A die yet to be thrown: the outline of its face, barely filled (decorative). */
export function BlankDie({ color, size = "md" }: { color: DieColor; size?: keyof typeof SIZES }) {
  const isWhite = color === "blanco";
  return (
    // The outline in the theme's own faint text colour: it shows on a
    // light card as well as on a dark one.
    <svg viewBox="0 0 100 100" width={SIZES[size]} height={SIZES[size]} aria-hidden className="text-parchment-faint">
      <rect
        x="4"
        y="4"
        width="92"
        height="92"
        rx="18"
        fill={isWhite ? "var(--color-die-white)" : "var(--color-die-black)"}
        fillOpacity={isWhite ? 0.22 : 0.6}
        stroke="currentColor"
        strokeWidth="2.5"
        strokeDasharray="7 6"
      />
    </svg>
  );
}

export function Die({
  value,
  color,
  size = "md",
  animate = false,
  faded = false,
  name,
}: {
  value: number;
  color: DieColor;
  size?: keyof typeof SIZES;
  animate?: boolean;
  faded?: boolean;
  /** What the die is called, if not its colour (an oracle's "chance" die). */
  name?: string;
}) {
  const { t } = useLocaleContext();
  // Pips for a d6; any other value (a d100) is written as a number.
  const pips = PIP_LAYOUTS[value] ?? [];
  const numeral = !PIP_LAYOUTS[value];
  const dims = SIZES[size];

  const isWhite = color === "blanco";

  return (
    <svg
      viewBox="0 0 100 100"
      width={dims}
      height={dims}
      role="img"
      aria-label={interpolate(t.die.ariaLabel, {
        color: name ?? t.die.color[color],
        value,
      })}
      className={[
        animate ? "animate-die-roll" : "",
        faded ? "opacity-40" : "",
        "drop-shadow-md",
      ].join(" ")}
    >
      <DieFace color={color} />
      {numeral && (
        <text
          x="50"
          y="52"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={value >= 100 ? 34 : 44}
          fontWeight="700"
          fill={isWhite ? "var(--color-die-black)" : "var(--color-die-white)"}
        >
          {value}
        </text>
      )}
      {pips.map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={7}
          fill={isWhite ? "var(--color-die-black)" : "var(--color-die-white)"}
        />
      ))}
    </svg>
  );
}
