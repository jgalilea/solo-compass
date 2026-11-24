import { readCards } from "../lib/cards";
import { readRolledDice } from "../lib/diceNotation";
import { readOracleDice } from "../lib/rolledDice";
import { PlayingCard } from "./PlayingCard";
import { OracleDiceRow, RolledDice } from "./RolledDice";

/**
 * A roll of the journal drawn small, read from its text: its cards, its
 * dice or an oracle's; nothing if it's none of them. Decorative: the
 * text goes beside it.
 */
export function RollDrawing({ detail, result }: { detail: string; result: string | null }) {
  const cards = readCards(detail);
  const oracle = cards ? null : readOracleDice(detail);
  const dice = cards || oracle || result === null ? null : readRolledDice(`${detail} -> ${result}`);
  if (!cards && !oracle && !dice) return null;
  return (
    // As high as the line it's on (dice and cards are a bit taller), so
    // an entry isn't taller for it.
    <span className={`flex min-w-0 ${cards ? "-my-1" : "-my-0.5"}`}>
      {cards && (
        <span className="flex min-w-0 flex-wrap gap-1">
          {cards.map((id, i) => (
            <PlayingCard key={i} id={id} small />
          ))}
        </span>
      )}
      {oracle && <OracleDiceRow dice={oracle} />}
      {dice && <RolledDice dice={dice} size="xs" />}
    </span>
  );
}
