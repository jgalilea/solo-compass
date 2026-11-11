import { createElement, useRef, useState, type ComponentType } from "react";
import { isCardDraw, showDraws } from "../lib/cards";
import type { EntryMatch } from "../lib/journalSearch";
import { highlightParts } from "../lib/text";
import { sessionDate, type JournalEntry, type JournalLineKind } from "../lib/lonelog";
import { castKey, progressDone, progressText, splitTags, type CastMember } from "../lib/lonelogTags";
import { noteForm, parseScene, splitActor, splitRollSymbol, type NoteForm } from "../lib/lonelogLines";
import { useTagAutocomplete } from "../hooks/useTagAutocomplete";
import { CastIcon } from "./CastIcon";
import { TagSuggestions } from "./TagSuggestions";
import { interpolate } from "../lib/i18n";
import type { Answer } from "../lib/oracle";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS, type EntryGroup, buildEntryBlocks, formatIsoDay, splitRollSeries, splitRollText } from "../lib/journalUi";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { titleIfCut } from "../lib/truncation";
import { ActionMenu, type ActionMenuItem } from "./ActionMenu";
import {
  IconAction,
  IconArrowDown,
  IconArrowUp,
  IconChevronRight,
  IconCombat,
  IconConsequence,
  IconCopy,
  IconDialogue,
  IconCards,
  IconDice,
  IconExcerpt,
  IconGenerator,
  IconInsertBelow,
  IconInventory,
  IconNote,
  IconPencil,
  IconQuestion,
  IconRoom,
  IconScene,
  IconSession,
  IconTable,
  IconTrash,
} from "./icons/Icons";

/**
 * Rows shared between JournalListView and AdventureDetailView (the
 * latter is the one that actually uses them; they live here because
 * they're components, not utilities — see src/lib/journalUi.ts for
 * those).
 *
 * Which entry is being edited lives in the parent (a single id for the
 * whole screen, via editingId/onStartEdit/onStopEdit) instead of in
 * each row: so opening one closes any other that was open, instead of
 * allowing several forms at once.
 *
 * Pencil and trash don't take fixed space on every line: with a mouse
 * they show on hover, and on touch when the entry is tapped (selectedId,
 * also in the parent). They float over the corner instead of reserving
 * a gap, so the text doesn't change width when they appear.
 *
 * Lonelog is the export format, not the view: here each kind is drawn
 * with its icon (the symbol only appears on export), and a question +
 * its roll + its consequences are grouped into one block.
 */

export interface EntryActions {
  onDelete: (id: string) => void;
  onEdit: (id: string, text: string) => void;
  editingId: string | null;
  onStartEdit: (id: string) => void;
  onStopEdit: () => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Oracle answer of a linked roll, if known (via history). */
  answerFor: (rollId: string | undefined) => Answer | undefined;
  /** Entry just jumped to from the search: briefly highlighted. */
  highlightedId?: string | null;
  /** A character/place chip was tapped (its castKey). */
  onTagClick?: (key: string) => void;
  /** The adventure's characters and places, suggested on "[" while editing. */
  cast?: CastMember[];
  /** Order: one place up/down, and writing below an entry. */
  onMove?: (id: string, direction: "up" | "down") => void;
  canMove?: (id: string, direction: "up" | "down") => boolean;
  onInsertBelow?: (id: string) => void;
  /** A session or a scene, with all it holds, to the clipboard as Lonelog. */
  onCopy?: (id: string) => void;
  /** Where new entries are being written ("write below"): kept in view. */
  anchorId?: string | null;
}

/**
 * The "⋯" items of an entry's buttons, if the screen offers them: order,
 * and copying a session or a scene (`copyable`).
 */
function orderProps(
  actions: EntryActions,
  id: string,
  copyable = false,
): Pick<LineButtonsProps, "onMoveUp" | "onMoveDown" | "onInsertBelow" | "onCopy"> {
  const { onMove, canMove, onInsertBelow, onCopy } = actions;
  return {
    onMoveUp: onMove && canMove?.(id, "up") !== false ? () => onMove(id, "up") : undefined,
    onMoveDown: onMove && canMove?.(id, "down") !== false ? () => onMove(id, "down") : undefined,
    onInsertBelow: onInsertBelow && (() => onInsertBelow(id)),
    onCopy: copyable && onCopy ? () => onCopy(id) : undefined,
  };
}

