/**
 * Card draws, as Lonelog's Cards add-on writes them (v1.0.0, CC BY-SA
 * 4.0, github.com/zeruhur/lonelog): `draw=Qs -> Queen of Spades` is a
 * roll like any other (`d:` in the log, a "roll" entry here). Card
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

/** Whether a roll's text is only cards drawn ("draw=Qs -> …, draw=3h -> …", with a description or not). */
export function isCardDraw(text: string): boolean {
  return /\bdraw=[A-Za-z0-9]+ ->/.test(text) && !/(^|\s)[-({\d]*d(\d|%|F)/.test(text.replace(/\bdraw=\S+/g, ""));
}
