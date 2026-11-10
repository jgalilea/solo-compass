import { useId, useMemo, useState } from "react";
import { useHistoryContext } from "../hooks/useHistoryContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { cardIdentity, deckCards, drawCard, formatCardDraw, type DeckId } from "../lib/cards";
import { shuffleKey, withShuffle, type CardSettings } from "../lib/cardSettings";
import { cardsDrawn, type DiceRollEntry } from "../lib/history";
import { interpolate } from "../lib/i18n";
import { IconCards, IconShuffle } from "./icons/Icons";
import { Switch } from "./Switch";

const CHIP = "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition active:scale-95";
const CHIP_ON = "border-gold bg-gold text-ink-950";
const CHIP_OFF = "border-ink-border text-parchment-dim hover:border-gold/50 hover:text-gold";

/**
 * The cards side of the dice tool: a deck (standard or tarot), its
 * options, and drawing. Each card drawn goes to the tray like a die
 * (`onDraw`, with the card so the history keeps it). Without repeats,
 * what's left in the deck is worked out from the history: the cards of
 * this adventure drawn since its last shuffle (cards.ts).
 */
export function CardControls({
  adventureId,
  settings,
  onChange,
  onDraw,
}: {
  adventureId?: string;
  settings: CardSettings;
  onChange: (next: CardSettings) => void;
  onDraw: (text: string, card: NonNullable<DiceRollEntry["card"]>) => void;
}) {
  const { t, locale } = useLocaleContext();
  const { entries } = useHistoryContext();
  const [notice, setNotice] = useState<string | null>(null);
  const hintId = useId();
  const { deck, unique } = settings;
  const options = { jokers: settings.jokers, reversed: settings.reversed };
  const key = shuffleKey(adventureId, deck);
  const shuffledAt = settings.shuffles[key] ?? 0;
  const drawn = useMemo(() => cardsDrawn(entries, adventureId, deck, shuffledAt), [entries, adventureId, deck, shuffledAt]);
  const all = deckCards(deck, options);
  const out = new Set(drawn);
  const left = unique ? all.filter((card) => !out.has(cardIdentity(card))).length : all.length;

  function draw() {
    const card = drawCard(deck, options, unique ? drawn : null);
    if (!card) return;
    setNotice(null);
    onDraw(formatCardDraw(card, locale), { deck, id: card });
  }

  function shuffle() {
    onChange(withShuffle(settings, key));
    setNotice(t.dice.shuffled);
  }

  const decks: [DeckId, string][] = [
    ["poker", t.dice.deckPoker],
    ["tarot", t.dice.deckTarot],
  ];

  return (
    <div className="flex flex-col gap-2">
      <div role="group" aria-label={t.dice.deckLabel} className="flex gap-1.5">
        {decks.map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={deck === id}
            onClick={() => onChange({ ...settings, deck: id })}
            className={`${CHIP} ${deck === id ? CHIP_ON : CHIP_OFF}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-0.5">
        {deck === "poker" ? (
          <Switch checked={settings.jokers} onChange={(jokers) => onChange({ ...settings, jokers })}>
            {t.dice.jokers}
          </Switch>
        ) : (
          <Switch checked={settings.reversed} onChange={(reversed) => onChange({ ...settings, reversed })}>
            {t.dice.reversed}
          </Switch>
        )}
        <Switch checked={unique} onChange={(next) => onChange({ ...settings, unique: next })} describedBy={hintId}>
          {t.dice.unique}
        </Switch>
      </div>
      <p id={hintId} className="-mt-1 px-0.5 text-xs text-parchment-faint">
        {unique ? t.dice.uniqueOn : t.dice.uniqueOff}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={draw}
          disabled={left === 0}
          className="flex items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 text-sm font-medium text-gold transition hover:bg-gold/20 active:scale-95 disabled:border-ink-border disabled:bg-transparent disabled:text-parchment-dim/50"
        >
          <IconCards size={16} />
          {t.dice.draw}
        </button>
        {unique && (
          <>
            <span className="text-xs tabular-nums text-parchment-dim">
              {interpolate(t.dice.left, { left, total: all.length })}
            </span>
            {left < all.length && (
              <button
                type="button"
                onClick={shuffle}
                className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-parchment-dim transition hover:text-gold"
              >
                <IconShuffle size={15} />
                {t.dice.shuffle}
              </button>
            )}
          </>
        )}
      </div>
      {(left === 0 || notice) && (
        <p role="status" className="text-xs text-gold">
          {left === 0 ? t.dice.empty : notice}
        </p>
      )}
    </div>
  );
}
