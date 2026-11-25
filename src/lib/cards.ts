/**
 * Card draws, as Lonelog's Cards add-on writes them (v1.1.0, CC BY-SA
 * 4.0, github.com/lonelog/lonelog): `draw=Qs -> Queen of Spades` is a
 * roll like any other (a "roll" entry), `tbl:` in the log because it
 * gives content; one that answers yes or no, or from before 1.7, is
 * a `d:`. Card
 * identities are the add-on's: rank + suit for a standard deck (`Qs`,
 * `10h`, `RJkr`), `M0`–`M21` for the Major Arcana and rank + suit for
 * the Minor (`KnCu`, `7Wa`), with `r` for a reversed tarot card. The
 * name after "->" is ours, in the player's language.
 *
 * Drawing without replacement is per adventure and derived from the
 * history (every draw is a "dados" roll that keeps its card), like
 * Loner's Twist Counter: nothing else is stored but when each deck was
 * last shuffled (cardSettings.ts).
 */

import type { Locale } from "./i18n";

export const DECKS = ["poker", "tarot"] as const;
export type DeckId = (typeof DECKS)[number];

export function isDeckId(value: unknown): value is DeckId {
  return typeof value === "string" && (DECKS as readonly string[]).includes(value);
}

export interface DeckOptions {
  /** Standard deck: the red and black jokers too (54 cards). */
  jokers: boolean;
  /** Tarot: a card can come out reversed (half the time). */
  reversed: boolean;
  /** Tarot: only the 22 Major Arcana. */
  majorOnly: boolean;
}

const POKER_RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const;
const POKER_SUITS = ["h", "d", "c", "s"] as const;
const TAROT_RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "Pg", "Kn", "Q", "K"] as const;
const TAROT_SUITS = ["Wa", "Cu", "Sw", "Pe"] as const;

/** Every card in a deck, by identity (no reversal: that's decided on drawing). */
export function deckCards(deck: DeckId, options: DeckOptions): string[] {
  if (deck === "poker") {
    const cards = POKER_SUITS.flatMap((suit) => POKER_RANKS.map((rank) => `${rank}${suit}`));
    return options.jokers ? [...cards, "RJkr", "BJkr"] : cards;
  }
  const major = Array.from({ length: 22 }, (_, i) => `M${i}`);
  if (options.majorOnly) return major;
  return [...major, ...TAROT_SUITS.flatMap((suit) => TAROT_RANKS.map((rank) => `${rank}${suit}`))];
}

/** "M16r" → "M16": the card, whichever way up. */
export function cardIdentity(id: string): string {
  return /^(M\d+|(?:A|\d+|Pg|Kn|Q|K)(?:Wa|Cu|Sw|Pe))r$/.test(id) ? id.slice(0, -1) : id;
}

/**
 * A card from the deck: any card when cards repeat, otherwise one not
 * in `drawn` (identities). Null when there's none left.
 */
export function drawCard(
  deck: DeckId,
  options: DeckOptions,
  drawn: readonly string[] | null,
  random: () => number = Math.random,
): string | null {
  const taken = new Set(drawn ?? []);
  const left = deckCards(deck, options).filter((card) => !taken.has(card));
  if (left.length === 0) return null;
  const card = left[Math.floor(random() * left.length)];
  return deck === "tarot" && options.reversed && random() < 0.5 ? `${card}r` : card;
}

const WORDS: Record<
  Locale,
  {
    pokerRanks: Record<(typeof POKER_RANKS)[number], string>;
    pokerSuits: Record<(typeof POKER_SUITS)[number], string>;
    jokers: { RJkr: string; BJkr: string };
    major: string[];
    tarotRanks: Record<(typeof TAROT_RANKS)[number], string>;
    tarotSuits: Record<(typeof TAROT_SUITS)[number], string>;
    of: string;
    reversed: string;
  }
