/**
 * Generic dice roller, with no system's rules — it just rolls and
 * formats the result in Lonelog notation (`d: ... -> ...`), to quickly
 * fill the journal composer's "Roll" kind without leaving the app or
 * using physical dice. Covers the classic d&d set (d4 to d20 and d%)
 * and Fudge/Fate (4dF). Typed formulas are in diceNotation.ts.
 */

/** The "d&d" set: d4, d6, d8, d10, d12, d20, d% (= d100). */
export const DND_DICE = [4, 6, 8, 10, 12, 20, 100] as const;

export function rollDie(sides: number): number {
  return 1 + Math.floor(Math.random() * sides);
}

export function formatDieLabel(sides: number): string {
  return sides === 100 ? "d%" : `d${sides}`;
}

export function formatDieRoll(sides: number, result: number): string {
  return `${formatDieLabel(sides)} -> ${result}`;
}

/** A Fudge die has 6 faces: two "-", two blank (0) and two "+". */
export function rollFudgeDie(): -1 | 0 | 1 {
  const r = Math.floor(Math.random() * 6);
  if (r < 2) return -1;
  if (r < 4) return 0;
  return 1;
}

export function rollFudgeSet(): number[] {
  return Array.from({ length: 4 }, () => rollFudgeDie());
}

function fudgeSymbol(v: number): string {
  return v > 0 ? "+" : v < 0 ? "−" : "0";
}

export function formatFudgeRoll(values: number[]): string {
  const total = values.reduce((a, b) => a + b, 0);
  const totalText = total > 0 ? `+${total}` : `${total}`;
  const symbols = values.map(fudgeSymbol).join(" ");
  return `4dF -> ${totalText} (${symbols})`;
}
