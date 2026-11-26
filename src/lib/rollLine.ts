/**
 * The player's own rolls in a journal's text, and as a Lonelog line.
 *
 * In the app a roll is written "Attack d20+5 -> 19 (14 + 5)": what was
 * rolled, the total and how it was reached. Lonelog keeps "->" for a
 * verdict and puts the total after "=", with each die in brackets right
 * after the dice (§3.2.1, dice notation add-on): "d: Attack
 * d20+5[14]=19". That's how it's exported and copied, and it's read
 * back as the app writes it, with nothing lost; a roll with a verdict
 * ("d: Stealth d6=5 vs TN 4 -> Success") is left as it is.
 */

import { rollFormula } from "./diceNotation";

/**
 * One die or formula from the generic roller: "d10", "2d6", "d%",
 * "4dF", "2d6+3", "4d6kh3", "4d6dl1", "3d6!", "d6!!", "5d6>=5",
 * "4d6>4f<3", "(1d6+2)*3", "{4d6,2d10}k1" (see rollFormula in
 * diceNotation.ts): faces right after the "d", then anything but a space.
 */
// Not ending in "=9": "d6=5 ->" is Lonelog's rolled value (a table
// roll, "Theme d66=25 -> …"), not a formula.
// A card drawn ("draw=Qs", cards.ts) counts as one too.
export const DIE = String.raw`(?:draw=[A-Za-z0-9]+|[-({\d]*d(?:\d|%|F|\()[^\s]*?(?<!(?:^|[^<>!])=\d+))`;
/** Text with a roll of the generic roller in it ("Attack 2d6+3 -> 9 (…)"). */
export const OWN_ROLL = new RegExp(String.raw`(^|\s)${DIE}\s*->`);
const LONE_ROLL = new RegExp(String.raw`^(?:(.*?)\s+)?(${DIE})\s*->\s*(.+)$`);

// Each roll, and the description of every one after the first
// ("…, Fire 2d6 -> 7 (3+4)"); the first one's is the series' label.
const ROLL_SEGMENT = new RegExp(
  String.raw`(?:([^,>]*?)\s+)?(${DIE})\s*->\s*(.+?)(?=\s*,\s*(?:[^,>]*?\s+)?${DIE}\s*->|\s+${DIE}\s*->|\s*$)`,
  "g",
);

/**
 * Longer than this, a text isn't read as a roll: no roll is anywhere
 * near it (a tray of thirty dice is under a thousand characters), and
 * the patterns below take a time that grows with the square of the
 * length on some texts. An imported journal with a line of 300,000
 * characters used to freeze the tab for most of a minute.
 */
export const MAX_ROLL_TEXT = 4000;

export interface OwnRolls {
  label: string;
  rolls: { label: string; die: string; result: string }[];
}

/**
 * Recognises several chained rolls in a single entry ("d10 -> 9,
 * d10 -> 5", or with spaces instead of commas as they used to be
 * saved), with an optional text in front ("Attack d20 -> 14, d8 -> 3").
 * Returns null if there are fewer than two or if there's leftover text
 * that doesn't fit, so that entry is shown as a normal roll
 * (splitRollText).
 */
export function splitRollSeries(text: string): OwnRolls | null {
  if (text.length > MAX_ROLL_TEXT) return null;
  const first = text.search(OWN_ROLL);
  if (first < 0) return null;
  const label = text.slice(0, first).trim().replace(/,$/, "");
  const rest = text.slice(first).trim();
  const rolls: OwnRolls["rolls"] = [];
  for (const m of rest.matchAll(ROLL_SEGMENT)) {
    rolls.push({ label: m[1]?.trim() ?? "", die: m[2], result: m[3].trim() });
  }
  const leftover = rest.replace(ROLL_SEGMENT, "").replace(/[\s,]/g, "");
  if (rolls.length < 2 || leftover) return null;
  return { label, rolls };
}

/**
 * A lone roll, only if its result is the app's own kind (a total, with
 * or without its dice, or a card): one with prose ("d20 -> Success,
 * barely") is shown as a normal roll.
 */
export function loneRoll(text: string): OwnRolls | null {
  if (text.length > MAX_ROLL_TEXT) return null;
  const m = text.match(LONE_ROLL);
  if (!m) return null;
  const [, label = "", die, result] = m;
  if (!die.startsWith("draw=") && !/^[+-]?\d+(?:\.\d+)?(?:\s+\(.+\))?$/.test(result.trim())) return null;
  return { label: label.trim(), rolls: [{ label: "", die, result: result.trim() }] };
}

// Dice and a number added: the spec's "2d6+2[4, 3]=9" says only the dice.
const SIMPLE = /^\d*d(?:\d+|%)([+-]\d+)?$/;
// Keeping or dropping: "4d6dl1[6, 4d, 5, 3]=15" marks the dropped ones.
const KEEP_DROP = /^\d*d\d+(?:k|d)[hl]?\d+$/;
const TOTAL = String.raw`[+−-]?\d+(?:\.\d+)?`;
const RESULT = new RegExp(String.raw`^(${TOTAL})(?: \((.+)\))?$`);
// "Attack 2d6+2[4, 3]=9", with a space before "=" after a compare point ("5d10>=7 =3").
const LINE_SEGMENT = new RegExp(String.raw`^(?:(.*\S)\s+)?([^\s[\]]*d[^\s[\]]*?)(?:\[([^\]]*)\])?\s?=(${TOTAL})$`);
// Compare points and the modifiers that take one: what follows "=" could be theirs.
const TAKES_COMPARE = /[<>=!ru]|c[sf]/;

