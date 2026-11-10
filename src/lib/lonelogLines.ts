/**
 * How a Lonelog line reads on screen, beyond its kind: the journal
 * keeps every line as written (so the .md round-trips untouched) and
 * these helpers only say how to draw it.
 *
 * - Rolls: `d:` (mechanics, the default), `tbl:` (a table), `gen:` (a
 *   generator) or a bare `-> result` (§3.2, §4.3).
 * - Scenes: "S1 *Tavern, evening*", "S5a", "S7.1", "T1-S2" (§5.3),
 *   maybe with a place or `[COMBAT]` (combat add-on).
 * - Actions by someone else: `@(Jonah) …`, `@(A > B)`, `@(A+B)` (§3.1.1).
 * - Notes: dialogue (`N (Guard): "…"`, `PC: …`), meta notes
 *   (`(note: …)`), narrative blocks (`\---` … `---\`, §4.4), the
 *   add-ons' blocks (`[COMBAT]`, `[DUNGEON STATUS]`, `[RESOURCES]` and
 *   their analog `--- COMBAT ---`) and combat rounds (`Rd1`).
 */

import { SCENE_ID, type JournalEntry } from "./lonelog";

export type RollSymbol = "d" | "tbl" | "gen" | "result";

/** A roll's own symbol and the text after it; a bare "-> …" keeps its arrow. */
export function splitRollSymbol(text: string): { symbol: RollSymbol; text: string } {
  const m = text.match(/^(tbl|gen):\s*/);
  if (m) return { symbol: m[1] as "tbl" | "gen", text: text.slice(m[0].length) };
  if (/^->/.test(text)) return { symbol: "result", text };
  return { symbol: "d", text };
}

const SCENE = new RegExp(`^(${SCENE_ID})(?:\\s+([\\s\\S]*))?$`);
const COMBAT_MARK = /\s*\[COMBAT\]\s*/i;

/** "S1 *Tavern, evening*" → S1 and "Tavern, evening"; `[COMBAT]` says the scene is a fight. */
export function parseScene(text: string): { id: string; context: string; combat: boolean } {
  const m = text.trim().match(SCENE);
  if (!m) return { id: "", context: text.trim(), combat: false };
  const rest = m[2] ?? "";
  const combat = COMBAT_MARK.test(rest);
  // The context goes between asterisks (italics); a place tag or
  // anything else around it stays.
  const context = rest.replace(COMBAT_MARK, " ").replace(/\*([^*]+)\*/g, "$1").replace(/\s+/g, " ").trim();
  return { id: m[1], context, combat };
}

/** The next scene's marker: one more than the highest "S" number in the adventure. */
export function nextSceneId(entries: readonly Pick<JournalEntry, "kind" | "text">[]): string {
  let highest = 0;
  for (const entry of entries) {
    if (entry.kind !== "scene") continue;
    const n = entry.text.match(/S(\d+)/);
    if (n) highest = Math.max(highest, Number(n[1]));
  }
  return `S${highest + 1}`;
}

/** A new scene line: "S3 *Tavern*", or just "S3". */
export function formatScene(id: string, context: string): string {
  const clean = context.replace(/\s*\n\s*/g, " ").replace(/\*/g, "").trim();
  return clean ? `${id} *${clean}*` : id;
}

/** Who speaks in a dialogue line: your character, or someone by name. */
export type Speaker = { pc: true } | { pc: false; name: string };

/**
 * A dialogue line as Lonelog writes it (a note): `PC: "…"` or
 * `N (Odile): "…"`. The words go in straight quotes, as in the spec,
 * unless they already open with a quote of their own.
 */
export function formatDialogue(speaker: Speaker, words: string): string {
  const text = words.trim();
  const quoted = /^["“«'‘]/.test(text) ? text : `"${text}"`;
  if (speaker.pc) return `PC: ${quoted}`;
  const name = speaker.name.replace(/[()\n]/g, " ").replace(/\s+/g, " ").trim();
  return `N (${name}): ${quoted}`;
}

/**
 * In-world text (a letter, an inscription) as a narrative block
 * (Lonelog §4.4): the text between a `\---` line and a `---\` line.
 */
export function formatExcerpt(text: string): string {
  return `\\---\n${text.trim()}\n---\\`;
}

/** `@(Jonah) Keeps watch` → Jonah and the action; null when it's the PC's own. */
export function splitActor(text: string): { actor: string | null; text: string } {
  const m = text.match(/^\(([^()\n]+)\)\s*([\s\S]*)$/);
  return m ? { actor: m[1].trim(), text: m[2] } : { actor: null, text };
}

export type NoteForm =
  | { form: "plain" }
  | { form: "excerpt"; text: string }
  | { form: "meta"; label: string | null; text: string }
  | { form: "dialogue"; speaker: string; pc: boolean; text: string }
  | { form: "block"; name: "combat" | "dungeon" | "resources"; closing: boolean }
  | { form: "round"; round: string; text: string };

const EXCERPT = /^\\---\n([\s\S]*)\n---\\$/;
const BLOCK = /^\[(\/)?(COMBAT|DUNGEON STATUS|RESOURCES)\]$/i;
// Analog: "--- COMBAT ---", "--- END COMBAT ---", "--- DUNGEON STATUS ---", "--- END STATUS ---".
const ANALOG_BLOCK = /^---\s*(END\s+)?(COMBAT|DUNGEON STATUS|RESOURCES|STATUS)\s*---$/i;
const ROUND = /^(Rd\d+)\b[ \t]*([\s\S]*)$/;
const DIALOGUE = /^(N|PC)\s*(?:\(([^()\n]+)\))?\s*:\s+([\s\S]+)$/;
// "(note: …)", "(reflection: …)", "(This happened before the campaign)".
const META = /^\(([\s\S]+)\)$/;
const META_LABEL = /^([\p{L} ]{2,20}):\s*([\s\S]+)$/u;

const BLOCK_NAME: Record<string, "combat" | "dungeon" | "resources"> = {
  combat: "combat",
  "dungeon status": "dungeon",
  status: "dungeon",
  resources: "resources",
};

/** How a note is drawn: see the header. */
export function noteForm(text: string): NoteForm {
  const trimmed = text.trim();
  const excerpt = trimmed.match(EXCERPT);
  if (excerpt) return { form: "excerpt", text: excerpt[1] };
  const block = trimmed.match(BLOCK) ?? trimmed.match(ANALOG_BLOCK);
  if (block) return { form: "block", name: BLOCK_NAME[block[2].toLowerCase()], closing: !!block[1] };
  const round = trimmed.match(ROUND);
  if (round) return { form: "round", round: round[1], text: round[2] };
  const dialogue = trimmed.match(DIALOGUE);
  if (dialogue) return { form: "dialogue", speaker: dialogue[2]?.trim() ?? dialogue[1], pc: dialogue[1] === "PC", text: dialogue[3] };
  const meta = trimmed.match(META);
  if (meta && balanced(meta[1])) {
    const labelled = meta[1].match(META_LABEL);
    return labelled ? { form: "meta", label: labelled[1], text: labelled[2] } : { form: "meta", label: null, text: meta[1] };
  }
  return { form: "plain" };
}

/** "(a) and (b)" isn't one aside: the opening "(" must close only at the end. */
function balanced(inner: string): boolean {
  let depth = 0;
  for (const c of inner) {
    if (c === "(") depth++;
    else if (c === ")" && --depth < 0) return false;
  }
  return depth === 0;
}