type IconType = ComponentType<{ size?: number; className?: string }>;

const KIND_ICON: Record<Exclude<JournalLineKind, "session">, IconType> = {
  action: IconAction,
  question: IconQuestion,
  roll: IconDice,
  consequence: IconConsequence,
  note: IconNote,
  scene: IconScene,
};

const BLOCK_ICON: Record<"combat" | "dungeon" | "resources", IconType> = {
  combat: IconCombat,
  dungeon: IconRoom,
  resources: IconInventory,
};

/** The icon beside an entry: its kind's, or what the line is (a table roll, a dialogue…). */
function entryIcon(entry: JournalEntry): IconType {
  if (entry.kind === "roll") {
    const { symbol } = splitRollSymbol(entry.text);
    if (symbol === "tbl") return IconTable;
    if (symbol === "gen") return IconGenerator;
    return isCardDraw(entry.text) ? IconCards : IconDice;
  }
  if (entry.kind === "note") {
    const form = noteForm(entry.text);
    if (form.form === "excerpt") return IconExcerpt;
    if (form.form === "dialogue") return IconDialogue;
    if (form.form === "block") return BLOCK_ICON[form.name];
    if (form.form === "round") return IconCombat;
  }
  return KIND_ICON[entry.kind === "session" ? "note" : entry.kind];
}

const ANSWER_CHIP: Record<Answer, string> = {
  si: "border-yes/40 bg-yes/10 text-yes",
  no: "border-no/40 bg-no/10 text-no",
  contradiccion: "border-contradiction/40 bg-contradiction/10 text-contradiction",
};

/**
 * Blocks drawn at first, and added each time "earlier entries" is
 * pressed: a session can hold thousands of entries (an imported journal
 * with no session markers), and drawing them all made every new entry
 * take seconds on a phone (e2e/volume.perf.ts).
 */
const BLOCK_PAGE = 80;

/**
 * A session's bar, pinned at the top while its entries scroll by (each
 * session's within its own stretch, so it's always the one you're
 * reading), its height fixed so the scene below it pins just under it.
 */
export const SESSION_BAR =
  "sticky top-0 z-20 -mx-4 flex h-session items-center bg-ink-950 px-4 sm:mx-0 sm:px-0 lg:top-14";
/** The rail down the left that marks a session's entries (and pins its scenes below its bar). */
export const SESSION_RAIL = "session-entries flex flex-col gap-2 border-l-2 border-gold/25 pl-2.5 sm:pl-3";

/** A session's entries, grouping question → roll → consequences. */
export function EntryList({ items, actions }: { items: JournalEntry[]; actions: EntryActions }) {
  const { t } = useLocaleContext();
  const blocks = buildEntryBlocks(items);
  const [shown, setShown] = useState(BLOCK_PAGE);
  // What the screen is pointing at (a search jump, the entry being
  // edited, selected or written below) is always drawn, with
  // everything after it.
  const targets = [actions.highlightedId, actions.editingId, actions.selectedId, actions.anchorId];
  const firstTarget = blocks.findIndex((block) => block.some((e) => targets.includes(e.id)));
  const needed = firstTarget >= 0 ? blocks.length - firstTarget : 0;
  if (needed > shown) setShown(needed);
  const start = Math.max(0, blocks.length - Math.max(shown, needed));
  const hiddenEntries = blocks.slice(0, start).reduce((n, block) => n + block.length, 0);

  return (
    <>
      {start > 0 && (
        <li className="flex justify-center">
          <button
            type="button"
            onClick={() => setShown((n) => n + BLOCK_PAGE)}
            className="flex items-center gap-1.5 rounded-xl border border-ink-border px-4 py-2 text-sm text-parchment-dim transition hover:border-gold/50 hover:text-gold"
          >
            <IconArrowUp size={16} />
            {interpolate(t.journal.showEarlierEntries, { count: hiddenEntries })}
          </button>
        </li>
      )}
      {blocks.slice(start).map((block) =>
        block[0].kind === "scene" ? (
          // A scene opens a stretch of the session: a heading, not a
          // card, pinned while you read it (scene-bar in index.css).
          <li key={block[0].id} className="scene-bar mt-2 bg-ink-950 px-1 py-1 first:mt-0">
            <EntryLine entry={block[0]} actions={actions} />
          </li>
        ) : block.length === 1 && block[0].kind !== "roll" && block[0].kind !== "question" ? (
          <li
            key={block[0].id}
            className="rounded-xl border border-ink-border/70 bg-ink-900/40 px-4 py-3"
          >
            <EntryLine entry={block[0]} actions={actions} />
          </li>
        ) : (
          <li
            key={block[0].id}
            className="flex flex-col gap-3 rounded-xl border border-ink-border bg-ink-800/50 px-4 py-3.5"
          >
            {block.map((entry) => (
              <EntryLine key={entry.id} entry={entry} actions={actions} />
            ))}
          </li>
        ),
      )}
    </>
  );
}