> = {
  es: {
    pokerRanks: { A: "As", 2: "Dos", 3: "Tres", 4: "Cuatro", 5: "Cinco", 6: "Seis", 7: "Siete", 8: "Ocho", 9: "Nueve", 10: "Diez", J: "Jota", Q: "Reina", K: "Rey" },
    pokerSuits: { h: "corazones", d: "diamantes", c: "tréboles", s: "picas" },
    jokers: { RJkr: "Comodín rojo", BJkr: "Comodín negro" },
    major: [
      "El Loco", "El Mago", "La Sacerdotisa", "La Emperatriz", "El Emperador", "El Hierofante", "Los Enamorados",
      "El Carro", "La Fuerza", "El Ermitaño", "La Rueda de la Fortuna", "La Justicia", "El Colgado", "La Muerte",
      "La Templanza", "El Diablo", "La Torre", "La Estrella", "La Luna", "El Sol", "El Juicio", "El Mundo",
    ],
    tarotRanks: { A: "As", 2: "Dos", 3: "Tres", 4: "Cuatro", 5: "Cinco", 6: "Seis", 7: "Siete", 8: "Ocho", 9: "Nueve", 10: "Diez", Pg: "Sota", Kn: "Caballo", Q: "Reina", K: "Rey" },
    tarotSuits: { Wa: "bastos", Cu: "copas", Sw: "espadas", Pe: "oros" },
    of: "de",
    reversed: "invertida",
  },
  en: {
    pokerRanks: { A: "Ace", 2: "Two", 3: "Three", 4: "Four", 5: "Five", 6: "Six", 7: "Seven", 8: "Eight", 9: "Nine", 10: "Ten", J: "Jack", Q: "Queen", K: "King" },
    pokerSuits: { h: "Hearts", d: "Diamonds", c: "Clubs", s: "Spades" },
    jokers: { RJkr: "Red Joker", BJkr: "Black Joker" },
    // Rider-Waite-Smith numbering, as the add-on (Strength 8, Justice 11).
    major: [
      "The Fool", "The Magician", "The High Priestess", "The Empress", "The Emperor", "The Hierophant", "The Lovers",
      "The Chariot", "Strength", "The Hermit", "Wheel of Fortune", "Justice", "The Hanged Man", "Death",
      "Temperance", "The Devil", "The Tower", "The Star", "The Moon", "The Sun", "Judgement", "The World",
    ],
    tarotRanks: { A: "Ace", 2: "Two", 3: "Three", 4: "Four", 5: "Five", 6: "Six", 7: "Seven", 8: "Eight", 9: "Nine", 10: "Ten", Pg: "Page", Kn: "Knight", Q: "Queen", K: "King" },
    tarotSuits: { Wa: "Wands", Cu: "Cups", Sw: "Swords", Pe: "Pentacles" },
    of: "of",
    reversed: "reversed",
  },
};

const POKER_ID = /^(A|[2-9]|10|J|Q|K)([hdcs])$/;
const MAJOR_ID = /^M(\d|1\d|2[01])(r?)$/;
const MINOR_ID = /^(A|[2-9]|10|Pg|Kn|Q|K)(Wa|Cu|Sw|Pe)(r?)$/;

/** A card's name in the player's language ("Reina de picas", "La Torre, invertida"); null if it isn't a card. */
export function cardName(id: string, locale: Locale): string | null {
  const w = WORDS[locale];
  if (id === "RJkr" || id === "BJkr") return w.jokers[id];
  const poker = id.match(POKER_ID);
  if (poker) return `${w.pokerRanks[poker[1] as keyof typeof w.pokerRanks]} ${w.of} ${w.pokerSuits[poker[2] as keyof typeof w.pokerSuits]}`;
  const major = id.match(MAJOR_ID);
  const minor = id.match(MINOR_ID);
  const name = major
    ? w.major[Number(major[1])]
    : minor
      ? `${w.tarotRanks[minor[1] as keyof typeof w.tarotRanks]} ${w.of} ${w.tarotSuits[minor[2] as keyof typeof w.tarotSuits]}`
      : null;
  if (!name) return null;
  return (major?.[2] || minor?.[3]) ? `${name}, ${w.reversed}` : name;
}

/**
 * What a card shows when it's drawn (PlayingCard): its value (rank,
 * a court card's letter in the player's language, a Major Arcana's
 * roman numeral) and its suit. Null if it isn't a card.
 */
