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

const SUIT_ICONS: Record<string, ComponentType<{ size?: number }>> = {
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
 * A drawn card, as it lies on the table: its corner twice (top left,
 * and upside down bottom right) and its suit in the middle; a reversed
 * tarot card lies upside down. On the white die's colour in every
 * theme, like the oracle's dice. Decorative: the card's name goes
 * beside it. Nothing for an id that isn't a card.
 */
export function PlayingCard({ id, animate = false }: { id: string; animate?: boolean }) {
  const { locale } = useLocaleContext();
  const look = cardLook(id, locale);
  if (!look) return null;
  const Suit = look.kind === "joker" ? IconJoker : look.kind === "major" ? IconMajorArcana : SUIT_ICONS[look.suit];
  const corner = look.kind === "joker" ? "" : look.kind === "major" ? look.numeral : look.rank;
  const reversed = (look.kind === "major" || look.kind === "minor") && look.reversed;
  // A Major Arcana's numeral is its name: centred at the top, not a corner.
  const centred = look.kind === "major";

  return (
    <span
      aria-hidden
      className={[
        "relative flex h-[3.25rem] w-9 shrink-0 items-center justify-center rounded-md border border-black/20 bg-die-white shadow-sm",
        isRed(look) ? "text-card-red" : "text-die-black",
        reversed ? "rotate-180" : "",
        animate ? "animate-fade-up" : "",
      ].join(" ")}
    >
      {corner && (
        <>
          <span
            className={[
              "absolute top-1 text-[0.625rem] font-bold leading-none",
              centred ? "inset-x-0 text-center" : "left-1",
            ].join(" ")}
          >
            {corner}
          </span>
          {!centred && (
            <span className="absolute bottom-1 right-1 rotate-180 text-[0.625rem] font-bold leading-none">{corner}</span>
          )}
        </>
      )}
      <Suit size={look.kind === "joker" || centred ? 20 : 18} />
    </span>
  );
}
