/**
 * Generic dice roller, with no system's rules — it just rolls and
 * formats the result in Lonelog notation (`d: ... -> ...`), to quickly
 * fill the journal composer's "Roll" kind without leaving the app or
 * using physical dice. Covers the classic d&d set (d4 to d20 and d%)
 * and Fudge/Fate (4dF).
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

// --- Formulas ---------------------------------------------------------

/**
 * One term of a formula: dice ("2d6", "d%", "4dF", "4d6kh3") or a
 * number, with its sign.
 */
const TERM = /^([+-]?)(?:(\d*)d(\d+|%|f)(?:(kh|kl|k)(\d+))?|(\d+))/i;
/** "5d6>=5": count the dice that reach a target instead of adding them. */
const TARGET = /(>=|<=|>|<)(\d+)$/;

const MAX_DICE = 100;
const MAX_SIDES = 1000;

/**
 * Rolls a dice formula in the usual notation and returns it written as
 * a Lonelog roll, "2d6+3 -> 9 (4+2, +3)", or null if it can't be read:
 *
 *   2d6+3, 1d8+1d6+2   added up (the dice, then the modifiers)
 *   4d6kh3, 2d20kl1    keep the highest/lowest N (dropped ones get ✗)
 *   5d6>=5             counts the dice that reach 5 (successes, ✓)
 *   4dF, d%            Fudge/Fate dice, d100
 *
 * A single die with nothing else is just "d20 -> 14", like the buttons.
 */
export function rollFormula(input: string, random: () => number = Math.random): string | null {
  // Spaces only around operators: "2d6 + 3" is fine, "2d6 3" isn't 2d63.
  let rest = input.trim().toLowerCase().replace(/\s*([+\-<>=])\s*/g, "$1");
  if (!rest || /\s/.test(rest)) return null;
  const target = rest.match(TARGET);
  if (target) rest = rest.slice(0, target.index);

  type Part = { sign: 1 | -1; label: string; values: number[]; dropped: number[]; fudge: boolean; constant: boolean };
  const parts: Part[] = [];
  while (rest) {
    const m = rest.match(TERM);
    if (!m || (parts.length > 0 && !m[1])) return null;
    rest = rest.slice(m[0].length);
    const sign = m[1] === "-" ? -1 : 1;
    if (m[6] !== undefined) {
      parts.push({ sign, label: m[6], values: [Number(m[6])], dropped: [], fudge: false, constant: true });
      continue;
    }
    const count = m[2] ? Number(m[2]) : 1;
    const fudge = m[3] === "f";
    const sides = m[3] === "%" ? 100 : fudge ? 3 : Number(m[3]);
    if (count < 1 || count > MAX_DICE || sides < 2 || sides > MAX_SIDES) return null;
    let values = Array.from({ length: count }, () =>
      fudge ? Math.floor(random() * 3) - 1 : 1 + Math.floor(random() * sides),
    );
    let dropped: number[] = [];
    if (m[4]) {
      const keep = Number(m[5]);
      if (keep < 1 || keep > count) return null;
      const sorted = [...values].sort((a, b) => (m[4] === "kl" ? a - b : b - a));
      values = sorted.slice(0, keep);
      dropped = sorted.slice(keep);
    }
    const label = `${m[2] ?? ""}d${m[3] === "%" ? "%" : fudge ? "F" : sides}${m[4] ? `${m[4]}${m[5]}` : ""}`;
    parts.push({ sign, label, values, dropped, fudge, constant: false });
  }
  if (!parts.some((p) => !p.constant)) return null;

  const formula =
    parts.map((p, i) => `${i === 0 ? (p.sign < 0 ? "-" : "") : p.sign < 0 ? "-" : "+"}${p.label}`).join("") +
    (target ? `${target[1]}${target[2]}` : "");

  if (target) {
    // Successes: only for a plain pool of dice ("5d6>=5").
    if (parts.length !== 1 || parts[0].fudge || parts[0].dropped.length) return null;
    const goal = Number(target[2]);
    const hits = (v: number) =>
      target[1] === ">=" ? v >= goal : target[1] === ">" ? v > goal : target[1] === "<=" ? v <= goal : v < goal;
    const values = parts[0].values;
    const successes = values.filter(hits).length;
    return `${formula} -> ${successes} (${values.map((v) => `${v}${hits(v) ? "✓" : ""}`).join(" ")})`;
  }

  const total = parts.reduce((sum, p) => sum + p.sign * p.values.reduce((a, b) => a + b, 0), 0);
  const only = parts[0];
  if (parts.length === 1 && !only.fudge && only.values.length === 1 && !only.dropped.length) {
    return `${formula} -> ${total}`;
  }
  const detail = parts
    .map((p, i) => {
      const sign = i === 0 ? (p.sign < 0 ? "−" : "") : p.sign < 0 ? "− " : "+ ";
      if (p.constant) return `${sign}${p.values[0]}`;
      const kept = p.fudge ? p.values.map(fudgeSymbol).join(" ") : p.values.join("+");
      const out = p.dropped.length ? `, ${p.dropped.map((v) => `${v}✗`).join(" ")}` : "";
      return `${sign}${kept}${out}`;
    })
    .join(" ");
  const anyFudge = parts.some((p) => p.fudge);
  const totalText = anyFudge && total > 0 ? `+${total}` : `${total}`;
  return `${formula} -> ${totalText} (${detail})`;
}
