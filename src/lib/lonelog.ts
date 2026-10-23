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
  adventureId: string;
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

/**
 * Una nota cuyo texto empieza como un símbolo de Lonelog (o como un
 * título/cita de Markdown) se leería al importar como otra cosa: se
 * escapa con "\\", que además es el escape estándar de Markdown y no
 * se ve al renderizar.
 */
const NEEDS_ESCAPE = /^(@|\?|d:|=>|===|#|>|\\)/;

/**
 * Las entradas pueden tener varias líneas (el editor lo permite). Las
 * líneas de continuación se exportan sangradas con dos espacios: en
 * Markdown siguen siendo el mismo párrafo, y al importar la sangría
 * indica que pertenecen a la entrada anterior aunque empiecen por un
 * símbolo. Las líneas en blanco intermedias se conservan.
 */
export function formatLine(entry: Pick<JournalEntry, "kind" | "text">): string {
  if (entry.kind === "session") {
    // El título de sesión es una sola línea por definición.
    return `=== ${entry.text.replace(/\s*\n\s*/g, " ")} ===`;
  }
  const [first, ...rest] = entry.text.split(/\r?\n/);
  const head =
    entry.kind === "note"
      ? NEEDS_ESCAPE.test(first) ? `\\${first}` : first
      : `${PREFIX[entry.kind]}${first}`;
  return [head, ...rest.map((line) => (line.trim() ? `  ${line}` : ""))].join("\n");
}

export const LONELOG_URL = "https://lonelog.itch.io/lonelog";
export const LONELOG_LICENSE_URL = "https://creativecommons.org/licenses/by-sa/4.0/";
export const APP_URL = "https://jgalilea.github.io/solo-compass/";

/** Crédito con enlaces Markdown reales (no solo texto plano con la URL). */
export function buildCreditLine(t: Dictionary): string {
  return interpolate(t.journal.lonelogCreditLine, {
    app: `[Solo Compass](${APP_URL})`,
    lonelog: `[Lonelog](${LONELOG_URL})`,
  });
}

/**
 * Genera el .md de una aventura: cabecera + crédito visible a Lonelog
 * (como cita, no como comentario oculto) + una entrada por párrafo.
 * Cada bloque va separado por una línea en blanco (no solo un salto
 * de línea) para que Markdown los trate como párrafos distintos —
 * si no, la mayoría de visores los junta todos pegados en uno solo.
 */
export function exportAdventureToMarkdown(
  t: Dictionary,
  adventureName: string,
  entries: JournalEntry[],
): string {
  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
  const lines = sorted.map((e) => formatLine(e));
  const blocks = [`# ${adventureName}`, `> ${buildCreditLine(t)}`, ...lines];
  return blocks.join("\n\n") + "\n";
}

const ROLL_PREFIX = /^d:\s?/;
/** Una línea sangrada continúa la entrada anterior (ver formatLine). */
const CONTINUATION_LINE = /^[ \t]+\S/;
const ACTION_PREFIX = /^@\s?/;
const QUESTION_PREFIX = /^\?\s?/;
const CONSEQUENCE_PREFIX = /^=>\s?/;
/** "=== Título ===", el marcador de sesión de Lonelog. */
const LEGACY_SESSION_LINE = /^===\s*(.+?)\s*===$/;
/** "## Título" — no lo exportamos, pero se reconoce igual al importar
 *  por si el archivo viene de fuera y usa un encabezado Markdown en
 *  vez del marcador de Lonelog para las sesiones. */
const H2_SESSION_LINE = /^##\s+(.+?)\s*$/;
/** Título H1 (# solo, no ## ni más) — el nombre de aventura a ignorar. */
const H1_TITLE_LINE = /^#(?!#)/;

/**
 * Parsea texto en notación Lonelog a entradas. Deliberadamente
 * permisivo: cualquier línea que no encaje con un símbolo reconocido
 * se guarda como nota en vez de descartarse o fallar — igual que
 * Lonelog admite contenido adicional (etiquetas, prosa suelta) sin
 * romper el resto del documento.
 *
 * - La cabecera (el título H1 con el nombre de la aventura y las citas
 *   ">" que lo siguen, como nuestro crédito) se ignora solo al
 *   principio: más abajo, "#pista" o "> una cita" son notas.
 * - Las sesiones se reconocen en "=== Título ===" (lo que exportamos) y
 *   también en "## Título", por si el archivo viene de fuera.
 * - Una línea sangrada continúa la entrada anterior (entradas de varias
 *   líneas); "\\" al inicio escapa una nota que empieza por un símbolo.
 */
export function parseMarkdownToEntries(
  text: string,
  adventureId: string,
  startTimestamp: number,
): JournalEntry[] {
  const entries: JournalEntry[] = [];
  // Quita un posible BOM inicial (lo añade nuestra propia exportación
  // para que los visores externos detecten bien el UTF-8) para que no
  // se cuele en la primera línea y la deje sin reconocer.
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  let inHeader = true;
  let seenTitle = false;
  // Líneas en blanco desde la última línea de la entrada anterior, para
  // conservarlas si lo que sigue es una continuación.
  let pendingBlankLines = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      pendingBlankLines += 1;
      continue;
    }

    const previous = entries[entries.length - 1];
    if (previous && previous.kind !== "session" && CONTINUATION_LINE.test(rawLine)) {
      previous.text += "\n".repeat(pendingBlankLines + 1) + line;
      pendingBlankLines = 0;
      continue;
    }
    pendingBlankLines = 0;

    if (inHeader) {
      if (!seenTitle && H1_TITLE_LINE.test(line)) {
        seenTitle = true;
        continue;
      }
      if (line.startsWith(">")) continue;
      inHeader = false;
    }

    const h2Match = line.match(H2_SESSION_LINE);
    const legacySessionMatch = line.match(LEGACY_SESSION_LINE);
    let kind: JournalLineKind;
    let content: string;

    if (line.startsWith("\\")) {
      kind = "note";
      content = line.slice(1);
    } else if (h2Match) {
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

    const index = entries.length;
    entries.push({
      // No hay timestamp real por línea en el texto plano: se generan
      // secuenciales para conservar el orden del archivo al mostrarlo.
      id: `${startTimestamp}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      adventureId,
      timestamp: startTimestamp + index,
      kind,
      text: content,
    });
  }

  return entries;
}
