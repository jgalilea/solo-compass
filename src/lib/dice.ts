/**
 * The built-in dice, with no system's rules: the classic d&d set (d4 to
 * d20 and d%, a d100) and Fudge/Fate (4dF). Each is a formula,
 * rolled like any other (diceNotation.ts).
 */

/** Every built-in die, by the name its button shows: the d&d set and 4dF. */
export const BUILTIN_DICE = ["d4", "d6", "d8", "d10", "d12", "d20", "d%", "4dF"] as const;
export type BuiltinDie = (typeof BUILTIN_DICE)[number];

export function isBuiltinDie(value: unknown): value is BuiltinDie {
  return typeof value === "string" && (BUILTIN_DICE as readonly string[]).includes(value);
}

