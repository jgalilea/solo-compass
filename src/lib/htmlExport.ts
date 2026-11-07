/**
 * An adventure as a single, self-contained HTML page to read or share:
 * the same journal as on screen (sessions, question + roll +
 * consequences grouped in cards, oracle answers in colour, character
 * and place tags as chips), its pinned notes and its notebook (cast,
 * threads and clocks), in the theme the app is showing when exported.
 *
 * The theme travels as CSS variables at the top of the file, with a
 * comment saying so: whoever wants other colours or another font only
 * has to change those lines. The display font is embedded (a data
 * URL) so the page looks the same offline and on any device; if it
 * can't be read, the page falls back to the font stack.
 *
 * Lonelog (.md) is still the interchange format: this is for reading.
 */

import { interpolate, type Dictionary } from "./i18n";
import type { JournalEntry } from "./lonelog";
import type { CastDescription } from "./journal";
import { buildEntryBlocks, groupBySession, splitRollSeries, splitRollText } from "./journalUi";
import {
  buildCast,
  PROGRESS_KINDS,
  progressText,
  splitTags,
  threadStatus,
  type CastMember,
} from "./lonelogTags";
import type { Answer } from "./oracle";

/** The theme as exported: colour tokens and the display font. */
export interface ExportTheme {
  /** "--color-gold" → "#d7b26d", etc. */
  colors: Record<string, string>;
  /** CSS font-family stack for titles. */
  fontDisplay: string;
  /** The display font's first family, embedded as a data URL, if read. */
  font?: { family: string; dataUrl: string };
  mode: "light" | "dark";
}

/** The colour tokens the page uses (the app's own names). */
export const EXPORT_COLOR_TOKENS = [
  "--color-ink-950",
  "--color-ink-900",
  "--color-ink-800",
  "--color-ink-700",
  "--color-ink-border",
  "--color-parchment",
  "--color-parchment-dim",
  "--color-gold",
  "--color-gold-soft",
  "--color-yes",
  "--color-no",
  "--color-contradiction",
] as const;

