import type { JournalEntry, JournalLineKind } from "./lonelog";
import type { Answer } from "./oracle";

/**
 * Constantes de estilo y utilidades compartidas por JournalListView y
 * AdventureDetailView. Separado de src/components/journalShared.tsx
 * (que solo exporta componentes) para que el fast refresh de React
 * funcione en ambos, igual que con los *ContextInstance.ts.
 */

export const INPUT_CLASS =
  "min-w-0 flex-1 rounded-xl border border-ink-border bg-ink-900/70 px-4 py-3 text-base text-parchment placeholder:text-parchment-dim/50 focus:border-gold focus:outline-none";
export const PRIMARY_BUTTON_CLASS =
  "shrink-0 rounded-xl bg-gold px-4 py-3 text-sm font-medium text-ink-950";
export const SECONDARY_BUTTON_CLASS =
  "shrink-0 rounded-xl border border-ink-border px-4 py-3 text-sm text-parchment-dim transition hover:border-gold/50 hover:text-gold";

// "question" se queda fuera a propósito: el oráculo ya tiene su
// propia pantalla, que registra pregunta + tirada juntas solo — no
// hay caso de uso real para apuntar una pregunta suelta aquí. Sigue
// existiendo como JournalLineKind porque las entradas ya guardadas
// (o importadas de otro Lonelog) pueden tener ese tipo.
export type ComposerKind = Exclude<JournalLineKind, "session" | "question">;

export const COMPOSER_KINDS: ComposerKind[] = ["note", "action", "roll", "consequence"];

export const SYMBOL: Record<JournalLineKind, string> = {
  action: "@",
  question: "?",
  roll: "d:",
  consequence: "=>",
  note: "",
  session: "",
};

export function downloadTextFile(filename: string, content: string) {
  // Al descargarse, el archivo se queda solo con bytes + extensión —
  // el "charset=utf-8" del blob no viaja con él. Sin un BOM, algunos
  // visores (sobre todo en iOS) adivinan mal la codificación y
  // muestran los acentos/símbolos rotos al abrirlo fuera de la app.
  const blob = new Blob(["﻿" + content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function sanitizeFilename(name: string): string {
  return name.trim().replace(/[\\/:*?"<>|]+/g, "-") || "diario";
}

export interface EntryGroup {
  sessionEntry: JournalEntry | null;
  items: JournalEntry[];
}

export function groupBySession(sortedEntries: JournalEntry[]): EntryGroup[] {
  const groups: EntryGroup[] = [];
  let current: EntryGroup = { sessionEntry: null, items: [] };
  for (const entry of sortedEntries) {
    if (entry.kind === "session") {
      groups.push(current);
      current = { sessionEntry: entry, items: [] };
    } else {
      current.items.push(entry);
    }
  }
  groups.push(current);
  return groups.filter((g) => g.sessionEntry !== null || g.items.length > 0);
}

/**
 * Agrupa las entradas de una sesión en bloques para pintarlas: una
 * pregunta, la tirada que la responde y las consecuencias que vienen
 * justo detrás van juntas; el resto (notas, acciones…) va suelto.
 * Se agrupa por posición (no solo por linkedRollId) para que también
 * funcione con diarios importados, que no traen enlaces.
 */
export function buildEntryBlocks(items: JournalEntry[]): JournalEntry[][] {
  const blocks: JournalEntry[][] = [];
  let open: JournalEntry[] | null = null;

  for (const entry of items) {
    const hasRoll = open?.some((e) => e.kind === "roll") ?? false;
    const question = open?.find((e) => e.kind === "question");

    if (entry.kind === "question") {
      open = [entry];
      blocks.push(open);
    } else if (
      entry.kind === "roll" &&
      open &&
      question &&
      !hasRoll &&
      question.linkedRollId === entry.linkedRollId
    ) {
      open.push(entry);
    } else if (entry.kind === "roll") {
      open = [entry];
      blocks.push(open);
    } else if (entry.kind === "consequence" && open) {
      open.push(entry);
    } else {
      open = null;
      blocks.push([entry]);
    }
  }
  return blocks;
}

// Palabras de respuesta del oráculo en cualquiera de los idiomas de
// la app, para reconocerla en tiradas sin enlace al historial (p. ej.
// importadas, o si se borró el historial).
// (Sin \b: no reconoce el final de palabra tras una letra acentuada
// como la "í" de "Sí"; se usa un lookahead Unicode en su lugar.)
const ANSWER_PATTERNS: [Answer, RegExp][] = [
  ["contradiccion", /^(contradicci[oó]n|contradiction)(?!\p{L})/iu],
  ["si", /^(s[ií]|yes)(?!\p{L})/iu],
  ["no", /^no(?!\p{L})/iu],
];

/**
 * Separa el texto de una tirada ("Recluse — blanco 3 / negro 5 -> No")
 * en el detalle de los dados y el resultado. Si el detalle tiene la
 * forma de una tirada de oráculo, intenta reconocer la respuesta.
 */
export function splitRollText(text: string): {
  detail: string;
  result: string | null;
  answer: Answer | undefined;
} {
  const i = text.lastIndexOf("->");
  if (i < 0) return { detail: text, result: null, answer: undefined };
  const detail = text.slice(0, i).trim();
  const result = text.slice(i + 2).trim();
  const looksLikeOracle = /—.*\d+\s*\/.*\d+/.test(detail);
  const answer = looksLikeOracle
    ? ANSWER_PATTERNS.find(([, re]) => re.test(result))?.[0]
    : undefined;
  return { detail, result, answer };
}