/**
 * The day a session was played, short ("9 nov 2026"). Nothing when it's
 * unknown, or when it's already the title (an untitled session is named
 * after its date).
 */
export function SessionDate({ session }: { session: JournalEntry }) {
  const { locale } = useLocaleContext();
  const iso = sessionDate(session);
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const day = new Date(y, m - 1, d);
  if (session.text === day.toLocaleDateString()) return null;
  return (
    <time dateTime={iso} className="shrink-0 text-xs text-parchment-dim">
      {day.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}
    </time>
  );
}

export function SessionGroupRow({
  group,
  expanded,
  onToggle,
  actions,
}: {
  group: EntryGroup;
  expanded: boolean;
  onToggle: () => void;
  actions: EntryActions;
}) {
  const { t } = useLocaleContext();
  const session = group.sessionEntry;
  const [value, setValue] = useState(session?.text ?? "");
  if (!session) return null;

  const editing = actions.editingId === session.id;

  function commit() {
    if (value.trim()) actions.onEdit(session!.id, value.trim());
    actions.onStopEdit();
  }

  return (
    <li id={`session-${session.id}`} className="flex scroll-mt-16 flex-col gap-2">
      {editing ? (
        <div className="flex items-center gap-2 rounded-xl border border-ink-border/70 bg-ink-900/40 px-4 py-2.5">
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") actions.onStopEdit();
            }}
            className={`${INPUT_CLASS} bg-ink-800/70`}
          />
          <button type="button" onClick={commit} className={PRIMARY_BUTTON_CLASS}>
            {t.common.save}
          </button>
        </div>
      ) : (
        // Pinned while it's open, like the current session's.
        <div className={expanded ? SESSION_BAR : "flex"}>
          <div data-entry className="group relative flex h-12 flex-1 items-center gap-1 rounded-xl border border-gold/30 bg-gold/[0.06] px-4 transition hover:border-gold/50">
            {/* A heading to jump between sessions with a screen reader;
                the button inside folds it (its name is the session's). */}
            <h2 className="flex min-w-0 flex-1">
              <button
                type="button"
                onClick={() => {
                  onToggle();
                  actions.onSelect(expanded ? null : session.id);
                }}
                aria-expanded={expanded}
                className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left"
              >
                <IconChevronRight
                  size={16}
                  className={`shrink-0 text-gold transition-transform ${expanded ? "rotate-90" : ""}`}
                />
                <span className="min-w-0 flex-1 truncate font-display text-base font-semibold tracking-wide text-parchment">
                  {session.text}
                </span>
                <SessionDate session={session} />
                <span aria-hidden className="shrink-0 text-xs text-parchment-faint">{group.items.length}</span>
                <span className="sr-only">{interpolate(t.journal.sessionEntryCount, { count: group.items.length })}</span>
              </button>
            </h2>
            {/* Expanding it with a tap selects it: that way its
                buttons are reachable on touch too. */}
            <LineButtons
              visible={actions.selectedId === session.id}
              onEdit={() => {
                setValue(session.text);
                actions.onStartEdit(session.id);
              }}
              onDelete={() => actions.onDelete(session.id)}
              {...orderProps(actions, session.id, true)}
            />
          </div>
        </div>
      )}
      {expanded && (
        // A rail down the left marks which entries belong to the session.
        <ul className={SESSION_RAIL}>
          <EntryList items={group.items} actions={actions} />
        </ul>
      )}
    </li>
  );
}

