import { oracleDice, rollOracleId, type Answer, type OracleRoll, type Qualifier } from "../oracle";
import { oracleTarget } from "../oracleEngines";
import { interpolate } from "./types";
import type { Dictionary } from "./types";

/** "Yes" / "Yes, and." / "No, but." … according to the active dictionary. */
export function formatAnswer(
  t: Dictionary,
  roll: { answer: Answer; qualifier: Qualifier },
): string {
  const base = t.answer[roll.answer];
  if (!roll.qualifier) return base;
  return `${base}, ${t.qualifier[roll.qualifier]}.`;
}

/**
 * The answer plus what only some oracles add: Ironsworn's match,
 * Loner's doubles and twist ("Yes, but. · Twist! A third party ·
 * Appears"). The answer goes first, so imported journals still
 * recognise it (splitRollText).
 */
export function formatOracleResult(t: Dictionary, roll: OracleRoll): string {
  const extras: string[] = [];
  if (roll.special === "match") extras.push(t.oracle.matchLabel);
  if (roll.twist?.happened) extras.push(t.oracle.twistLabel, ...(roll.twist.result ? [roll.twist.result] : []));
  else if (roll.twist) extras.push(interpolate(t.oracle.doubleShort, { count: roll.twist.counter }));
  return [formatAnswer(t, roll), ...extras].join(" · ");
}

/**
 * A roll's dice for the journal, after the oracle's name and a "—"
 * (how an oracle roll is told apart from a table roll):
 * "white 4 / black 2", "d100 67 vs 26+", "answer 5 vs 4+ / modifier 1".
 */
export function formatOracleDice(t: Dictionary, roll: OracleRoll): string {
  const target = oracleTarget(rollOracleId(roll), roll.likelihood);
  return oracleDice(roll)
    .map((g, i) =>
      i === 0 && target !== undefined
        ? `${t.oracleDice[g.role]} ${interpolate(t.oracle.targetSuffix, { value: g.kept, target })}`
        : `${t.oracleDice[g.role]} ${g.kept}`,
    )
    .join(" / ");
}
