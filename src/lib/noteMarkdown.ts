/**
 * The Markdown the notebook's own text understands (pinned notes and
 * descriptions): what people type in notes anywhere, kept light on
 * purpose. Line by line: checkboxes ("- [ ] "), bullets, numbered
 * items, headings ("# ", up to three sizes), quotes ("> ") and a
 * divider ("---"); inside a line, **bold**, *italic*, ~~struck~~,
 * `code`, [links](https://…) and bare web addresses. "\*" is a plain
 * asterisk. The text is stored and exported exactly as typed: only
 * the drawing changes (NoteText, and the HTML export).
 */

export type InlineNode =
  | { kind: "text"; text: string }
  | { kind: "code"; text: string }
  | { kind: "strong" | "em" | "del"; children: InlineNode[] }
  | { kind: "link"; href: string; children: InlineNode[] };

/**
 * One alternative per kind, the earliest in the line winning (on the
 * same character, the first listed: "**" before "*"; bold closes on the
 * last of a run, so "**a *b***" is bold with italic inside). Underscores only
 * count at a word's edge, so snake_case stays as it is; an address
 * doesn't take the punctuation after it.
 */
const INLINE =
  /\\([\\`*_~[\]()#>!-])|`([^`\n]+)`|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|\*\*(?=\S)(.+?)(?<=\S)\*\*(?!\*)|(?<![\p{L}\p{N}_])__(?=\S)(.+?)(?<=\S)__(?![\p{L}\p{N}_])|~~(?=\S)(.+?)(?<=\S)~~|\*(?=[^\s*])(.+?)(?<=[^\s*])\*|(?<![\p{L}\p{N}_])_(?=[^\s_])(.+?)(?<=[^\s_])_(?![\p{L}\p{N}_])|(https?:\/\/[^\s<>"'«»]*[^\s<>"'«».,;:!?)\]])/gu;

/**
 * Longer than this, a line is shown as it's written: some of the marks
 * above take a time that grows with the square of the length on text
 * no one writes ("[[[[…", "****…"), and a pasted note could freeze the
 * screen that draws it. A paragraph of a whole page is under 4,000.
 */
const MAX_MARKED_LINE = 10_000;

/** A line's text as runs of plain, bold, italic, struck, code and links. */
export function parseInline(text: string): InlineNode[] {
  if (text.length > MAX_MARKED_LINE) return text ? [{ kind: "text", text }] : [];
  const nodes: InlineNode[] = [];
  const push = (value: string) => {
    if (!value) return;
    const previous = nodes.at(-1);
    if (previous?.kind === "text") previous.text += value;
    else nodes.push({ kind: "text", text: value });
  };
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const [whole, escaped, code, linkText, href, strong, strongUnderscore, struck, em, emUnderscore, url] = match;
    push(text.slice(last, match.index));
    if (escaped !== undefined) push(escaped);
    else if (code !== undefined) nodes.push({ kind: "code", text: code });
    else if (href !== undefined) nodes.push({ kind: "link", href, children: parseInline(linkText) });
    else if (strong !== undefined || strongUnderscore !== undefined)
      nodes.push({ kind: "strong", children: parseInline(strong ?? strongUnderscore) });
    else if (struck !== undefined) nodes.push({ kind: "del", children: parseInline(struck) });
    else if (em !== undefined || emUnderscore !== undefined) nodes.push({ kind: "em", children: parseInline(em ?? emUnderscore) });
    else nodes.push({ kind: "link", href: url, children: [{ kind: "text", text: url }] });
    last = match.index + whole.length;
  }
  push(text.slice(last));
  return nodes;
}

/** The text without its marks, as it reads. */
export function inlinePlainText(nodes: InlineNode[]): string {
  return nodes.map((node) => ("children" in node ? inlinePlainText(node.children) : node.text)).join("");
}

export type NoteLine =
  | { kind: "check"; checked: boolean; text: string; depth: number }
  | { kind: "bullet"; text: string; depth: number }
  | { kind: "ordered"; marker: string; text: string; depth: number }
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "quote"; text: string }
  | { kind: "rule" }
  | { kind: "gap" }
  | { kind: "text"; text: string };

const CHECKBOX_LINE = /^(\s*[-*+] )\[( |x|X)\] (.*)$/;

/** How far in a list item is: two spaces (or a tab) a step, up to three. */
function depthOf(lead: string): number {
  return Math.min(3, Math.floor(lead.replace(/\t/g, "  ").length / 2));
}

/** What one line of a note is. */
export function readNoteLine(line: string): NoteLine {
  const box = line.match(CHECKBOX_LINE);
  if (box) return { kind: "check", checked: box[2] !== " ", text: box[3], depth: depthOf(box[1].match(/^\s*/)![0]) };
  if (/^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) return { kind: "rule" };
  const bullet = line.match(/^(\s*)[-*+] (.*)$/);
  if (bullet) return { kind: "bullet", text: bullet[2], depth: depthOf(bullet[1]) };
  const ordered = line.match(/^(\s*)(\d{1,3}[.)]) (.*)$/);
  if (ordered) return { kind: "ordered", marker: ordered[2], text: ordered[3], depth: depthOf(ordered[1]) };
  const heading = line.match(/^\s{0,3}(#{1,6}) (.*)$/);
  if (heading) return { kind: "heading", level: Math.min(3, heading[1].length) as 1 | 2 | 3, text: heading[2] };
  const quote = line.match(/^\s{0,3}> ?(.*)$/);
  if (quote) return { kind: "quote", text: quote[1] };
  return line.trim() ? { kind: "text", text: line } : { kind: "gap" };
}

/** Ticks or unticks the checkbox on that line (counted from 0); any other line, as it was. */
export function toggleNoteCheckbox(notes: string, index: number): string {
  const lines = notes.split("\n");
  if (index < 0 || index >= lines.length) return notes;
  lines[index] = lines[index].replace(CHECKBOX_LINE, (_, lead: string, mark: string, rest: string) =>
    `${lead}[${mark === " " ? "x" : " "}] ${rest}`,
  );
  return lines.join("\n");
}
