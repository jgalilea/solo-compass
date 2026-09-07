import type { JournalEntry, JournalLineKind } from "./lonelog";

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
