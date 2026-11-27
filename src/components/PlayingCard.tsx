import type { ComponentType } from "react";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { cardLook, type CardLook } from "../lib/cards";
import {
  IconJoker,
  IconMajorArcana,
  IconSuitClubs,
  IconSuitCups,
  IconSuitDiamonds,
  IconSuitHearts,
  IconSuitPentacles,
  IconSuitSpades,
  IconSuitSwords,
  IconSuitWands,
} from "./icons/Icons";

const SUIT_ICONS: Record<string, ComponentType<{ size?: number; x?: number; y?: number }>> = {
  h: IconSuitHearts,
  d: IconSuitDiamonds,
  c: IconSuitClubs,
  s: IconSuitSpades,
  Wa: IconSuitWands,
  Cu: IconSuitCups,
  Sw: IconSuitSwords,
  Pe: IconSuitPentacles,
};

function isRed(look: CardLook): boolean {
  if (look.kind === "joker") return look.red;
  return look.kind === "poker" && (look.suit === "h" || look.suit === "d");
}

/**
 * A drawn card, as it lies on the table: its suit in the middle and its
 * value in two corners (standard deck, the same either way up) or once
 * at the top (tarot: a reversed card lies upside down, and it has to
 * show). On the white die's colour in every
 * theme, like the oracle's dice. Decorative: the card's name goes
 * beside it. Nothing for an id that isn't a card. `small` (a one-line
 * row, RecentRolls): the value once, over the suit.
 */
export function PlayingCard({
  id,
  animate = false,
  small = false,
}: {
  id: string;
  animate?: boolean;
  small?: boolean;
}) {
  const { locale } = useLocaleContext();
  const look = cardLook(id, locale);
  if (!look) return null;
  const Suit =
    look.kind === "joker"
      ? IconJoker
      : look.kind === "major"
        ? IconMajorArcana
        : SUIT_ICONS[look.suit];
  const value = look.kind === "joker" ? "" : look.kind === "major" ? look.numeral : look.rank;
  const tarot = look.kind === "major" || look.kind === "minor";
  const reversed = tarot && look.reversed;

  const [width, height] = small ? [22, 32] : [36, 52];
  const text = {
    textAnchor: "middle",
    dominantBaseline: "central",
    fontWeight: 700,
    fill: "currentColor",
  } as const;
  const icon = small ? (value ? 13 : 16) : look.kind === "poker" ? 18 : 20;

  return (
    // An SVG with its own colours, so the HTML export has the same drawing.
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      aria-hidden
      style={{ color: isRed(look) ? "var(--color-card-red)" : "var(--color-die-black)" }}
      className={`shrink-0 select-none ${small ? "" : "drop-shadow-sm"} ${animate ? "animate-fade-up" : ""}`}
    >
      <g transform={reversed ? `rotate(180 ${width / 2} ${height / 2})` : undefined}>
        <rect
          x="0.5"
          y="0.5"
          width={width - 1}
          height={height - 1}
          rx={small ? 3.5 : 5.5}
          fill="var(--color-die-white)"
          stroke="#000"
          strokeOpacity="0.2"
        />
        {value && small && (
          <text {...text} x={11} y={9} fontSize={look.kind === "major" ? 8 : 10}>
            {value}
          </text>
        )}
        {value && !small && (
          <text {...text} x={tarot ? 18 : value.length > 1 ? 9.5 : 7.5} y={9} fontSize={10}>
            {value}
          </text>
        )}
        {value && !small && !tarot && (
          <text
            {...text}
            x={value.length > 1 ? 9.5 : 7.5}
            y={9}
            fontSize={10}
            transform="rotate(180 18 26)"
          >
            {value}
          </text>
        )}
        <Suit size={icon} x={(width - icon) / 2} y={small && value ? 15.5 : (height - icon) / 2} />
      </g>
    </svg>
  );
}
