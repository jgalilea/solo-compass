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
 * A drawn card, as it lies on the table: its suit in the middle and its
 * value in two corners (standard deck, the same either way up) or once
 * at the top (tarot: a reversed card lies upside down, and it has to
 * show). On the white die's colour in every
 * theme, like the oracle's dice. Decorative: the card's name goes
 * beside it. Nothing for an id that isn't a card. `small` (a one-line
 * row, RecentRolls): the value once, over the suit.
 */
export function PlayingCard({ id, animate = false, small = false }: { id: string; animate?: boolean; small?: boolean }) {
  const { locale } = useLocaleContext();
  const look = cardLook(id, locale);
  if (!look) return null;
  const Suit = look.kind === "joker" ? IconJoker : look.kind === "major" ? IconMajorArcana : SUIT_ICONS[look.suit];
  const value = look.kind === "joker" ? "" : look.kind === "major" ? look.numeral : look.rank;
  const tarot = look.kind === "major" || look.kind === "minor";
  const reversed = tarot && look.reversed;

  if (small) {
    return (
      <span
        aria-hidden
        className={[
          "flex h-8 w-[1.375rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded border border-black/20 bg-die-white",
          isRed(look) ? "text-card-red" : "text-die-black",
          reversed ? "rotate-180" : "",
        ].join(" ")}
      >
        {value && (
          <span className={`font-bold leading-none ${look.kind === "major" ? "text-[0.5rem]" : "text-[0.625rem]"}`}>{value}</span>
        )}
        <Suit size={value ? 13 : 16} />
      </span>
    );
  }

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
      {value && (
        <>
          <span
            className={[
              "absolute top-1 text-[0.625rem] font-bold leading-none",
              tarot ? "inset-x-0 text-center" : "left-1",
            ].join(" ")}
          >
            {value}
          </span>
          {!tarot && (
            <span className="absolute bottom-1 right-1 rotate-180 text-[0.625rem] font-bold leading-none">{value}</span>
          )}
        </>
      )}
      <Suit size={look.kind === "poker" ? 18 : 20} />
    </span>
  );
}