/** "4+2 + 3" for 2d6+3 → "4, 2"; anything less plain, as the app writes it. */
function shortDice(formula: string, detail: string): string {
  const kept = KEEP_DROP.test(formula) && detail.match(/^(\d+(?:\+\d+)*), (\d+✗(?: \d+✗)*)$/);
  if (kept) return [...kept[1].split("+"), ...kept[2].replaceAll("✗", "d").split(" ")].join(", ");
  const m = formula.match(SIMPLE);
  if (!m) return detail;
  const bonus = m[1] ? ` ${m[1][0] === "-" ? "−" : "+"} ${m[1].slice(1)}` : "";
  const dice = detail.endsWith(bonus) ? detail.slice(0, detail.length - bonus.length) : "";
  return /^\d+(?:\+\d+)*$/.test(dice) ? dice.replaceAll("+", ", ") : detail;
}

function longDice(formula: string, dice: string): string {
  const list = dice.trim().split(/\s*,\s*/);
  if (KEEP_DROP.test(formula) && list.every((d) => /^\d+d?$/.test(d))) {
    const dropped = list.filter((d) => d.endsWith("d")).map((d) => d.replace("d", "✗"));
    return [list.filter((d) => !d.endsWith("d")).join("+"), dropped.join(" ")].filter(Boolean).join(", ");
  }
  const m = formula.match(SIMPLE);
  if (!m || !/^\d+(?:\s*,\s*\d+)*$/.test(dice.trim())) return dice.trim();
  const bonus = m[1] ? ` ${m[1][0] === "-" ? "−" : "+"} ${m[1].slice(1)}` : "";
  return list.join("+") + bonus;
}

/** A roll of the app's as Lonelog writes it after "d: "; any other text as it is. */
export function toRollLine(text: string): string {
  const own = splitRollSeries(text) ?? loneRoll(text);
  if (!own || text.includes("\n")) return text;
  const parts: string[] = [];
  for (const { label, die, result } of own.rolls) {
    const m = result.match(RESULT);
    if (!m || die.startsWith("draw=")) return text;
    const dice = m[2] ? `[${shortDice(die, m[2])}]` : "";
    parts.push(`${label ? `${label} ` : ""}${die}${dice}${TAKES_COMPARE.test(die) ? " " : ""}=${m[1]}`);
  }
  const line = [own.label, parts.join(", ")].filter(Boolean).join(" ");
  // Only if it comes back the same.
  return fromRollLine(line) === text ? line : text;
}

/** Splits at the commas outside brackets. */
function splitRolls(line: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < line.length; i++) {
    if ("[({".includes(line[i])) depth++;
    else if ("])}".includes(line[i])) depth--;
    else if (line[i] === "," && depth === 0 && line[i + 1] === " ") {
      parts.push(line.slice(from, i));
      from = i + 2;
    }
  }
  return [...parts, line.slice(from)];
}

/**
 * A Lonelog roll whose total is its result ("Attack 2d6+2[4, 3]=9", one
 * or several), as the app writes its own; any other as it is.
 */
export function fromRollLine(line: string): string {
  if (line.length > MAX_ROLL_TEXT || line.includes("->") || line.includes("\n")) return line;
  // A comma in what it's for ("Attack, with care d20=14") isn't between rolls.
  const segments: string[] = [];
  let pending = "";
  for (const part of splitRolls(line)) {
    const whole = pending ? `${pending}, ${part}` : part;
    if (LINE_SEGMENT.test(whole.trim())) {
      segments.push(whole.trim());
      pending = "";
    } else pending = whole;
  }
  if (pending || segments.length === 0) return line;
  const rolls: string[] = [];
  for (const segment of segments) {
    const [, label = "", formula, dice, total] = segment.match(LINE_SEGMENT)!;
    // The right dice, or it's something else ("Armoured=3").
    if (rollFormula(formula, () => 0.5) === null) return line;
    rolls.push(`${label ? `${label} ` : ""}${formula} -> ${total}${dice ? ` (${longDice(formula, dice)})` : ""}`);
  }
  return rolls.join(", ");
}

/** The dice in "2d6+2[4, 3]=9", a roll with its verdict after it, as the app writes them; null if it doesn't say. */
export function diceInDetail(detail: string): string | null {
  if (detail.length > MAX_ROLL_TEXT) return null;
  const m = detail.match(/(?:^|\s)(\S*d\S*?)\[([^\]]+)\]\s?=([+-]?\d+)/);
  return m && !m[1].includes("=>") && rollFormula(m[1], () => 0.5) ? `${m[1]} -> ${m[3]} (${longDice(m[1], m[2])})` : null;
}
