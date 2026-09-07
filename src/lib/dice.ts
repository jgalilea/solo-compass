/**
 * Roller de dados genérico, sin reglas de ningún sistema — solo tira
 * y formatea el resultado en notación Lonelog (`d: ... -> ...`), para
 * rellenar rápido el tipo "Tirada" del composer del diario sin salir
 * de la app ni usar dados físicos. Cubre el set clásico de d&d (d4 a
 * d20 y d%) y el de Fudge/Fate (4dF).
 */

/** Dados del set "d&d": d4, d6, d8, d10, d12, d20, d% (= d100). */
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

/** Un dado Fudge tiene 6 caras: dos "-", dos en blanco (0) y dos "+". */
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
