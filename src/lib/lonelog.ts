/**
 * Notación Lonelog (Roberto Bisceglie, CC BY-SA 4.0):
 * https://lonelog.itch.io/lonelog — un estándar abierto de texto
 * plano para registrar sesiones de rol en solitario. Cinco símbolos:
 *
 *   @   acción del jugador
 *   ?   pregunta al oráculo
 *   d:  tirada (el resultado va inline con "->", p. ej. "d: ... -> ...")
 *   =>  consecuencia narrativa
 *   === Título ===   cabecera de sección/sesión
 *
 * Este módulo es el único sitio que sabe traducir entre nuestras
 * entradas de diario y ese formato de texto, en los dos sentidos
 * (exportar/importar), para que el resultado sea un .md válido para
 * cualquier herramienta compatible con Lonelog (p. ej. el plugin de
 * Obsidian), no solo para esta app. Se exporta en la notación tal
 * cual, sin sustituir símbolos por equivalentes Markdown — el
 * espaciado entre líneas (una en blanco entre cada entrada) es lo
 * único que se ajusta, para que se lea bien como párrafos.
 */

import { interpolate, type Dictionary } from "./i18n";

export type JournalLineKind =
  | "action"
  | "question"
  | "roll"
  | "consequence"
  | "note"
  | "session";

export interface JournalEntry {
  id: string;
  campaignId: string;
  timestamp: number;
  kind: JournalLineKind;
  /** El texto ya sin el símbolo/prefijo de Lonelog. */
  text: string;
  /** Si la entrada viene de una tirada de la app, su id en el historial. */
  linkedRollId?: string;
}

const PREFIX: Record<Exclude<JournalLineKind, "note" | "session">, string> = {
  action: "@ ",
  question: "? ",
  roll: "d: ",
  consequence: "=> ",
};

export function formatLine(entry: Pick<JournalEntry, "kind" | "text">): string {
  switch (entry.kind) {
    case "session":
      return `=== ${entry.text} ===`;
    case "note":
      return entry.text;
    default:
      return `${PREFIX[entry.kind]}${entry.text}`;
  }
}

export const LONELOG_URL = "https://lonelog.itch.io/lonelog";
export const LONELOG_LICENSE_URL = "https://creativecommons.org/licenses/by-sa/4.0/";
export const APP_URL = "https://jagalile.github.io/solo-compass/";

/** Crédito con enlaces Markdown reales (no solo texto plano con la URL). */
export function buildCreditLine(t: Dictionary): string {
  return interpolate(t.journal.lonelogCreditLine, {
    app: `[Solo Compass](${APP_URL})`,
    lonelog: `[Lonelog](${LONELOG_URL})`,
  });
}

/**
 * Genera el .md de una campaña: cabecera + crédito visible a Lonelog
 * (como cita, no como comentario oculto) + una entrada por párrafo.
 * Cada bloque va separado por una línea en blanco (no solo un salto
 * de línea) para que Markdown los trate como párrafos distintos —
 * si no, la mayoría de visores los junta todos pegados en uno solo.
 */
export function exportCampaignToMarkdown(
  t: Dictionary,
  campaignName: string,
  entries: JournalEntry[],
): string {
  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
  const lines = sorted.map((e) => formatLine(e));
  const blocks = [`# ${campaignName}`, `> ${buildCreditLine(t)}`, ...lines];
  return blocks.join("\n\n") + "\n";
}

const ROLL_PREFIX = /^d:\s?/;
const ACTION_PREFIX = /^@\s?/;
const QUESTION_PREFIX = /^\?\s?/;
const CONSEQUENCE_PREFIX = /^=>\s?/;
/** "=== Título ===", el marcador de sesión de Lonelog. */
const LEGACY_SESSION_LINE = /^===\s*(.+?)\s*===$/;
/** "## Título" — no lo exportamos, pero se reconoce igual al importar
 *  por si el archivo viene de fuera y usa un encabezado Markdown en
 *  vez del marcador de Lonelog para las sesiones. */
const H2_SESSION_LINE = /^##\s+(.+?)\s*$/;
/** Título H1 (# solo, no ## ni más) — el nombre de campaña a ignorar. */
const H1_TITLE_LINE = /^#(?!#)/;

/**
 * Parsea texto en notación Lonelog a entradas. Deliberadamente
 * permisivo: cualquier línea que no encaje con un símbolo reconocido
 * se guarda como nota en vez de descartarse o fallar — igual que
 * Lonelog admite contenido adicional (etiquetas, prosa suelta) sin
 * romper el resto del documento. Las líneas vacías, el título H1
 * Markdown (#, el nombre de campaña) y las citas (>) se ignoran; las
 * sesiones se reconocen en "=== Título ===" (lo que exportamos) y
 * también en "## Título" al importar, por si el archivo viene de
 * fuera.
 */
export function parseMarkdownToEntries(
  text: string,
  campaignId: string,
  startTimestamp: number,
): JournalEntry[] {
  const entries: JournalEntry[] = [];
  // Quita un posible BOM inicial (lo añade nuestra propia exportación
  // para que los visores externos detecten bien el UTF-8) para que no
  // se cuele en la primera línea y la deje sin reconocer.
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  let index = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (H1_TITLE_LINE.test(line) || line.startsWith(">")) continue;

    const h2Match = line.match(H2_SESSION_LINE);
    const legacySessionMatch = line.match(LEGACY_SESSION_LINE);
    let kind: JournalLineKind;
    let content: string;

    if (h2Match) {
      kind = "session";
      content = h2Match[1];
    } else if (legacySessionMatch) {
      kind = "session";
      content = legacySessionMatch[1];
    } else if (ROLL_PREFIX.test(line)) {
      kind = "roll";
      content = line.replace(ROLL_PREFIX, "");
    } else if (ACTION_PREFIX.test(line)) {
      kind = "action";
      content = line.replace(ACTION_PREFIX, "");
    } else if (QUESTION_PREFIX.test(line)) {
      kind = "question";
      content = line.replace(QUESTION_PREFIX, "");
    } else if (CONSEQUENCE_PREFIX.test(line)) {
      kind = "consequence";
      content = line.replace(CONSEQUENCE_PREFIX, "");
    } else {
      kind = "note";
      content = line;
    }

    entries.push({
      // No hay timestamp real por línea en el texto plano: se generan
      // secuenciales para conservar el orden del archivo al mostrarlo.
      id: `${startTimestamp}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      campaignId,
      timestamp: startTimestamp + index,
      kind,
      text: content,
    });
    index += 1;
  }

  return entries;
}
