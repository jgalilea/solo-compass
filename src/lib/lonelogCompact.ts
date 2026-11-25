/**
 * Lonelog's compact form (§3, Appendix D.1): several elements on one
 * line, each symbol after a space ("S1 @Sneak d:4<5 ->F => noise").
 * Split on import into the lines they'd be in the standard form.
 *
 * Only a line that already reads as notation is split: one that starts
 * with a symbol, a scene, a round or nothing but tags. Prose is left
 * alone, and so is whatever is in brackets or quotes. A symbol in the
 * player's own words is escaped on export ("\=>", escapeInner) so it
 * comes back as it was.
 */

/** A scene marker (§5.3): S1, S5a (flashback), S7.1 (montage), T1-S2 (a parallel storyline) or, before 1.7, T1+T2-S5. */
export const SCENE_ID = String.raw`(?:T\d+(?:\+T\d+)*-)?S\d+(?:\.\d+|[a-z])?`;

const SYMBOL = String.raw`(?:@|\?|d:|tbl:|gen:|->|=>)`;
// "S1 @…", "Rd1 [F:…] @…", "[/COMBAT] => …": what opens the line, then a symbol.
// "T1-S1 @(Alex)" alone is a scene and its point of view.
const SCENE_HEAD = new RegExp(String.raw`^(${SCENE_ID})\s+(?=${SYMBOL})(?!@\([^()]*\)\s*$)`);
const TAGS = String.raw`(?:\[(?:/?[A-Z][A-Z ]+|#?[A-Za-z]+:[^\]]*)\]\s*)`;
const ROUND_HEAD = new RegExp(String.raw`^(Rd\d+\b\s*${TAGS}*)(?=\s*(?:@|d:|tbl:|=>))`);
const TAG_HEAD = new RegExp(String.raw`^(${TAGS}+)(?=@|d:|tbl:|=>)`);
const CORE_HEAD = /^(?:@|\?|d:|tbl:|gen:|->|=>)/;

type Element = "action" | "question" | "roll" | "consequence" | "head";

function elementOf(text: string): Element {
  if (text.startsWith("@")) return "action";
  if (text.startsWith("?")) return "question";
  if (text.startsWith("=>")) return "consequence";
  return /^(?:d:|tbl:|gen:|->)/.test(text) ? "roll" : "head";
}

/** Whether a new element opens here, after one of this kind. */
function opens(rest: string, current: Element): boolean {
  if (/^(?:=>|d:|tbl:|gen:)/.test(rest)) return true;
  // Anywhere else "->" is an outcome, or an arrow in someone's prose.
  if (rest.startsWith("->")) return current === "question";
  if (current === "action" || current === "question") return false;
  if (rest.startsWith("@(")) return true;
  // A bare "@" or "?" also shows up in prose: only with a roll or an answer after it.
  const resolved = /\s(?:d:|tbl:|->|=>)/.test(rest);
  return resolved && (/^@\s?\p{L}/u.test(rest) || /^\?\s?[\p{L}¿]/u.test(rest));
}

/** Where each element of a line starts (just [0] for one that isn't compact). */
function starts(line: string): number[] {
  const head = line.match(SCENE_HEAD) ?? line.match(ROUND_HEAD) ?? line.match(TAG_HEAD);
  if (!head && !CORE_HEAD.test(line)) return [0];
  const found = [0];
  let i = head ? head[0].length : 1;
  while (head && /\s/.test(line[i] ?? "")) i++;
  if (head) found.push(i);
  let current = elementOf(line.slice(head ? i : 0));
  let depth = 0;
  let quoted = false;
  // Unbalanced quotes say nothing.
  const quotes = (line.match(/"/g)?.length ?? 0) % 2 === 0;
  for (i = i + 1; i < line.length; i++) {
    const c = line[i];
    if (c === '"' && quotes) quoted = !quoted;
    else if (c === "[" || c === "(") depth++;
    else if (c === "]" || c === ")") depth = Math.max(0, depth - 1);
    if (depth || quoted || !/\s/.test(line[i - 1]) || !opens(line.slice(i), current)) continue;
    found.push(i);
    current = elementOf(line.slice(i));
  }
  return found;
}

/** A line's elements, each as its own line. */
export function splitCompact(line: string): string[] {
  const at = starts(line);
  return at.map((from, n) =>
    line
      .slice(from, at[n + 1])
      .trim()
      // "@(A) Slash -> d:14<15": an arrow that leads to the next element.
      .replace(n + 1 < at.length ? /\s+->$/ : /^$/, "")
      // "d:4<5 ->F" as the standard form spaces it.
      .replace(at.length > 1 ? /^(d:|tbl:.*?|->|=>|@(?!\()|\?)(?=\S)/ : /^$/, (s) => (/^tbl:.+/.test(s) ? s : `${s} `))
      .replace(at.length > 1 && /^(?:d|tbl):/.test(line.slice(from)) ? /\s->(?=\S)/ : /^$/, " -> "),
  );
}

/** A line meant as one element, with any symbol in it that would split it escaped. */
export function escapeInner(line: string): string {
  let text = line;
  for (let at = starts(text); at.length > 1; at = starts(text)) text = `${text.slice(0, at[1])}\\${text.slice(at[1])}`;
  return text;
}

/** The symbols escapeInner escaped, back as they were. */
export function unescapeInner(text: string): string {
  return text.replace(new RegExp(String.raw`(\s)\\(?=${SYMBOL})`, "g"), "$1");
}
