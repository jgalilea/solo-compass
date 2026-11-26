/**
 * How a Lonelog line reads on screen, beyond its kind: the journal
 * keeps every line as written (so the .md round-trips untouched) and
 * these helpers only say how to draw it.
 *
 * - Rolls: `d:` (a verdict, the default), `tbl:` (content: a table's or
 *   a generator's, `gen:` before 1.7; without "->", a table written out)
 *   or a bare `-> answer` (§3.2, §4.3).
 * - Scenes: "S1 *Tavern, evening*", "S5a", "S7.1", "T1-S2" (§5.3),
 *   maybe with a place, `[COMBAT]` (combat add-on) or, at the end, whose
 *   point of view a storyline takes (`@(Jordan)`, §5.3.3).
 * - Actions by someone else: `@(Jonah) …`, `@(A > B)`, `@(A+B)` (§3.1.1).
 * - Notes: dialogue (`N (Guard): "…"`, `PC: …`, `PC (Alex): …`), meta notes
 *   (`(note: …)`), narrative blocks (`\---` … `---\`, §4.4), the
 *   add-ons' blocks (`[COMBAT]`, `[DUNGEON STATUS]`, `[RESOURCES]` and
 *   their analog `--- COMBAT ---`) and combat rounds (`Rd1`).
 */

import type { JournalEntry } from "./lonelog";
import { SCENE_ID } from "./lonelogCompact";

export type RollSymbol = "d" | "tbl" | "gen" | "result";

/** A roll's own symbol and the text after it; a bare "-> …" keeps its arrow. */
export function splitRollSymbol(text: string): { symbol: RollSymbol; text: string } {
  const m = text.match(/^(tbl|gen):\s*/);
  if (m) return { symbol: m[1] as "tbl" | "gen", text: text.slice(m[0].length) };
  if (/^->/.test(text)) return { symbol: "result", text };
  return { symbol: "d", text };
}

/** Content from several rolls: a generator ("(Action d66=34, Theme d66=25) ->", or an axis per line). */
export function isGenerator(text: string): boolean {
  const { symbol, text: body } = splitRollSymbol(text);
  if (symbol === "gen") return true;
  return symbol === "tbl" && (/\([^()]*d\d+=\d+,[^()]*d\d+=\d+\) ->/.test(body) || /\n[^\n]*->/.test(body));
}

/** A table written out in the log (§4.3.1–4.3.2), not a roll on it: `tbl: Mood [Tense, Hopeful]`. */
export function isTableDefinition(text: string): boolean {
  const { symbol, text: body } = splitRollSymbol(text);
  // "tbl: draw=Qs" and "tbl: Loot d100=42" say what came up.
  return symbol === "tbl" && !body.includes("->") && !/=\w/.test(body.split("\n", 1)[0]);
}

const SCENE = new RegExp(`^(${SCENE_ID})(?:\\s+([\\s\\S]*))?$`);
const COMBAT_MARK = /\s*\[COMBAT\]\s*/i;
// From the start of a run of spaces only (see formatScene).
const POV = /(?<!\s)\s*@\(([^()\n]+)\)\s*$/;

/** "S1 *Tavern, evening*" → S1 and "Tavern, evening"; `[COMBAT]` says the scene is a fight, `@(Jordan)` whose point of view it is. */
export function parseScene(text: string): { id: string; context: string; combat: boolean; pov?: string } {
  const m = text.trim().match(SCENE);
  if (!m) return { id: "", context: text.trim(), combat: false };
  const pov = m[2]?.match(POV)?.[1].trim();
  const rest = (m[2] ?? "").replace(POV, "");
  const combat = COMBAT_MARK.test(rest);
  // The context goes between asterisks (italics); a place tag or
  // anything else around it stays.
  const context = rest.replace(COMBAT_MARK, " ").replace(/\*([^*]+)\*/g, "$1").replace(/\s+/g, " ").trim();
  return { id: m[1], context, combat, ...(pov ? { pov } : {}) };
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

/** A new scene line: "S3 *Tavern*", or just "S3"; a point of view at the end stays out of the context. */
export function formatScene(id: string, context: string): string {
  // Each run of spaces is tried from its start only (the lookbehind):
  // otherwise a long run without a line break took quadratic time.
  const line = context.replace(/(?<!\s)\s*\n\s*/g, " ").replace(/\*/g, "");
  const pov = line.match(POV)?.[1].trim();
  const clean = line.replace(POV, "").trim();
  return [id, clean && `*${clean}*`, pov && `@(${pov})`].filter(Boolean).join(" ");
}

/** Who speaks in a dialogue line: your character (by name, when there are several), or someone by name. */
export type Speaker = { pc: true; name?: string } | { pc: false; name: string };

/**
 * A dialogue line as Lonelog writes it (a note): `PC: "…"`,
 * `PC (Alex): "…"` or `N (Odile): "…"`. The words go in straight quotes, as in the spec,
 * unless they already open with a quote of their own.
 */
export function formatDialogue(speaker: Speaker, words: string): string {
  const text = words.trim();
  const quoted = /^["“«'‘]/.test(text) ? text : `"${text}"`;
  const name = (speaker.name ?? "").replace(/[()\n]/g, " ").replace(/\s+/g, " ").trim();
  if (speaker.pc) return name ? `PC (${name}): ${quoted}` : `PC: ${quoted}`;
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

/**
 * The names in an actor: Lonelog writes "A > B" when A assists B and
 * "A+B" for a joint action; each separator kept, to draw them as is.
 */
export function actorParts(actor: string): { name?: string; text: string }[] {
  return actor
    // From the start of a run of spaces only, as in formatScene.
    .split(/((?<!\s)\s*[>+]\s*)/)
    .filter((part) => part !== "")
    .map((part, i) => (i % 2 === 0 ? { name: part.trim(), text: part } : { text: part }));
}

export type NoteForm =
  | { form: "plain" }
  | { form: "excerpt"; text: string }
  | { form: "meta"; label: string | null; text: string }
  /** `name`: which of the PCs, or who; "Alex" in "PC (Alex, whisper)". None for a bare "PC". */
  | { form: "dialogue"; speaker: string; name?: string; pc: boolean; text: string }
  | { form: "block"; name: "combat" | "dungeon" | "resources"; closing: boolean }
  | { form: "round"; round: string; text: string };

const EXCERPT = /^\\---\n([\s\S]*)\n---\\$/;
const BLOCK = /^\[(\/)?(COMBAT|DUNGEON STATUS|RESOURCES)\]$/i;
// Analog: "--- COMBAT ---", "--- END COMBAT ---", "--- DUNGEON STATUS ---", "--- END STATUS ---".
const ANALOG_BLOCK = /^---\s*(END\s+)?(COMBAT|DUNGEON STATUS|RESOURCES|STATUS)\s*---$/i;
const ROUND = /^(Rd\d+)\b[ \t]*([\s\S]*)$/;
// Only as the spec writes it: "N (Guard): …", "PC: …" and "PC (Alex): …".
const DIALOGUE = /^(N|PC)(?: \(([^()\n]+)\))?: ([\s\S]+)$/;
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
  if (dialogue && (dialogue[1] === "PC" || dialogue[2])) {
    const speaker = dialogue[2]?.trim();
    const pc = dialogue[1] === "PC";
    // "Alex, whisper" is Alex; an NPC's name may have a comma of its own.
    const name = pc ? speaker?.split(",", 1)[0].trim() : speaker;
    return { form: "dialogue", speaker: speaker ?? "PC", ...(name ? { name } : {}), pc, text: dialogue[3] };
  }
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