const KIND_SYMBOL: Record<Exclude<JournalEntry["kind"], "session">, string> = {
  action: "@",
  question: "?",
  roll: "d:",
  consequence: "=>",
  note: "",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Prose with its character/place tags as chips; line breaks kept. */
function taggedHtml(text: string): string {
  return splitTags(text)
    .map((part) => {
      if (!part.tag) return escapeHtml(part.text);
      const { name, details, progress } = part.tag;
      const extra = [progress ? progressText(progress) : "", ...details].filter(Boolean).join(" · ");
      return `<span class="tag"><b>${escapeHtml(name)}</b>${extra ? ` <small>${escapeHtml(extra)}</small>` : ""}</span>`;
    })
    .join("")
    .replace(/\n/g, "<br>");
}

function rollHtml(entry: JournalEntry, answer: Answer | undefined): string {
  const series = splitRollSeries(entry.text);
  if (series) {
    const dice = series.rolls
      .map((r) => `<span class="die"><small>${escapeHtml(r.die)}</small>${escapeHtml(r.result)}</span>`)
      .join("");
    return `${series.label ? `<p class="detail">${escapeHtml(series.label)}</p>` : ""}<p class="dice">${dice}</p>`;
  }
  const { detail, result, answer: parsed } = splitRollText(entry.text);
  if (result === null) return `<p>${escapeHtml(entry.text)}</p>`;
  const known = answer ?? parsed;
  return `<p class="detail">${escapeHtml(detail)}</p>${
    known ? `<p><span class="answer ${known}">${escapeHtml(result)}</span></p>` : `<p class="result">${escapeHtml(result)}</p>`
  }`;
}

function entryHtml(entry: JournalEntry, answerFor: (rollId?: string) => Answer | undefined): string {
  const kind = entry.kind === "session" ? "note" : entry.kind;
  const symbol = KIND_SYMBOL[kind];
  const body = kind === "roll" ? rollHtml(entry, answerFor(entry.linkedRollId)) : `<p>${taggedHtml(entry.text)}</p>`;
  return `<div class="entry ${kind}">${symbol ? `<span class="sym">${escapeHtml(symbol)}</span>` : `<span class="sym"></span>`}<div>${body}</div></div>`;
}

function notesHtml(notes: string): string {
  return notes
    .split("\n")
    .map((line) => {
      const box = line.match(/^\s*[-*] \[( |x|X)\] (.*)$/);
      if (box) return `<p class="check${box[1] === " " ? "" : " done"}">${box[1] === " " ? "☐" : "☑"} ${escapeHtml(box[2])}</p>`;
      const bullet = line.match(/^\s*[-*] (.*)$/);
      if (bullet) return `<p class="bullet">• ${escapeHtml(bullet[1])}</p>`;
      return line.trim() ? `<p>${escapeHtml(line)}</p>` : `<p class="gap"></p>`;
    })
    .join("");
}

function castHtml(t: Dictionary, members: CastMember[], descriptions: Record<string, CastDescription>): string {
  return `<ul class="cast">${members
    .map((m) => {
      const status = m.kind === "thread" ? threadStatus(m) : null;
      const state = PROGRESS_KINDS.has(m.kind) && m.progress ? [progressText(m.progress)] : m.tags;
      const description = descriptions[m.key]?.text.trim();
      return `<li${status && status !== "open" ? ' class="closed"' : ""}><small>${escapeHtml(t.notebook.kinds[m.kind])}</small> <b>${escapeHtml(m.name)}</b>${
        state.length ? ` <span>${escapeHtml(state.join(" · "))}</span>` : ""
      }${description ? `<p class="desc">${escapeHtml(description).replace(/\n/g, "<br>")}</p>` : ""}</li>`;
    })
    .join("")}</ul>`;
}

export function exportAdventureToHtml({
  t,
  name,
  entries,
  notes = "",
  descriptions = {},
  theme,
  answerFor = () => undefined,
  exportedAt = new Date(),
}: {
  t: Dictionary;
  name: string;
  entries: JournalEntry[];
  notes?: string;
  descriptions?: Record<string, CastDescription>;
  theme: ExportTheme;
  answerFor?: (rollId?: string) => Answer | undefined;
  exportedAt?: Date;
}): string {
  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
  const cast = buildCast(sorted);
  const characters = cast.filter((c) => c.kind === "pc" || c.kind === "npc" || c.kind === "place");
  const threads = cast.filter((c) => c.kind === "thread" || PROGRESS_KINDS.has(c.kind));
  const date = new Intl.DateTimeFormat(t.dateLocale, { day: "numeric", month: "long", year: "numeric" }).format(exportedAt);

  const sessions = groupBySession(sorted)
    .filter((g) => g.sessionEntry || g.items.length)
    .map((group) => {
      const blocks = buildEntryBlocks(group.items)
        .map((block) => `<section class="card">${block.map((e) => entryHtml(e, answerFor)).join("")}</section>`)
        .join("");
      const title = group.sessionEntry ? `<h2>${escapeHtml(group.sessionEntry.text)}</h2>` : "";
      return `<article class="session">${title}${blocks}</article>`;
    })
    .join("");

  const aside = [
    notes.trim() ? `<section class="box"><h3>${escapeHtml(t.notebook.notesTitle)}</h3>${notesHtml(notes)}</section>` : "",
    characters.length ? `<section class="box"><h3>${escapeHtml(t.notebook.castTitle)}</h3>${castHtml(t, characters, descriptions)}</section>` : "",
    threads.length ? `<section class="box"><h3>${escapeHtml(t.notebook.threadsTitle)}</h3>${castHtml(t, threads, descriptions)}</section>` : "",
  ].join("");

  const colors = EXPORT_COLOR_TOKENS.map((token) => `    ${token}: ${theme.colors[token] ?? "inherit"};`).join("\n");
  const fontFace = theme.font
    ? `@font-face { font-family: ${JSON.stringify(theme.font.family)}; src: url(${theme.font.dataUrl}) format("woff2"); font-display: swap; }\n`
    : "";

  return `<!doctype html>
<html lang="${t.dateLocale.slice(0, 2)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(name)}</title>
<style>
${fontFace}:root {
    /* ${escapeHtml(t.journal.htmlThemeComment)} */
${colors}
    --font-display: ${theme.fontDisplay};
    --font-text: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color-scheme: ${theme.mode};
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--color-ink-950); color: var(--color-parchment); font: 17px/1.6 var(--font-text); }
main { max-width: 72rem; margin: 0 auto; padding: 2.5rem 1.25rem 4rem; display: grid; gap: 2.5rem; }
@media (min-width: 900px) { main.with-aside { grid-template-columns: minmax(0, 1fr) 18rem; align-items: start; } aside { position: sticky; top: 1.5rem; } }
header { grid-column: 1 / -1; border-bottom: 1px solid var(--color-ink-border); padding-bottom: 1.25rem; }
h1, h2, h3 { font-family: var(--font-display); font-weight: 700; letter-spacing: .02em; margin: 0; }
h1 { font-size: clamp(1.8rem, 4vw, 2.6rem); color: var(--color-parchment); }
header p { margin: .4rem 0 0; color: var(--color-parchment-dim); font-size: .85rem; }
header a { color: var(--color-gold); }
.session { display: grid; gap: .6rem; margin-bottom: 2rem; }
h2 { font-size: 1.15rem; color: var(--color-parchment); border: 1px solid color-mix(in srgb, var(--color-gold) 50%, transparent); background: color-mix(in srgb, var(--color-gold) 10%, transparent); border-radius: .75rem; padding: .6rem 1rem; }
.card { border: 1px solid var(--color-ink-border); background: var(--color-ink-900); border-radius: .75rem; padding: .75rem 1rem; display: grid; gap: .6rem; break-inside: avoid; }
.entry { display: grid; grid-template-columns: 1.6rem minmax(0, 1fr); gap: .5rem; }
.entry p { margin: 0; }
.sym { color: var(--color-gold); font: 600 .8rem/1.9 ui-monospace, monospace; }
.question p { font-style: italic; }
.note p { color: color-mix(in srgb, var(--color-parchment) 90%, transparent); }
.detail { font-size: .78rem; color: var(--color-parchment-dim); }
.result { font-weight: 600; }
.answer { display: inline-block; border: 1px solid; border-radius: 999px; padding: .05rem .7rem; font: 700 .9rem/1.6 var(--font-display); text-transform: uppercase; letter-spacing: .04em; }
.answer.si { color: var(--color-yes); background: color-mix(in srgb, var(--color-yes) 10%, transparent); }
.answer.no { color: var(--color-no); background: color-mix(in srgb, var(--color-no) 10%, transparent); }
.answer.contradiccion { color: var(--color-contradiction); background: color-mix(in srgb, var(--color-contradiction) 10%, transparent); }
.dice { display: flex; flex-wrap: wrap; gap: .4rem; }
.die { display: inline-flex; flex-direction: column; align-items: center; min-width: 2.75rem; border: 1px solid var(--color-ink-border); border-radius: .5rem; padding: .15rem .5rem; font-weight: 600; }
.die small { font-size: .65rem; font-weight: 400; color: var(--color-parchment-dim); }
.tag { border: 1px solid color-mix(in srgb, var(--color-gold) 35%, transparent); background: color-mix(in srgb, var(--color-gold) 8%, transparent); border-radius: .4rem; padding: 0 .35rem; font-style: normal; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
.tag small { color: var(--color-parchment-dim); }
aside { display: grid; gap: 1rem; }
.box { border: 1px solid var(--color-ink-border); background: var(--color-ink-900); border-radius: .75rem; padding: .9rem 1rem; font-size: .9rem; }
.box h3 { font-size: .8rem; text-transform: uppercase; color: var(--color-gold); margin-bottom: .5rem; }
.box p { margin: 0; }
.box .gap { height: .5rem; }
.box .done { color: var(--color-parchment-dim); text-decoration: line-through; }
.cast { list-style: none; margin: 0; padding: 0; display: grid; gap: .35rem; }
.cast small { color: var(--color-gold); font-size: .7rem; text-transform: uppercase; }
.cast span { color: var(--color-parchment-dim); }
.cast .desc { margin: .15rem 0 0; font-size: .85rem; color: var(--color-parchment-dim); }
.cast .closed b { text-decoration: line-through; color: var(--color-parchment-dim); }
@media print { body { background: none; } aside { position: static; } .card, .box { break-inside: avoid; } }
</style>
</head>
<body>
<main class="${aside ? "with-aside" : ""}">
<header>
<h1>${escapeHtml(name)}</h1>
<p>${escapeHtml(interpolate(t.journal.htmlExportedOn, { date }))} · ${interpolate(escapeHtml(t.journal.lonelogCreditLine), {
    app: '<a href="https://jgalilea.github.io/solo-compass/">Solo Compass</a>',
    lonelog: '<a href="https://lonelog.itch.io/lonelog">Lonelog</a>',
  })}</p>
</header>
<div>${sessions}</div>
${aside ? `<aside>${aside}</aside>` : ""}
</main>
</body>
</html>
`;
}
