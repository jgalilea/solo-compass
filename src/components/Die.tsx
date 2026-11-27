import type { SVGProps } from "react";
import type { RolledDie } from "../lib/rolledDice";
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

const SIZES = { lg: 72, md: 56, sm: 40, xs: 28 };

interface Shape {
  /** The die's outline; none for the d6's rounded square and the d100's ball. */
  hull?: string;
  /** The edges seen inside it. */
  edges: string;
  /** Where its number goes, and how big (two digits). */
  y: number;
  font: number;
}

/** The corners of a regular polygon, the first one at the top. */
function corners(n: number, r: number): [number, number][] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * 2 * Math.PI - Math.PI / 2;
    return [
      Math.round((50 + r * Math.cos(a)) * 10) / 10,
      Math.round((50 + r * Math.sin(a)) * 10) / 10,
    ];
  });
}

const closed = (points: [number, number][]) => `M${points.map((p) => p.join(" ")).join("L")}Z`;

/** A face's outline, and an edge from each of its corners to the hull's. */
function faceEdges(face: [number, number][], hull: [number, number][]): string {
  const step = hull.length / face.length;
  return closed(face) + face.map((p, i) => `M${p.join(" ")}L${hull[i * step]!.join(" ")}`).join("");
}

const HEXAGON = corners(6, 47);
const OCTAGON = corners(8, 47);
const DECAGON = corners(10, 47);

const SQUARE: Shape = { edges: "", y: 52, font: 44 };
const KITE: Shape = {
  hull: "M50 3L96 42V57L50 97L4 57V42Z",
  edges: "M50 3L82 56L50 71L18 56ZM82 56L96 57M18 56L4 57M50 71V97",
  y: 45,
  font: 32,
};

/**
 * Each die seen from the front, its top face towards you. Any other is
 * a plain square, like a d6 with its number written.
 */
const SHAPES: Record<number, Shape> = {
  4: { hull: "M50 8L95 89H5Z", edges: "", y: 65, font: 34 },
  8: { hull: "M50 3L95 61L50 97L5 61Z", edges: "M5 61H95", y: 41, font: 34 },
  10: KITE,
  12: { hull: closed(DECAGON), edges: faceEdges(corners(5, 33), DECAGON), y: 51, font: 34 },
  14: KITE,
  16: KITE,
  20: { hull: closed(HEXAGON), edges: faceEdges(corners(3, 39), HEXAGON), y: 54, font: 30 },
  24: { hull: closed(OCTAGON), edges: faceEdges(corners(4, 36), OCTAGON), y: 51, font: 32 },
  30: {
    hull: closed(DECAGON),
    edges: "M50 14L80 50L50 86L20 50ZM50 14V3M50 86V97M80 50H95M20 50H5",
    y: 51,
    font: 32,
  },
  100: { edges: "", y: 51, font: 42 },
};

function Outline({
  sides,
  shape,
  ...paint
}: { sides: number; shape: Shape } & SVGProps<SVGElement>) {
  if (sides === 100)
    return <circle cx="50" cy="50" r="46" {...(paint as SVGProps<SVGCircleElement>)} />;
  if (!shape.hull)
    return (
      <rect x="4" y="4" width="92" height="92" rx="18" {...(paint as SVGProps<SVGRectElement>)} />
    );
  return <path d={shape.hull} strokeLinejoin="round" {...(paint as SVGProps<SVGPathElement>)} />;
}

/** A die yet to be thrown: the outline of its face, barely filled (decorative). */
export function BlankDie({
  color,
  sides = 6,
  size = "md",
}: {
  color: DieColor;
  sides?: number;
  size?: keyof typeof SIZES;
}) {
  const isWhite = color === "blanco";
  return (
    // The outline in the theme's own faint text colour: it shows on a
    // light card as well as on a dark one.
    <svg
      viewBox="0 0 100 100"
      width={SIZES[size]}
      height={SIZES[size]}
      aria-hidden
      className="text-parchment-faint"
    >
      <Outline
        sides={sides}
        shape={SHAPES[sides] ?? SQUARE}
        fill={isWhite ? "var(--color-die-white)" : "var(--color-die-black)"}
        fillOpacity={isWhite ? 0.22 : 0.6}
        stroke="currentColor"
        strokeWidth="2.5"
        strokeDasharray="7 6"
      />
    </svg>
  );
}