function EntryLine({ entry, actions }: { entry: JournalEntry; actions: EntryActions }) {
  const { t } = useLocaleContext();
  const [value, setValue] = useState(entry.text);
  const editing = actions.editingId === entry.id;
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Not in a roll: a "[...]" there is roll context, not a character.
  const tags = useTagAutocomplete({
    text: value,
    setText: setValue,
    inputRef,
    cast: actions.cast ?? [],
    enabled: editing && entry.kind !== "roll",
  });
  const Icon = entryIcon(entry);
  const kindLabel = {
    action: t.journal.kindAction,
    question: t.journal.kindQuestion,
    roll: t.journal.kindRoll,
    consequence: t.journal.kindConsequence,
    note: t.journal.kindNote,
    session: t.journal.kindSession,
    scene: t.journal.kindScene,
  }[entry.kind];

  function commit() {
    if (value.trim()) actions.onEdit(entry.id, value.trim());
    actions.onStopEdit();
  }

  // createElement: the icon depends on the line (a table roll, a dialogue…).
  const icon = createElement(Icon, {
    size: 18,
    "aria-label": kindLabel,
    className: ["mt-0.5 shrink-0", entry.kind === "note" ? "text-parchment-faint" : "text-gold"].join(" "),
  } as { size: number; className: string });

  if (editing) {
    return (
      <div className="flex items-start gap-2.5">
        {icon}
        <div className="relative min-w-0 flex-1">
          <textarea
            ref={inputRef}
            autoFocus
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              tags.onChange(e.target);
            }}
            {...tags.inputProps}
            onKeyDown={(e) => {
              if (tags.onKeyDown(e)) return;
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit();
              if (e.key === "Escape") actions.onStopEdit();
            }}
            rows={2}
            className="block w-full resize-none rounded-lg border border-ink-border bg-ink-800/70 px-2.5 py-1.5 text-base text-parchment focus:border-gold focus:outline-none"
          />
          <TagSuggestions state={tags.suggestions} placement="below" />
        </div>
        <button type="button" onClick={commit} className="-m-2 shrink-0 p-2 text-sm font-medium text-gold">
          {t.common.save}
        </button>
      </div>
    );
  }

  const selected = actions.selectedId === entry.id;
  return (
    <div
      id={`entry-${entry.id}`}
      data-entry
      onClick={() => actions.onSelect(selected ? null : entry.id)}
      className={[
        "group relative -mx-2 -my-1 flex scroll-mt-28 scroll-mb-32 lg:scroll-mt-40 items-start gap-2.5 rounded-lg px-2 py-1 transition-colors duration-700",
        selected ? "bg-ink-700/40" : "",
        actions.highlightedId === entry.id ? "bg-gold/15 ring-1 ring-gold/60" : "",
      ].join(" ")}
    >
      {icon}
      <div className="min-w-0 flex-1">
        <EntryContent entry={entry} answer={actions.answerFor(entry.linkedRollId)} onTagClick={actions.onTagClick} />
      </div>
      <LineButtons
        visible={selected}
        onEdit={() => {
          setValue(entry.text);
          actions.onStartEdit(entry.id);
        }}
        onDelete={() => actions.onDelete(entry.id)}
        {...orderProps(actions, entry.id, entry.kind === "scene")}
      />
    </div>
  );
}

