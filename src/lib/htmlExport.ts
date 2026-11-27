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

import { isStoryEntry } from "./zenMode";
import { interpolate, type Dictionary } from "./i18n";
import { sessionDate, type JournalEntry } from "./lonelog";
import type { CastDescription } from "./journal";
import {
  buildEntryBlocks,
  groupBySession,
  splitOwnRolls,
  splitRollText,
  splitRollTotal,
  storylineViews,
} from "./journalUi";
import {
  buildCast,
  PROGRESS_KINDS,
  QUANTITY_KINDS,
  progressText,
  splitTags,
  threadStatus,
  type CastMember,
  showDetail,
} from "./lonelogTags";
import type { Answer } from "./oracle";
import { expandAnswer } from "./i18n/answerText";
import { noteForm, parseScene, splitActor } from "./lonelogLines";
import { parseInline, readNoteLine, type InlineNode } from "./noteMarkdown";

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
  "--color-die-white",
  "--color-die-black",
  "--color-card-red",
] as const;

const KIND_SYMBOL: Record<Exclude<JournalEntry["kind"], "session" | "scene">, string> = {
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
function taggedHtml(t: Dictionary, text: string): string {
  return splitTags(text)
    .map((part) => {
      if (!part.tag) return escapeHtml(part.text);
      const { name, details, progress } = part.tag;
      const extra = [
        progress ? progressText(progress) : "",
        ...details.map((d) => showDetail(d, t.notebook.categories)),
      ]
        .filter(Boolean)
        .join(" · ");
      return `<span class="tag"><b>${escapeHtml(name)}</b>${extra ? ` <small>${escapeHtml(extra)}</small>` : ""}</span>`;
    })
    .join("")
    .replace(/\n/g, "<br>");
}

/** A roll's dice or cards as HTML ("" for none), by its detail and result (RollDrawing). */
type DrawRoll = (detail: string, result: string | null) => string;

function rollHtml(
  t: Dictionary,
  entry: JournalEntry,
  answer: Answer | undefined,
  drawRoll: DrawRoll,
): string {
  const drawn = (detail: string, result: string | null) => {
    const html = drawRoll(detail, result);
    return html && `<span class="drawn">${html}</span>`;
  };
  const series = splitOwnRolls(entry.text);
  if (series) {
    const dice = series.rolls
      .map((r) => {
        const { total, faces } = splitRollTotal(r.result);
        return `<span class="die"><small>${escapeHtml(r.label ? `${r.label} · ${r.die}` : r.die)}</small><span class="drawn-row">${drawn(r.die, r.result)}<span class="total">${escapeHtml(total)}${faces ? `<small>${escapeHtml(faces)}</small>` : ""}</span></span></span>`;
      })
      .join("");
    return `${series.label ? `<p class="detail">${escapeHtml(series.label)}</p>` : ""}<p class="dice">${dice}</p>`;
  }
  // A generator's axes or a table written out, under its first line.
  const [first, ...rest] = entry.text.split("\n");
  if (rest.length)
    return `${rollHtml(t, { ...entry, text: first! }, answer, drawRoll)}<p class="detail">${rest.map(escapeHtml).join("<br>")}</p>`;
  const { detail, result, answer: parsed } = splitRollText(entry.text);
  const drawing = drawn(detail, result);
  if (result === null) return `<p>${drawing}${escapeHtml(entry.text)}</p>`;
  const known = answer ?? parsed;
  return `<p class="detail">${escapeHtml(detail)}</p>${
    known
      ? `<p class="drawn-row">${drawing}<span class="answer ${known}">${escapeHtml(expandAnswer(t, result))}</span></p>`
      : `<p class="result drawn-row">${drawing}<span>${escapeHtml(result)}</span></p>`
  }`;
}

/** A note as the journal draws it: a narrative block, a line of dialogue, an aside, a block marker. */
function noteHtml(t: Dictionary, text: string, view?: string): string {
  const form = noteForm(text);
  switch (form.form) {
    case "excerpt":
      return `<blockquote>${escapeHtml(form.text).replace(/\n/g, "<br>")}</blockquote>`;
    case "dialogue":
      return `<p><b>${escapeHtml((form.pc && !form.name && view) || form.speaker)}:</b> ${taggedHtml(t, form.text)}</p>`;
    case "meta":
      return `<p class="meta">(${form.label ? `${escapeHtml(form.label)}: ` : ""}${taggedHtml(t, form.text)})</p>`;
    case "block":
    case "round":
      return `<p class="marker">${taggedHtml(t, text)}</p>`;
    default:
      return `<p>${taggedHtml(t, text)}</p>`;
  }
}

function entryHtml(
  t: Dictionary,
  entry: JournalEntry,
  answerFor: (rollId?: string) => Answer | undefined,
  drawRoll: DrawRoll,
  view?: string,
): string {
  const kind = entry.kind === "session" || entry.kind === "scene" ? "note" : entry.kind;
  const symbol = KIND_SYMBOL[kind];
  const body =
    kind === "roll"
      ? rollHtml(t, entry, answerFor(entry.linkedRollId), drawRoll)
      : kind === "note"
        ? noteHtml(t, entry.text, view)
        : kind === "action"
          ? actionHtml(t, entry.text, view)
          : `<p>${taggedHtml(t, entry.text)}</p>`;
  return `<div class="entry ${kind}">${symbol ? `<span class="sym">${escapeHtml(symbol)}</span>` : `<span class="sym"></span>`}<div>${body}</div></div>`;
}

/** A line's bold, italic, struck, code and links (noteMarkdown), as on screen. */
function inlineHtml(nodes: InlineNode[]): string {
  return nodes
    .map((node) => {
      switch (node.kind) {
        case "text":
          return escapeHtml(node.text);
        case "code":
          return `<code>${escapeHtml(node.text)}</code>`;
        case "strong":
          return `<strong>${inlineHtml(node.children)}</strong>`;
        case "em":
          return `<em>${inlineHtml(node.children)}</em>`;
        case "del":
          return `<del>${inlineHtml(node.children)}</del>`;
        case "link":
          return `<a href="${escapeHtml(node.href)}" rel="noreferrer">${inlineHtml(node.children)}</a>`;
      }
    })
    .join("");
}

/** The notebook's own text (pinned notes, a description) with its Markdown drawn. */
function notesHtml(notes: string): string {
  return notes
    .split("\n")
    .map((raw) => {
      const line = readNoteLine(raw);
      const text = "text" in line ? inlineHtml(parseInline(line.text)) : "";
      const indent = "depth" in line && line.depth ? ` style="margin-left:${line.depth}rem"` : "";
      switch (line.kind) {
        case "check":
          return `<p class="check${line.checked ? " done" : ""}"${indent}>${line.checked ? "☑" : "☐"} ${text}</p>`;
        case "bullet":
          return `<p class="bullet"${indent}>• ${text}</p>`;
        case "ordered":
          return `<p class="bullet"${indent}>${escapeHtml(line.marker)} ${text}</p>`;
        case "heading":
          return `<p class="h${line.level}">${text}</p>`;
        case "quote":
          return `<p class="quote">${text}</p>`;
        case "rule":
          return "<hr>";
        case "gap":
          return `<p class="gap"></p>`;
        case "text":
          return `<p>${text}</p>`;
      }
    })
    .join("");
}

function castHtml(
  t: Dictionary,
  members: CastMember[],
  descriptions: Record<string, CastDescription>,
): string {
  return `<ul class="cast">${members
    .map((m) => {
      const status = m.kind === "thread" ? threadStatus(m) : null;
      const state =
        (PROGRESS_KINDS.has(m.kind) || QUANTITY_KINDS.has(m.kind)) && m.progress
          ? [progressText(m.progress), ...m.tags]
          : m.tags;
      const description = descriptions[m.key]?.text.trim();
      return `<li${status && status !== "open" ? ' class="closed"' : ""}><small>${escapeHtml(t.notebook.kinds[m.kind])}</small> <b>${escapeHtml(m.name)}</b>${
        state.length ? ` <span>${escapeHtml(state.join(" · "))}</span>` : ""
      }${description ? `<div class="desc">${notesHtml(description)}</div>` : ""}</li>`;
    })
    .join("")}</ul>`;
}

/** `@(Jonah) …`: who acts goes first, in bold. */
function actionHtml(t: Dictionary, text: string, view?: string): string {
  const own = splitActor(text);
  const { actor, text: action } = own.actor || !view ? own : { actor: view, text };
  return `<p>${actor ? `<b>${escapeHtml(actor)}:</b> ` : ""}${taggedHtml(t, action)}</p>`;
}

/** "S1 · Tavern, evening", a heading within the session. */
function sceneHtml(t: Dictionary, entry: JournalEntry): string {
  const { id, context, combat, pov } = parseScene(entry.text);
  return `<h3 class="scene">${escapeHtml(id)}${context ? ` · ${taggedHtml(t, context)}` : ""}${pov ? ` · ${escapeHtml(pov)}` : ""}${combat ? " ⚔" : ""}</h3>`;
}

export function exportAdventureToHtml({
  t,
  name,
  entries,
  notes = "",
  descriptions = {},
  theme,
  answerFor = () => undefined,
  drawRoll = () => "",
  exportedAt = new Date(),
  story = false,
}: {
  t: Dictionary;
  name: string;
  entries: JournalEntry[];
  notes?: string;
  descriptions?: Record<string, CastDescription>;
  theme: ExportTheme;
  answerFor?: (rollId?: string) => Answer | undefined;
  /** Draws a roll's dice or cards (needs the DOM: drawRolls.tsx); without it, only the text. */
  drawRoll?: DrawRoll;
  exportedAt?: Date;
  /**
   * Only the story (zen mode, zenMode.ts): what's told, each entry on
   * the page without a card, and of the notebook the pinned notes and
   * who and where (not clocks or inventory, which are the game's).
   */
  story?: boolean;
}): string {
  const all = [...entries].sort((a, b) => a.timestamp - b.timestamp);
  const sorted = story ? all.filter(isStoryEntry) : all;
  // The notebook comes from every entry: a tag-only note isn't told, but it's still the cast.
  const cast = buildCast(all);
  const characters = cast.filter((c) => ["pc", "npc", "place", "room", "foe"].includes(c.kind));
  const threads = story
    ? []
    : cast.filter((c) => c.kind === "thread" || c.kind === "event" || PROGRESS_KINDS.has(c.kind));
  const inventory = story ? [] : cast.filter((c) => QUANTITY_KINDS.has(c.kind));
  const date = new Intl.DateTimeFormat(t.dateLocale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(exportedAt);

  const views = storylineViews(groupBySession(sorted));
  const sessions = groupBySession(sorted)
    .filter((g) => g.sessionEntry || g.items.length)
    .map((group) => {
      const blocks = buildEntryBlocks(group.items)
        .map((block) =>
          block[0]!.kind === "scene"
            ? sceneHtml(t, block[0]!)
            : `<section class="${story ? "told" : "card"}">${block.map((e) => entryHtml(t, e, answerFor, drawRoll, views.get(e.id))).join("")}</section>`,
        )
        .join("");
      const session = group.sessionEntry;
      const played = session ? sessionDate(session) : null;
      const playedText = played
        ? new Intl.DateTimeFormat(t.dateLocale, {
            day: "numeric",
            month: "long",
            year: "numeric",
          }).format(new Date(`${played}T12:00`))
        : "";
      const title = session
        ? `<h2>${escapeHtml(session.text)}${playedText && playedText !== session.text ? ` <time datetime="${played}">${playedText}</time>` : ""}</h2>`
        : "";
      return `<article class="session">${title}${blocks}</article>`;
    })
    .join("");

  const aside = [
    notes.trim()
      ? `<section class="box"><h3>${escapeHtml(t.notebook.notesTitle)}</h3>${notesHtml(notes)}</section>`
      : "",
    characters.length
      ? `<section class="box"><h3>${escapeHtml(t.notebook.castTitle)}</h3>${castHtml(t, characters, descriptions)}</section>`
      : "",
    threads.length
      ? `<section class="box"><h3>${escapeHtml(t.notebook.threadsTitle)}</h3>${castHtml(t, threads, descriptions)}</section>`
      : "",
    inventory.length
      ? `<section class="box"><h3>${escapeHtml(t.notebook.inventoryTitle)}</h3>${castHtml(t, inventory, descriptions)}</section>`
      : "",
  ].join("");

  const colors = EXPORT_COLOR_TOKENS.map(
    (token) => `    ${token}: ${theme.colors[token] ?? "inherit"};`,
  ).join("\n");
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
h2 time { float: right; font: .8rem/1.6 var(--font-text); color: var(--color-parchment-dim); }
.told { display: grid; gap: .6rem; padding: .1rem 1rem; }
.card { border: 1px solid var(--color-ink-border); background: var(--color-ink-900); border-radius: .75rem; padding: .75rem 1rem; display: grid; gap: .6rem; break-inside: avoid; }
.entry { display: grid; grid-template-columns: 1.6rem minmax(0, 1fr); gap: .5rem; }
.entry p { margin: 0; }
.sym { color: var(--color-gold); font: 600 .8rem/1.9 ui-monospace, monospace; }
.question p { font-style: italic; }
.note p { color: color-mix(in srgb, var(--color-parchment) 90%, transparent); }
h3.scene { font-size: 1rem; font-weight: 600; color: var(--color-gold); margin: .4rem 0 0; }
blockquote { margin: 0; padding: .2rem 0 .2rem .8rem; border-left: 3px solid color-mix(in srgb, var(--color-gold) 50%, transparent); font-style: italic; }
.meta, .marker { color: var(--color-parchment-dim); font-size: .9em; }
.meta { font-style: italic; }
.detail { font-size: .78rem; color: var(--color-parchment-dim); }
.result { font-weight: 600; }
.answer { display: inline-block; border: 1px solid; border-radius: 999px; padding: .05rem .7rem; font: 700 .9rem/1.6 var(--font-text); text-transform: uppercase; letter-spacing: .04em; }
.answer.si { color: var(--color-yes); background: color-mix(in srgb, var(--color-yes) 10%, transparent); }
.answer.no { color: var(--color-no); background: color-mix(in srgb, var(--color-no) 10%, transparent); }
.answer.contradiccion { color: var(--color-contradiction); background: color-mix(in srgb, var(--color-contradiction) 10%, transparent); }
.dice { display: flex; flex-wrap: wrap; gap: .4rem; }
.die { display: inline-flex; flex-direction: column; align-items: center; min-width: 2.75rem; max-width: 100%; border: 1px solid var(--color-ink-border); border-radius: .5rem; padding: .15rem .5rem; font-weight: 600; }
.die small { font-size: .65rem; font-weight: 400; color: var(--color-parchment-dim); }
.drawn-row { display: flex; flex-wrap: wrap; align-items: center; gap: .2rem .6rem; }
.result.drawn-row > span:last-child { flex: 1; min-width: 8rem; }
.drawn, .drawn span { display: inline-flex; flex-wrap: wrap; gap: .25rem; }
.drawn svg { flex: none; filter: drop-shadow(0 1px 1.5px rgb(0 0 0 / .4)); print-color-adjust: exact; -webkit-print-color-adjust: exact; }
.die .drawn-row { justify-content: center; }
.total { display: flex; flex-direction: column; align-items: center; min-width: 0; line-height: 1.3; overflow-wrap: anywhere; }
.tag { border: 1px solid color-mix(in srgb, var(--color-gold) 35%, transparent); background: color-mix(in srgb, var(--color-gold) 8%, transparent); border-radius: .4rem; padding: 0 .35rem; font-style: normal; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
.tag small { color: var(--color-parchment-dim); }
aside { display: grid; gap: 1rem; }
.box { border: 1px solid var(--color-ink-border); background: var(--color-ink-900); border-radius: .75rem; padding: .9rem 1rem; font-size: .9rem; }
.box h3 { font: 700 .8rem/1.6 var(--font-text); letter-spacing: .04em; text-transform: uppercase; color: var(--color-gold); margin-bottom: .5rem; }
.box p { margin: 0; }
.box .gap { height: .5rem; }
.box .done { color: var(--color-parchment-dim); text-decoration: line-through; }
.box .h1 { font-weight: 700; font-size: 1rem; margin-top: .3rem; }
.box .h2 { font-weight: 700; margin-top: .3rem; }
.box .h3 { font-weight: 700; font-size: .75rem; letter-spacing: .04em; text-transform: uppercase; color: var(--color-parchment-dim); margin-top: .3rem; }
.box .h1:first-child, .box .h2:first-child, .box .h3:first-child { margin-top: 0; }
.box .quote { border-left: 2px solid color-mix(in srgb, var(--color-gold) 40%, transparent); padding-left: .6rem; font-style: italic; color: var(--color-parchment-dim); }
.box hr { border: 0; border-top: 1px solid var(--color-ink-border); margin: .4rem 0; }
.box code { font: .85em ui-monospace, monospace; border: 1px solid var(--color-ink-border); border-radius: .25rem; padding: 0 .2rem; }
.box del { color: var(--color-parchment-dim); }
.box a { color: var(--color-gold); overflow-wrap: anywhere; }
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
${story ? `<p>${escapeHtml(t.journal.htmlStoryNote)}</p>\n` : ""}<p>${escapeHtml(interpolate(t.journal.htmlExportedOn, { date }))} · ${interpolate(
    escapeHtml(t.journal.lonelogCreditLine),
    {
      app: '<a href="https://jgalilea.github.io/solo-compass/">Solo Compass</a>',
      lonelog: '<a href="https://lonelog.itch.io/lonelog">Lonelog</a>',
    },
  )}</p>
</header>
<div>${sessions}</div>
${aside ? `<aside>${aside}</aside>` : ""}
</main>
</body>
</html>
`;
}