/** A die's silhouette, in the colour of the text beside it (a button that rolls it). */
export function DieOutline({ sides, size = 28 }: { sides: number; size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
      <Outline
        sides={sides}
        shape={SHAPES[sides] ?? SQUARE}
        fill="currentColor"
        fillOpacity={0.14}
        stroke="currentColor"
        strokeWidth="5"
      />
    </svg>
  );
}

/** How a die counted, as a badge on its corner: shape and colour. */
const BADGES: Record<"hit" | "miss" | "high" | "low", { color: string; d: string }> = {
  hit: { color: "var(--color-yes)", d: "M75 83L81 89L91 77" },
  miss: { color: "var(--color-no)", d: "M77 77L89 89M89 77L77 89" },
  high: { color: "var(--color-yes)", d: "M83 75L91 89H75Z" },
  low: { color: "var(--color-no)", d: "M83 91L91 77H75Z" },
};

export function Die({
  value,
  sides = 6,
  color,
  size = "md",
  animate = false,
  faded = false,
  name,
  mark,
}: {
  value: number;
  /** Its faces, which give it its shape; 0 for a Fudge die. */
  sides?: number;
  color: DieColor;
  size?: keyof typeof SIZES;
  animate?: boolean;
  faded?: boolean;
  /** What the die is called, if not its colour (an oracle's "chance" die). */
  name?: string;
  mark?: RolledDie["mark"];
}) {
  const { t } = useLocaleContext();
  const full = SHAPES[sides] ?? SQUARE;
  // Tiny, only the silhouette and a bigger number.
  const shape = size === "xs" ? { ...full, edges: "", y: sides === 4 ? 64 : 52, font: 44 } : full;
  // Pips for a d6; any other die has its number written, and a Fudge
  // die its sign (or nothing).
  const pips = sides === 6 ? PIP_LAYOUTS[value] : undefined;
  const digits = String(value).length;
  const badge = mark && mark !== "out" ? BADGES[mark] : null;

  const isWhite = color === "blanco";
  const ink = isWhite ? "var(--color-die-black)" : "var(--color-die-white)";
  // The black die's edge is light enough to stand out on a dark card.
  const edge = isWhite ? "#c9c2b2" : "#636878";

  return (
    <svg
      viewBox="0 0 100 100"
      width={SIZES[size]}
      height={SIZES[size]}
      role="img"
      aria-label={interpolate(t.die.ariaLabel, {
        color: name ?? t.die.color[color],
        value,
      })}
      className={[animate ? "animate-die-roll" : "", "shrink-0 drop-shadow-md"].join(" ")}
      // Not classes: the HTML export has the same drawing without them.
      opacity={faded ? 0.4 : undefined}
      style={{ overflow: "visible" }}
    >
      <Outline
        sides={sides}
        shape={shape}
        fill={isWhite ? "var(--color-die-white)" : "var(--color-die-black)"}
        stroke={edge}
        strokeWidth={size === "xs" ? 5 : isWhite ? 2 : 2.5}
      />
      {shape.edges && (
        <path d={shape.edges} fill="none" stroke={edge} strokeWidth="2" strokeLinejoin="round" />
      )}
      {sides === 0 ? (
        value !== 0 && (
          <path
            d={value > 0 ? "M28 50H72M50 28V72" : "M28 50H72"}
            stroke={ink}
            strokeWidth="10"
            strokeLinecap="round"
          />
        )
      ) : pips ? (
        pips.map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r={7} fill={ink} />)
      ) : (
        <text
          x="50"
          y={shape.y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={digits > 2 ? shape.font * 0.77 : shape.font}
          fontWeight="700"
          fill={ink}
        >
          {value}
        </text>
      )}
      {badge && (
        // Half off the corner (clear of a six's pips), with a rim: in some
        // themes its colour is the die's.
        <g
          transform="translate(8 8)"
          stroke="var(--color-ink-950)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="83" cy="83" r="16" fill={badge.color} />
          <path d={badge.d} fill="none" />
        </g>
      )}
    </svg>
  );
}