function EntryContent({
  entry,
  answer,
  onTagClick,
}: {
  entry: JournalEntry;
  answer: Answer | undefined;
  onTagClick?: (key: string) => void;
}) {
  const { t } = useLocaleContext();
  if (entry.kind === "question") {
    return (
      <p className="whitespace-pre-wrap text-base italic text-parchment">
        <TaggedText text={entry.text} onTagClick={onTagClick} />
      </p>
    );
  }

  if (entry.kind === "scene") return <SceneContent text={entry.text} onTagClick={onTagClick} />;

  if (entry.kind === "action") {
    const { actor, text } = splitActor(entry.text);
    if (actor) {
      return (
        <p className="whitespace-pre-wrap text-base text-parchment">
          <span className="mr-1.5 rounded-md bg-ink-700/70 px-1.5 py-0.5 text-sm font-semibold text-gold">{actor}</span>
          <TaggedText text={text} onTagClick={onTagClick} />
        </p>
      );
    }
  }

  if (entry.kind === "note") {
    const form = noteForm(entry.text);
    if (form.form !== "plain") return <NoteContent form={form} onTagClick={onTagClick} />;
  }

  if (entry.kind === "roll" && entry.text.includes("\n")) {
    // A generator's axes or a table written out under its first line (§4.3).
    const [first, ...rest] = entry.text.split("\n");
    return (
      <div className="flex flex-col gap-1">
        <EntryContent entry={{ ...entry, text: first }} answer={answer} onTagClick={onTagClick} />
        <p className="whitespace-pre-wrap border-l border-ink-border pl-2.5 text-sm text-parchment/90">{rest.join("\n")}</p>
      </div>
    );
  }

  if (entry.kind === "roll") {
    // Several dice in one entry: each result with its die, not just the
    // last one highlighted and the rest mixed into the detail.
    const series = splitRollSeries(entry.text);
    if (series) {
      return (
        <div className="flex flex-col gap-1.5">
          {series.label && <p className="text-xs text-parchment-dim">{series.label}</p>}
          <ul className="flex flex-wrap gap-1.5">
            {series.rolls.map((roll, i) => (
              <li
                key={i}
                className="flex min-w-11 flex-col items-center rounded-lg border border-ink-border px-2 py-1"
              >
                <span className="text-[0.65rem] leading-tight text-parchment-dim">
                  {roll.label && `${roll.label} · `}
                  {showDraws(roll.die)}
                </span>
                <RollResult result={roll.result} />
              </li>
            ))}
          </ul>
        </div>
      );
    }
    const { detail, result, answer: parsedAnswer } = splitRollText(entry.text);
    const { symbol } = splitRollSymbol(entry.text);
    const knownAnswer = answer ?? parsedAnswer;
    // A table or a generator says so before its name ("Table · Forest Encounter d6=5").
    const kind = symbol === "tbl" || symbol === "gen" ? t.journal.rollSymbol[symbol] : null;
    if (result === null) {
      return (
        <p className="whitespace-pre-wrap text-base text-parchment/90">
          {kind && <span className="text-xs text-parchment-dim">{kind} · </span>}
          {showDraws(detail)}
        </p>
      );
    }
    return (
      <div className="flex flex-col gap-1">
        {(detail || kind) && <p className="text-xs text-parchment-dim">{[kind, showDraws(detail)].filter(Boolean).join(" · ")}</p>}
        {knownAnswer ? (
          <span
            className={`w-fit rounded-full border px-2.5 py-0.5 text-sm font-semibold uppercase tracking-wide ${ANSWER_CHIP[knownAnswer]}`}
          >
            {result}
          </span>
        ) : (
          <p className="whitespace-pre-wrap text-base font-medium text-parchment">{result}</p>
        )}
      </div>
    );
  }

  return (
    <p
      className={[
        "whitespace-pre-wrap text-base",
        entry.kind === "note" ? "text-parchment/90" : "text-parchment",
      ].join(" ")}
    >
      <TaggedText text={entry.text} onTagClick={onTagClick} />
    </p>
  );
}

/** "S4 · Tavern, night", with ⚔ Combat when the scene is a fight. */
function SceneContent({ text, onTagClick }: { text: string; onTagClick?: (key: string) => void }) {
  const { t } = useLocaleContext();
  const { id, context, combat } = parseScene(text);
  return (
    // One line: pinned, a longer scene would peek out from under the next.
    // A heading inside its session's (h2), to jump between scenes.
    <h3 className="flex min-w-0 items-baseline gap-x-2">
      <span className="shrink-0 rounded-md border border-gold/40 bg-gold/10 px-1.5 text-sm font-semibold tabular-nums text-gold">{id || text}</span>
      {context && (
        <span onMouseEnter={titleIfCut(context)} className="min-w-0 truncate font-display text-base italic text-parchment">
          <TaggedText text={context} onTagClick={onTagClick} />
        </span>
      )}
      {combat && (
        <span className="inline-flex shrink-0 items-center gap-1 self-center text-xs font-medium uppercase tracking-wide text-no">
          <IconCombat size={13} />
          {t.journal.sceneCombat}
        </span>
      )}
    </h3>
  );
}

