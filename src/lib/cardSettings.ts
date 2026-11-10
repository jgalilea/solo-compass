/**
 * The game table's card settings, per device (localStorage, and in the
 * backup's settings): whether the dice or the cards are showing, which
 * deck, its options, whether cards repeat or come out once per
 * adventure until it's shuffled, and when each adventure's deck was
 * last shuffled (the cards drawn since are out, see cards.ts).
 */

import { isDeckId, type DeckId } from "./cards";

export interface CardSettings {
  /** What the dice tool shows: the dice or a deck. */
  tool: "dice" | "cards";
  deck: DeckId;
  jokers: boolean;
  reversed: boolean;
  /** Each card once per adventure (free draws share one deck) until shuffled. */
  unique: boolean;
  /** Last shuffle by `shuffleKey`, in ms. */
  shuffles: Record<string, number>;
}

const STORAGE_KEY = "solo-compass:cards";

export const DEFAULT_CARD_SETTINGS: CardSettings = {
  tool: "dice",
  deck: "poker",
  jokers: false,
  reversed: true,
  unique: true,
  shuffles: {},
};

/** Which deck of which adventure ("" for free draws). */
export function shuffleKey(adventureId: string | undefined, deck: DeckId): string {
  return `${adventureId ?? ""}|${deck}`;
}

export function normalizeCardSettings(value: unknown): CardSettings {
  if (!value || typeof value !== "object") return DEFAULT_CARD_SETTINGS;
  const v = value as Record<string, unknown>;
  const shuffles: Record<string, number> = {};
  if (v.shuffles && typeof v.shuffles === "object") {
    for (const [key, at] of Object.entries(v.shuffles as Record<string, unknown>)) {
      if (typeof at === "number" && Number.isFinite(at)) shuffles[key] = at;
    }
  }
  return {
    tool: v.tool === "cards" ? "cards" : "dice",
    deck: isDeckId(v.deck) ? v.deck : DEFAULT_CARD_SETTINGS.deck,
    jokers: typeof v.jokers === "boolean" ? v.jokers : DEFAULT_CARD_SETTINGS.jokers,
    reversed: typeof v.reversed === "boolean" ? v.reversed : DEFAULT_CARD_SETTINGS.reversed,
    unique: typeof v.unique === "boolean" ? v.unique : DEFAULT_CARD_SETTINGS.unique,
    shuffles,
  };
}

export function loadCardSettings(): CardSettings {
  if (typeof window === "undefined") return DEFAULT_CARD_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === null ? DEFAULT_CARD_SETTINGS : normalizeCardSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_CARD_SETTINGS;
  }
}

export function saveCardSettings(settings: CardSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Not critical: if it fails, it just doesn't persist.
  }
}

/** A backup's settings over this device's: the later shuffle of each deck wins. */
export function mergeCardSettings(local: CardSettings, restored: CardSettings): CardSettings {
  const shuffles = { ...local.shuffles };
  for (const [key, at] of Object.entries(restored.shuffles)) shuffles[key] = Math.max(shuffles[key] ?? 0, at);
  return { ...restored, shuffles };
}

/** The settings with that deck of that adventure shuffled now (every card back in). */
export function withShuffle(settings: CardSettings, key: string, now = Date.now()): CardSettings {
  return { ...settings, shuffles: { ...settings.shuffles, [key]: now } };
}
