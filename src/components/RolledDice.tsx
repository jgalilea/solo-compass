import { ROLE_COLOR } from "../lib/oracleEngines";
import type { OracleDieRead, RolledDie } from "../lib/rolledDice";
import { Die } from "./Die";

/** Tiny dice that fit a phone's line with the roll's text. */
const MAX_ROW_DICE = 5;

/**
 * A roll's dice in a row: all of them or, tiny, the first ones.
 * Decorative: the roll's text goes beside them.
 */
export function RolledDice({
  dice,
  size = "sm",
  animate = false,
}: {
  dice: RolledDie[];
  size?: "sm" | "xs";
  animate?: boolean;
}) {
  const shown = size === "xs" ? dice.slice(0, MAX_ROW_DICE) : dice;
  return (
    <span aria-hidden className="flex min-w-0 select-none flex-wrap gap-1">
      {shown.map((die, i) => (
        <Die
          key={i}
          {...die}
          color="blanco"
          size={size}
          animate={animate}
          faded={die.mark === "out"}
        />
      ))}
      {shown.length < dice.length && <span className="self-center text-parchment-faint">…</span>}
    </span>
  );
}

/** The dice of one or several tables rolled (readTableDice), each table's together. Decorative too. */
export function TableDiceRow({
  groups,
  size = "xs",
  animate = false,
}: {
  groups: RolledDie[][];
  size?: "sm" | "xs";
  animate?: boolean;
}) {
  return (
    // The gap isn't a class: the HTML export has the same drawing.
    <span aria-hidden className="flex min-w-0 select-none flex-wrap" style={{ gap: 8 }}>
      {groups.map((dice, i) => (
        <RolledDice key={i} dice={dice} size={size} animate={animate} />
      ))}
    </span>
  );
}

/** An oracle roll's dice as the journal keeps them, faded the ones that didn't count (as in the history). Decorative too. */
export function OracleDiceRow({ dice }: { dice: OracleDieRead[] }) {
  return (
    <span aria-hidden className="flex select-none gap-1">
      {dice.map(({ role, sides, value, out }, i) => (
        <Die key={i} sides={sides} value={value} color={ROLE_COLOR[role]} size="xs" faded={out} />
      ))}
    </span>
  );
}