/** A note that isn't plain prose: see noteForm. */
function NoteContent({ form, onTagClick }: { form: Exclude<NoteForm, { form: "plain" }>; onTagClick?: (key: string) => void }) {
  const { t } = useLocaleContext();
  switch (form.form) {
    case "excerpt":
      return (
        <blockquote className="whitespace-pre-wrap border-l-2 border-gold/50 pl-3 text-base italic text-parchment">
          {form.text}
        </blockquote>
      );
    case "dialogue":
      return (
        <p className="whitespace-pre-wrap text-base text-parchment">
          <span className="mr-1.5 font-semibold text-gold">{form.pc ? t.journal.dialoguePc : form.speaker}:</span>
          <TaggedText text={form.text} onTagClick={onTagClick} />
        </p>
      );
    case "meta":
      return (
        <p className="whitespace-pre-wrap text-sm italic text-parchment-dim">
          ({form.label && <span className="not-italic font-medium">{form.label}: </span>}
          <TaggedText text={form.text} onTagClick={onTagClick} />)
        </p>
      );
    case "block":
      return (
        <p className="text-xs font-semibold uppercase tracking-wide text-parchment-dim">
          {form.closing ? t.journal.blocks[form.name].close : t.journal.blocks[form.name].open}
        </p>
      );
    case "round":
      return (
        <p className="flex flex-wrap items-baseline gap-x-2 text-base text-parchment">
          <span className="rounded-md bg-no/15 px-1.5 text-sm font-semibold tabular-nums text-no">{form.round}</span>
          {form.text && <TaggedText text={form.text} onTagClick={onTagClick} />}
        </p>
      );
  }
}

/**
 * Text with its Lonelog character/place tags drawn as chips (the name,
 * and its traits smaller) instead of the raw "[N:Jonah|friendly]".
 * Tapping one opens that element in the adventure's notebook.
 */
export function TaggedText({ text, onTagClick }: { text: string; onTagClick?: (key: string) => void }) {
  const { t } = useLocaleContext();
  const parts = splitTags(text);
  if (parts.length === 1 && !parts[0].tag) return text;
  return parts.map((part, i) => {
    if (!part.tag) return part.text;
    const { kind, name, details, progress } = part.tag;
    const content = (
      <>
        <CastIcon kind={kind} size={13} className="shrink-0 self-center text-gold" />
        {/* What the icon says, for screen readers: "Sala 3", "PNJ Odile". */}
        <span className="sr-only">{t.notebook.kinds[kind]} </span>
        <span className="font-medium text-parchment">{name}</span>
        {progress && (
          <span className={`text-[0.85em] font-medium ${progressDone(kind, progress) ? "text-no" : "text-gold"}`}>
            {progressText(progress)}
            {progressDone(kind, progress) && ` · ${kind === "timer" ? t.notebook.timerDone : t.notebook.progressFull}`}
          </span>
        )}
        {details.length > 0 && <span className="text-[0.85em] text-parchment-dim">{details.join(" · ")}</span>}
      </>
    );
    const chipClass =
      "mx-0.5 inline-flex max-w-full flex-wrap items-baseline gap-x-1 rounded-md border border-gold/30 bg-gold/[0.08] px-1.5 align-baseline font-sans normal-case not-italic leading-snug";
    return onTagClick ? (
      <button
        key={i}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onTagClick(castKey(kind, name));
        }}
        title={interpolate(t.notebook.tagChipLabel, { name })}
        className={`${chipClass} text-left transition hover:border-gold/60 hover:bg-gold/15`}
      >
        {content}
      </button>
    ) : (
      <span key={i} className={chipClass}>
        {content}
      </span>
    );
  });
}

