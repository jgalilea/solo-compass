/**
 * The built-in dice, with no system's rules: the classic d&d set (d4 to
 * d20 and d%, a d100) and Fudge/Fate (4dF). Each is a formula,
 * rolled like any other (diceNotation.ts).
 */

/** Every built-in die, by the name its button shows: the d&d set and 4dF. */
export const BUILTIN_DICE = ["d4", "d6", "d8", "d10", "d12", "d20", "d%", "4dF"] as const;
export type BuiltinDie = (typeof BUILTIN_DICE)[number];

/** The silhouette each built-in die's button shows (DieOutline): a d% is drawn as a d100, 4dF as a d6. */
export const BUILTIN_DIE_SIDES: Record<BuiltinDie, number> = { d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20, "d%": 100, "4dF": 6 };

export function isBuiltinDie(value: unknown): value is BuiltinDie {
  return typeof value === "string" && (BUILTIN_DICE as readonly string[]).includes(value);
}