export type CardLook =
  | { kind: "poker"; rank: string; suit: "h" | "d" | "c" | "s" }
  | { kind: "joker"; red: boolean }
  | { kind: "major"; numeral: string; reversed: boolean }
  | { kind: "minor"; rank: string; suit: "Wa" | "Cu" | "Sw" | "Pe"; reversed: boolean };

// Court cards' corner letters: the add-on's codes are English ("Pg", "Kn").
const TAROT_COURT_LETTERS: Record<Locale, Record<"Pg" | "Kn" | "Q" | "K", string>> = {
  es: { Pg: "S", Kn: "C", Q: "Q", K: "K" },
  en: { Pg: "P", Kn: "Kn", Q: "Q", K: "K" },
};

function romanNumeral(n: number): string {
  if (n === 0) return "0";
  const parts: [number, string][] = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let left = n;
  let out = "";
  for (const [value, letters] of parts) {
    while (left >= value) {
      out += letters;
      left -= value;
    }
  }
  return out;
}

export function cardLook(id: string, locale: Locale): CardLook | null {
  if (id === "RJkr" || id === "BJkr" || id === "Jkr") return { kind: "joker", red: id === "RJkr" };
  const poker = id.match(POKER_ID);
  if (poker) return { kind: "poker", rank: poker[1], suit: poker[2] as "h" | "d" | "c" | "s" };
  const major = id.match(MAJOR_ID);
  if (major) return { kind: "major", numeral: romanNumeral(Number(major[1])), reversed: !!major[2] };
  const minor = id.match(MINOR_ID);
  if (!minor) return null;
  const rank = minor[1] as (typeof TAROT_RANKS)[number];
  const court = TAROT_COURT_LETTERS[locale][rank as keyof (typeof TAROT_COURT_LETTERS)["es"]];
  return { kind: "minor", rank: court ?? rank, suit: minor[2] as "Wa" | "Cu" | "Sw" | "Pe", reversed: !!minor[3] };
}

const SUIT_SYMBOLS: Record<string, string> = { h: "♥", d: "♦", c: "♣", s: "♠" };

/**
 * How a card looks in a chip: "Q♠" for the standard deck (Lonelog
 * stores letters; the add-on lets tools draw the symbols); jokers and
 * tarot keep their code ("RJkr", "M16r"), their name says the rest.
 */
export function cardFace(id: string): string {
  const poker = id.match(POKER_ID);
  return poker ? `${poker[1]}${SUIT_SYMBOLS[poker[2]]}` : id;
}

/** A draw as the journal writes it: "draw=Qs -> Reina de picas". */
export function formatCardDraw(id: string, locale: Locale): string {
  return `draw=${id} -> ${cardName(id, locale) ?? id}`;
}

/** "draw=Qs" anywhere in a roll's text, shown with its face ("Q♠"). */
export function showDraws(text: string): string {
  return text.replace(/\bdraw=([A-Za-z0-9]+)/g, (_, id: string) => cardFace(id));
}

/** What a draw was for, before it ("Omen draw=Qs -> …"); empty if nothing. */
export function cardPurpose(text: string): string {
  const arrow = text.lastIndexOf(" -> ");
  return text.slice(0, Math.max(arrow, 0)).replace(/\bdraw=\S+$/, "").trim();
}

/**
 * The cards in a roll's text, to draw them: "draw=Qs", the add-on's
 * spreads ("Past=4d, Present=Kh") and "draw=M16r // The Tower". Null if
 * there are none.
 */
export function readCards(text: string): string[] | null {
  const ids = [...text.matchAll(/=([A-Za-z0-9]+)(?![\w+-])/g)].map((m) => m[1]).filter((id) => cardLook(id, "en"));
  return ids.length > 0 ? ids : null;
}

/** Whether a roll's text is only cards drawn ("draw=Qs -> …, draw=3h -> …", with a description or not). */
export function isCardDraw(text: string): boolean {
  return /\bdraw=[A-Za-z0-9]+ ->/.test(text) && !/(^|\s)[-({\d]*d(\d|%|F)/.test(text.replace(/\bdraw=\S+/g, ""));
}