/** "+1 (+ 0 − +)" for 4dF: the total large and the faces small below. */
function RollResult({ result }: { result: string }) {
  const faces = result.match(/^(\S+)\s+\((.+)\)$/);
  return (
    <>
      <span className="text-base font-medium leading-tight text-parchment">{faces ? faces[1] : result}</span>
      {faces && <span className="text-[0.65rem] leading-tight text-parchment-dim">{faces[2]}</span>}
    </>
  );
}

interface LineButtonsProps {
  /** Selected with a tap (touch); with a mouse they also show on hover. */
  visible: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onInsertBelow?: () => void;
  /** A session or a scene: copy it, with all it holds, as Lonelog. */
  onCopy?: () => void;
}

/**
 * Pencil and trash, plus a "⋯" with the less frequent ones (copy a
 * session or scene, move up or down, write below), so the buttons
 * don't cover half the line.
 */
export function LineButtons({ visible, onEdit, onDelete, onMoveUp, onMoveDown, onInsertBelow, onCopy }: LineButtonsProps) {
  const { t } = useLocaleContext();
  const more: ActionMenuItem[] = [];
  if (onCopy) more.push({ label: t.journal.copyLonelog, Icon: IconCopy, onSelect: onCopy });
  if (onInsertBelow) more.push({ label: t.journal.insertBelow, Icon: IconInsertBelow, onSelect: onInsertBelow });
  if (onMoveUp) more.push({ label: t.journal.moveUp, Icon: IconArrowUp, onSelect: onMoveUp });
  if (onMoveDown) more.push({ label: t.journal.moveDown, Icon: IconArrowDown, onSelect: onMoveDown });
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={[
        // Above the entries that follow, or they'd cover the "⋯" menu.
        "absolute right-1 top-1/2 z-10 flex -translate-y-1/2 items-center rounded-lg border border-ink-border bg-ink-800 shadow-lg transition",
        visible
          ? "opacity-100"
          : "pointer-events-none opacity-0 pointer-fine:group-hover:pointer-events-auto pointer-fine:group-hover:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onEdit}
        aria-label={t.journal.editEntry}
        className="p-2 text-parchment-dim transition hover:text-gold"
      >
        <IconPencil size={15} />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={t.journal.deleteEntry}
        className="p-2 text-parchment-dim transition hover:text-no"
      >
        <IconTrash size={15} />
      </button>
      {more.length > 0 && <ActionMenu compact label={t.journal.moreEntryActions} items={more} />}
    </div>
  );
}

/**
 * Journal search results (inside an adventure, or across all of them
 * from the journal list): each entry with its icon, the matching words
 * highlighted and where it is (session, date and, if asked, adventure).
 */
export function SearchResultList({
  matches,
  query,
  onPick,
  adventureName,
}: {
  matches: EntryMatch[];
  query: string;
  onPick: (match: EntryMatch) => void;
  /** Across adventures: the name to show in each result. */
  adventureName?: (adventureId: string) => string | undefined;
}) {
  const { t } = useLocaleContext();
  return (
    <ul className="flex flex-col gap-1.5">
      {matches.map((match) => {
        const { entry } = match;
        const Icon = entry.kind === "session" ? IconSession : KIND_ICON[entry.kind];
        const where = [
          adventureName?.(entry.adventureId),
          entry.kind === "session" ? null : (match.sessionTitle ?? t.journal.prologueLabel),
          match.day && formatIsoDay(match.day, t.dateLocale),
        ].filter(Boolean);
        return (
          <li key={entry.id}>
            <button
              type="button"
              onClick={() => onPick(match)}
              className="flex w-full items-start gap-2.5 rounded-xl border border-ink-border/70 bg-ink-900/40 px-3.5 py-2.5 text-left transition hover:border-gold/50 hover:bg-ink-800/60"
            >
              <Icon size={16} className="mt-0.5 shrink-0 text-gold" />
              <span className="min-w-0 flex-1">
                <span className="line-clamp-3 whitespace-pre-wrap text-sm text-parchment">
                  {highlightParts(entry.text, query).map((part, i) =>
                    part.match ? (
                      <mark key={i} className="rounded-sm bg-gold/25 px-0.5 text-parchment">
                        {part.text}
                      </mark>
                    ) : (
                      part.text
                    ),
                  )}
                </span>
                <span className="mt-0.5 block truncate text-xs text-parchment-dim">{where.join(" · ")}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
