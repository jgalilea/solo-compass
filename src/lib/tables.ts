/**
 * Tablas de significado.
 *
 * El contenido es un marcador de posición: la estructura ya soporta
 * dados d6, d66 (dos d6 leídos como decenas/unidades) y d20, para que
 * más adelante solo haga falta sustituir el texto de cada entrada.
 */

export type DiceType = "d6" | "d66" | "d20";

export interface TableEntry {
  range: [number, number];
  text: string;
}

export interface MeaningTable {
  id: string;
  name: string;
  description: string;
  dice: DiceType;
  entries: TableEntry[];
}

function placeholderD6(name: string): TableEntry[] {
  return Array.from({ length: 6 }, (_, i) => ({
    range: [i + 1, i + 1] as [number, number],
    text: `${name} · resultado ${i + 1} — sustituye este texto por tu tabla.`,
  }));
}

function placeholderD66(name: string): TableEntry[] {
  const entries: TableEntry[] = [];
  for (let tens = 1; tens <= 6; tens++) {
    for (let ones = 1; ones <= 6; ones++) {
      const value = tens * 10 + ones;
      entries.push({
        range: [value, value],
        text: `${name} · resultado ${value} — sustituye este texto por tu tabla.`,
      });
    }
  }
  return entries;
}

function placeholderD20(name: string): TableEntry[] {
  return Array.from({ length: 20 }, (_, i) => ({
    range: [i + 1, i + 1] as [number, number],
    text: `${name} · resultado ${i + 1} — sustituye este texto por tu tabla.`,
  }));
}

export const MEANING_TABLES: MeaningTable[] = [
  {
    id: "evento-aleatorio",
    name: "Evento aleatorio",
    description: "Qué interrumpe o cambia la escena actual.",
    dice: "d66",
    entries: placeholderD66("Evento aleatorio"),
  },
  {
    id: "accion-pnj",
    name: "Acción de PNJ",
    description: "Qué hace un personaje no jugador ante la situación.",
    dice: "d20",
    entries: placeholderD20("Acción de PNJ"),
  },
  {
    id: "descriptor-escena",
    name: "Descriptor de escena",
    description: "Un adjetivo o tono para colorear el lugar o el momento.",
    dice: "d6",
    entries: placeholderD6("Descriptor de escena"),
  },
];

export function getTable(id: string): MeaningTable | undefined {
  return MEANING_TABLES.find((t) => t.id === id);
}

export function diceMax(dice: DiceType): number {
  switch (dice) {
    case "d6":
      return 6;
    case "d66":
      return 66;
    case "d20":
      return 20;
  }
}

function rollDie(sides: number): number {
  return 1 + Math.floor(Math.random() * sides);
}

/** Devuelve los dados individuales lanzados y el valor combinado usado para buscar en la tabla. */
export function rollForTable(dice: DiceType): { rolls: number[]; total: number } {
  if (dice === "d66") {
    const tens = rollDie(6);
    const ones = rollDie(6);
    return { rolls: [tens, ones], total: tens * 10 + ones };
  }
  const sides = dice === "d6" ? 6 : 20;
  const value = rollDie(sides);
  return { rolls: [value], total: value };
}

export function lookupEntry(table: MeaningTable, total: number): TableEntry | undefined {
  return table.entries.find((e) => total >= e.range[0] && total <= e.range[1]);
}
