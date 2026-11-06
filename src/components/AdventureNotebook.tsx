import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { interpolate } from "../lib/i18n";
import type { JournalEntry } from "../lib/lonelog";
import {
  buildCast,
  formatProgressTag,
  formatTag,
  PROGRESS_KINDS,
  progressText,
  tagsToPlainText,
  threadStatus,
  type CastKind,
  type CastMember,
} from "../lib/lonelogTags";
import { groupBySession, INPUT_CLASS } from "../lib/journalUi";
import { loadFoldedNotebookSections, saveFoldedNotebookSections, type NotebookSection } from "../lib/notebookSections";
import { CastIcon } from "./CastIcon";
import {
  IconCast,
  IconCheckbox,
  IconCheckboxChecked,
  IconChevronRight,
  IconDice,
  IconMention,
  IconMinus,
  IconPencil,
  IconPinned,
  IconPlus,
  IconThread,
} from "./icons/Icons";

/**
 * An adventure's notebook: what's kept at hand beside the journal.
 *
 * - Pinned notes: free text edited in place (inventory, clues, to-dos),
 *   with "- [ ]" checkboxes you can tick. Saved on its own as you type.
 * - Characters and places, threads and clocks: derived from the
 *   journal's Lonelog tags ([N:…], [PC:…], [L:…], [Thread:…],
 *   [Clock:…], [Track:…], [Timer:…]), each with its current state and
 *   every entry that mentions it. Nothing is stored apart: adding one,
 *   logging a change, ticking a clock or closing a thread writes a tag
 *   entry in the journal.
 * - Rolling on a list (NPCs, places, open threads) picks one at random
 *   and logs it as a roll, for when the oracle asks "who?" or "which?".
 *
 * Wide desktop (xl): in the left column, under the session index.
 * Elsewhere: a sheet opened from the adventure header.
 */
export function AdventureNotebook({
  notes,
  onNotesChange,
  entries,
  focusKey,
  focusTick,
  onJump,
  onMention,
  onLog,
  onRoll,
}: {
  notes: string;
  onNotesChange: (notes: string) => void;
  /** The adventure's entries, in journal order. */
  entries: JournalEntry[];
  /** Element to open and scroll to (a chip was tapped in the journal). */
  focusKey: string | null;
  /** Changes on every tap, so tapping the same chip again scrolls again. */
  focusTick: number;
  onJump: (entryId: string) => void;
  /** Insert this text in the composer. */
  onMention: (text: string) => void;
  /** Log this text as a journal note. */
  onLog: (text: string) => void;
  /** Log this text as a roll (a list was rolled on). */
  onRoll: (text: string) => void;
}) {
  const { t } = useLocaleContext();
  const cast = useMemo(() => buildCast(entries), [entries]);
  // The session each entry is in, to say where every mention is.
  const sessionOf = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const group of groupBySession(entries)) {
      for (const entry of group.items) map.set(entry.id, group.sessionEntry?.text ?? null);
    }
    return map;
  }, [entries]);
  const [adding, setAdding] = useState<"cast" | "threads" | null>(null);
  const [folded, setFolded] = useState(loadFoldedNotebookSections);

  const lists: Record<NotebookSection, CastMember[]> = {
    characters: cast.filter((c) => c.kind === "pc" || c.kind === "npc"),
    places: cast.filter((c) => c.kind === "place"),
    // Open ones first: the closed are history.
    threads: [
      ...cast.filter((c) => c.kind === "thread" && threadStatus(c) === "open"),
      ...cast.filter((c) => c.kind === "thread" && threadStatus(c) !== "open"),
    ],
    progress: cast.filter((c) => PROGRESS_KINDS.has(c.kind)),
  };
  // What "roll on the list" picks from: NPCs (not the PC), places, open threads.
  const rollable: Record<NotebookSection, CastMember[]> = {
    characters: lists.characters.filter((c) => c.kind === "npc"),
    places: lists.places,
    threads: lists.threads.filter((c) => threadStatus(c) === "open"),
    progress: [],
  };
  const titles: Record<NotebookSection, string> = {
    characters: t.notebook.groupCharacters,
    places: t.notebook.groupPlaces,
    threads: t.notebook.groupThreads,
    progress: t.notebook.groupProgress,
  };

  // A chip tapped in the journal unfolds the list its element is in.
  const [seenTick, setSeenTick] = useState(focusTick);
  if (seenTick !== focusTick) {
    setSeenTick(focusTick);
    const section = (Object.keys(lists) as NotebookSection[]).find((id) => lists[id].some((c) => c.key === focusKey));
    if (section && folded.has(section)) {
      const next = new Set(folded);
      next.delete(section);
      setFolded(next);
    }
  }

  function toggleSection(id: NotebookSection) {
    const next = new Set(folded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFolded(next);
    saveFoldedNotebookSections(next);
  }

  function rollOn(id: NotebookSection) {
    const members = rollable[id];
    if (members.length === 0) return;
    const roll = Math.floor(Math.random() * members.length) + 1;
    onRoll(`${titles[id]} d${members.length} -> ${members[roll - 1].name}`);
  }

  function group(id: NotebookSection) {
    const members = lists[id];
    if (members.length === 0) return null;
    const isFolded = folded.has(id);
    return (
      <div key={id} className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <h3 className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => toggleSection(id)}
              aria-expanded={!isFolded}
              className="flex w-full items-center gap-1.5 rounded-md px-1 py-0.5 text-left text-[0.7rem] font-medium text-parchment-dim/70 transition hover:text-parchment"
            >
              <IconChevronRight size={12} className={`shrink-0 transition-transform ${isFolded ? "" : "rotate-90"}`} />
              <span className="flex-1">{titles[id]}</span>
              <span className="text-parchment-dim/50">{members.length}</span>
            </button>
          </h3>
          {rollable[id].length > 1 && (
            <button
              type="button"
              onClick={() => rollOn(id)}
              aria-label={interpolate(t.notebook.rollList, { list: titles[id] })}
              title={interpolate(t.notebook.rollList, { list: titles[id] })}
              className="shrink-0 rounded-md p-1 text-parchment-dim/70 transition hover:text-gold"
            >
              <IconDice size={14} />
            </button>
          )}
        </div>
        {!isFolded && (
          <ul className="flex flex-col gap-1">
            {members.map((member) => (
              <CastItem
                key={member.key}
                member={member}
                entries={entries}
                sessionOf={sessionOf}
                focused={member.key === focusKey}
                focusTick={focusTick}
                onJump={onJump}
                onMention={onMention}
                onLog={onLog}
              />
            ))}
          </ul>
        )}
      </div>
    );
  }

  function addButton(section: "cast" | "threads", label: string) {
    return adding === section ? (
      <AddCastForm
        kinds={section === "cast" ? ["npc", "pc", "place"] : ["thread", "clock", "track", "timer"]}
        onAdd={(text) => {
          onLog(text);
          setAdding(null);
        }}
        onCancel={() => setAdding(null)}
      />
    ) : (
      <button
        type="button"
        onClick={() => setAdding(section)}
        className="flex items-center gap-1.5 self-start rounded-lg px-1 py-1 text-xs font-medium text-gold transition hover:text-gold-soft"
      >
        <IconPlus size={14} />
        {label}
      </button>
    );
  }

  const hasCast = lists.characters.length + lists.places.length > 0;
  const hasThreads = lists.threads.length + lists.progress.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-parchment-dim">
          <IconPinned size={15} className="text-gold" />
          {t.notebook.notesTitle}
        </h2>
        <PinnedNotes notes={notes} onChange={onNotesChange} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-parchment-dim">
          <IconCast size={15} className="text-gold" />
          {t.notebook.castTitle}
        </h2>
        {!hasCast && <p className="text-xs text-parchment-dim/80">{t.notebook.castEmpty}</p>}
        {group("characters")}
        {group("places")}
        {addButton("cast", t.notebook.addButton)}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-parchment-dim">
          <IconThread size={15} className="text-gold" />
          {t.notebook.threadsTitle}
        </h2>
        {!hasThreads && <p className="text-xs text-parchment-dim/80">{t.notebook.threadsEmpty}</p>}
        {group("threads")}
        {group("progress")}
        {addButton("threads", t.notebook.addThreadButton)}
      </section>
    </div>
  );
}

const CHECKBOX_LINE = /^(\s*[-*] )\[( |x|X)\] (.*)$/;
const BULLET_LINE = /^\s*[-*] (.*)$/;

/**
 * The notes as text you read, ticking checkboxes in place; tapping
 * anywhere else (or the pencil) turns it into a field. While writing
 * it's saved after a short pause, and when leaving the field.
 */
function PinnedNotes({ notes, onChange }: { notes: string; onChange: (notes: string) => void }) {
  const { t } = useLocaleContext();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(notes);
  const pending = useRef<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  function flush() {
    window.clearTimeout(timer.current);
    if (pending.current !== null) onChangeRef.current(pending.current);
    pending.current = null;
  }
  // Whatever was still waiting is saved when the panel closes.
  useEffect(() => flush, []);

  function write(value: string) {
    setDraft(value);
    pending.current = value;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 500);
  }

  function startEditing() {
    setDraft(notes);
    setEditing(true);
  }

  function stopEditing() {
    flush();
    setEditing(false);
  }

  function toggle(index: number) {
    const lines = notes.split("\n");
    lines[index] = lines[index].replace(CHECKBOX_LINE, (_, lead: string, mark: string, rest: string) =>
      `${lead}[${mark === " " ? "x" : " "}] ${rest}`,
    );
    onChange(lines.join("\n"));
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-1.5">
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => write(e.target.value)}
          onBlur={stopEditing}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              stopEditing();
            }
          }}
          rows={Math.min(14, Math.max(5, draft.split("\n").length + 1))}
          placeholder={t.notebook.notesPlaceholder}
          aria-label={t.notebook.notesTitle}
          className={`${INPUT_CLASS} resize-y bg-ink-900/70 text-sm leading-relaxed`}
        />
        <button
          type="button"
          // Before the blur, which would otherwise swallow the click.
          onMouseDown={(e) => e.preventDefault()}
          onClick={stopEditing}
          className="self-end rounded-lg px-2 py-1 text-xs font-medium text-gold transition hover:text-gold-soft"
        >
          {t.notebook.notesDone}
        </button>
      </div>
    );
  }

  if (!notes.trim()) {
    return (
      <button
        type="button"
        onClick={startEditing}
        className="rounded-xl border border-dashed border-ink-border px-3.5 py-3 text-left text-xs text-parchment-dim/80 transition hover:border-gold/50 hover:text-parchment-dim"
      >
        {t.notebook.notesEmpty}
      </button>
    );
  }

  return (
    <div className="group relative rounded-xl border border-ink-border/70 bg-ink-900/40 py-2.5 pl-3.5 pr-9 text-sm text-parchment/90">
      <div onClick={startEditing} className="flex cursor-text flex-col gap-0.5">
        {notes.split("\n").map((line, i) => {
          const box = line.match(CHECKBOX_LINE);
          if (box) {
            const checked = box[2] !== " ";
            const Icon = checked ? IconCheckboxChecked : IconCheckbox;
            return (
              <button
                key={i}
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(i);
                }}
                className="-mx-1 flex items-start gap-2 rounded-md px-1 py-0.5 text-left transition hover:bg-ink-700/50"
              >
                <Icon size={16} className={`mt-0.5 shrink-0 ${checked ? "text-gold" : "text-parchment-dim"}`} />
                <span className={checked ? "text-parchment-dim line-through" : ""}>{box[3]}</span>
              </button>
            );
          }
          const bullet = line.match(BULLET_LINE);
          if (bullet) {
            return (
              <p key={i} className="relative pl-4 before:absolute before:left-1 before:text-gold before:content-['•']">
                {bullet[1]}
              </p>
            );
          }
          return line.trim() ? (
            <p key={i} className="whitespace-pre-wrap">
              {line}
            </p>
          ) : (
            <div key={i} className="h-2" />
          );
        })}
      </div>
      <button
        type="button"
        onClick={startEditing}
        aria-label={t.notebook.notesEdit}
        title={t.notebook.notesEdit}
        className="absolute right-1.5 top-1.5 rounded-lg p-1.5 text-parchment-dim transition hover:text-gold"
      >
        <IconPencil size={15} />
      </button>
    </div>
  );
}

function CastItem({
  member,
  entries,
  sessionOf,
  focused,
  focusTick,
  onJump,
  onMention,
  onLog,
}: {
  member: CastMember;
  entries: JournalEntry[];
  sessionOf: Map<string, string | null>;
  focused: boolean;
  focusTick: number;
  onJump: (entryId: string) => void;
  onMention: (text: string) => void;
  onLog: (text: string) => void;
}) {
  const { t } = useLocaleContext();
  // A chip tapped in the journal opens this element (already open if
  // the notebook opens because of it) and brings it into view.
  const [open, setOpen] = useState(focused);
  const [seenTick, setSeenTick] = useState(focusTick);
  if (seenTick !== focusTick) {
    setSeenTick(focusTick);
    if (focused) setOpen(true);
  }
  const [changing, setChanging] = useState(false);
  const [change, setChange] = useState("");
  const rootRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (focused) rootRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [focused, focusTick]);

  const byId = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);
  const dateFormat = new Intl.DateTimeFormat(t.dateLocale, { day: "numeric", month: "short", year: "numeric" });
  const kindLabel = t.notebook.kinds[member.kind];
  const count = member.mentions.length;
  const status = member.kind === "thread" ? threadStatus(member) : null;
  const progress = member.progress;
  const isProgress = PROGRESS_KINDS.has(member.kind);

  // −/+ on a clock writes its new value as a journal entry (the log is
  // a record: nothing is edited in place). Clocks and tracks stay
  // within their size, timers don't go below zero.
  function step(delta: number) {
    const value = (progress?.value ?? 0) + delta;
    if (value < 0 || (progress?.max !== undefined && value > progress.max)) return;
    onLog(formatProgressTag(member.kind, member.name, value, progress?.max));
  }

  function logChange(e: FormEvent) {
    e.preventDefault();
    const details = change.split(",").map((d) => d.trim()).filter(Boolean);
    if (details.length === 0) return;
    onLog(formatTag(member.kind, member.name, details));
    setChange("");
    setChanging(false);
  }

  return (
    <li
      ref={rootRef}
      // No extra mark for the focused one: it opens (border and
      // background) and scrolls into view, and closed ones all look alike.
      className={[
        "scroll-my-4 rounded-xl border transition",
        open ? "border-ink-border bg-ink-800/50" : "border-transparent",
      ].join(" ")}
    >
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2.5 py-1.5 text-left transition hover:bg-ink-700/50"
        >
          <CastIcon kind={member.kind} size={16} className={`shrink-0 ${status && status !== "open" ? "text-parchment-dim" : "text-gold"}`} />
          <span className="min-w-0 flex-1">
            <span
              className={[
                "block truncate text-sm font-medium",
                status && status !== "open" ? "text-parchment-dim line-through" : "text-parchment",
              ].join(" ")}
            >
              {member.name}
            </span>
            {isProgress ? (
              <ProgressBar kind={member.kind} progress={progress} />
            ) : (
              member.tags.length > 0 && (
                <span className="block truncate text-xs text-parchment-dim">{member.tags.join(" · ")}</span>
              )
            )}
          </span>
          {(member.kind === "pc" || isProgress) && (
            <span className="shrink-0 rounded border border-gold/40 px-1 text-[0.65rem] font-medium text-gold">
              {isProgress && progress ? progressText(progress) : kindLabel}
            </span>
          )}
          {!isProgress && (
            <IconChevronRight size={14} className={`shrink-0 text-parchment-dim transition-transform ${open ? "rotate-90" : ""}`} />
          )}
        </button>
        {isProgress && (
          <div className="flex shrink-0 items-center pr-1">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label={interpolate(t.notebook.decrease, { name: member.name })}
              title={interpolate(t.notebook.decrease, { name: member.name })}
              className="rounded-md p-1.5 text-parchment-dim transition hover:text-gold"
            >
              <IconMinus size={14} />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label={interpolate(t.notebook.increase, { name: member.name })}
              title={interpolate(t.notebook.increase, { name: member.name })}
              className="rounded-md p-1.5 text-parchment-dim transition hover:text-gold"
            >
              <IconPlus size={14} />
            </button>
          </div>
        )}
      </div>

      {open && (
        <div className="flex flex-col gap-2 px-2.5 pb-2.5 pt-1">
          {!isProgress && member.tags.length > 0 && (
            <ul className="flex flex-wrap gap-1">
              {member.tags.map((tag) => (
                <li key={tag} className="rounded-md border border-ink-border px-1.5 py-0.5 text-xs text-parchment">
                  {tag}
                </li>
              ))}
            </ul>
          )}

          <p className="text-[0.7rem] text-parchment-dim/70">
            {count === 1 ? t.notebook.mentionCountOne : interpolate(t.notebook.mentionCount, { count })}
          </p>
          <ul className="flex max-h-48 flex-col gap-0.5 overflow-y-auto overscroll-contain">
            {member.mentions.map((id) => {
              const entry = byId.get(id);
              if (!entry) return null;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => onJump(id)}
                    className="w-full rounded-md px-1.5 py-1 text-left text-xs text-parchment-dim transition hover:bg-ink-700/60 hover:text-parchment"
                  >
                    {/* Clamped inside: on the padded button a third line peeked out. */}
                    <span className="line-clamp-2">{tagsToPlainText(entry.text)}</span>
                    {/* Where it is, as in the journal search. */}
                    <span className="mt-0.5 block truncate text-[0.65rem] text-parchment-dim/60">
                      {sessionOf.get(id) ?? t.journal.prologueLabel} · {dateFormat.format(entry.timestamp)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {changing ? (
            <form onSubmit={logChange} className="flex flex-col gap-1.5">
              <div className="flex gap-1.5">
                <input
                  autoFocus
                  value={change}
                  onChange={(e) => setChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.stopPropagation();
                      setChanging(false);
                    }
                  }}
                  placeholder={t.notebook.changePlaceholder}
                  aria-label={t.notebook.changeButton}
                  className={`${INPUT_CLASS} bg-ink-900/70 py-1.5 text-sm`}
                />
                <button
                  type="submit"
                  disabled={!change.trim()}
                  className="shrink-0 rounded-lg bg-gold px-3 text-xs font-semibold text-ink-950 transition hover:bg-gold-soft disabled:bg-ink-700 disabled:text-parchment-dim/50"
                >
                  {t.notebook.logButton}
                </button>
              </div>
              <p className="text-[0.7rem] text-parchment-dim/70">{t.notebook.changeHint}</p>
            </form>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {status && (
                <button
                  type="button"
                  onClick={() =>
                    onLog(formatTag("thread", member.name, [t.notebook.statuses[status === "open" ? "closed" : "open"]]))
                  }
                  className="flex items-center gap-1 rounded-lg border border-ink-border px-2 py-1 text-xs text-parchment-dim transition hover:border-gold/50 hover:text-gold"
                >
                  {status === "open" ? t.notebook.closeThread : t.notebook.reopenThread}
                </button>
              )}
              <button
                type="button"
                onClick={() => onMention(formatTag(member.kind, member.name, [], true))}
                title={t.notebook.mentionHint}
                className="flex items-center gap-1 rounded-lg border border-ink-border px-2 py-1 text-xs text-parchment-dim transition hover:border-gold/50 hover:text-gold"
              >
                <IconMention size={13} />
                {t.notebook.mentionButton}
              </button>
              <button
                type="button"
                onClick={() => setChanging(true)}
                className="flex items-center gap-1 rounded-lg border border-ink-border px-2 py-1 text-xs text-parchment-dim transition hover:border-gold/50 hover:text-gold"
              >
                <IconPencil size={13} />
                {t.notebook.changeButton}
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * Draws where a clock, track or timer stands: a segmented bar when it
 * has a size, nothing more for a timer (its number is beside it).
 */
function ProgressBar({ kind, progress }: { kind: CastKind; progress: CastMember["progress"] }) {
  if (!progress?.max) return null;
  const segments = Math.min(progress.max, 12);
  const filled = Math.round((Math.min(progress.value, progress.max) / progress.max) * segments);
  return (
    <span aria-hidden className="mt-1 flex gap-0.5">
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          className={[
            "h-1.5 flex-1 rounded-full",
            i < filled ? (kind === "clock" ? "bg-no/80" : "bg-gold") : "bg-ink-700",
          ].join(" ")}
        />
      ))}
    </span>
  );
}

/**
 * A new element, logged as its tag: "[N:Odile|innkeeper]",
 * "[Thread:The box|Open]", "[Clock:Alarm 0/6]", "[Timer:Dawn 6]".
 */
function AddCastForm({
  kinds,
  onAdd,
  onCancel,
}: {
  kinds: CastKind[];
  onAdd: (text: string) => void;
  onCancel: () => void;
}) {
  const { t } = useLocaleContext();
  const [kind, setKind] = useState<CastKind>(kinds[0]);
  const [name, setName] = useState("");
  const [details, setDetails] = useState("");
  const [size, setSize] = useState(6);
  const hint = kind === "clock" || kind === "track" || kind === "timer" ? t.notebook.kindHints[kind] : t.notebook.addHint;

  function tag(): string {
    if (kind === "thread") return formatTag("thread", name, [t.notebook.statuses.open]);
    if (kind === "clock" || kind === "track") return formatProgressTag(kind, name, 0, size);
    if (kind === "timer") return formatProgressTag(kind, name, size);
    return formatTag(kind, name, details.split(","));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onAdd(tag());
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onCancel();
        }
      }}
      className="flex flex-col gap-2 rounded-xl border border-ink-border bg-ink-800/50 p-2.5"
    >
      <div role="radiogroup" aria-label={t.notebook.addKindLabel} className="grid grid-cols-2 gap-1 rounded-lg bg-ink-900/60 p-1">
        {kinds.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={kind === id}
            onClick={() => setKind(id)}
            className={[
              "flex min-w-0 items-center justify-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium transition",
              // With three, the last one takes the whole row.
              kinds.length % 2 === 1 && id === kinds.at(-1) ? "col-span-2" : "",
              kind === id ? "bg-gold text-ink-950" : "text-parchment-dim hover:text-parchment",
            ].join(" ")}
          >
            <CastIcon kind={id} size={13} className="shrink-0" />
            <span className="truncate">{t.notebook.kinds[id]}</span>
          </button>
        ))}
      </div>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t.notebook.addNameLabel}
        aria-label={t.notebook.addNameLabel}
        className={`${INPUT_CLASS} bg-ink-900/70 py-1.5 text-sm`}
      />
      {(kind === "pc" || kind === "npc" || kind === "place") && (
        <input
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder={t.notebook.addDetailsLabel}
          aria-label={t.notebook.addDetailsLabel}
          className={`${INPUT_CLASS} bg-ink-900/70 py-1.5 text-sm`}
        />
      )}
      {(kind === "clock" || kind === "track" || kind === "timer") && (
        <label className="flex items-center gap-2 text-xs text-parchment-dim">
          <span className="flex-1">{kind === "timer" ? t.notebook.timerStartLabel : t.notebook.segmentsLabel}</span>
          <input
            type="number"
            min={1}
            max={99}
            value={size}
            onChange={(e) => setSize(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
            className={`${INPUT_CLASS} w-20 flex-none bg-ink-900/70 py-1.5 text-sm`}
          />
        </label>
      )}
      <p className="text-[0.7rem] text-parchment-dim/70">{hint}</p>
      <div className="flex justify-end gap-1.5">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-2.5 py-1.5 text-xs text-parchment-dim transition hover:text-parchment"
        >
          {t.common.cancel}
        </button>
        <button
          type="submit"
          disabled={!name.trim()}
          className="rounded-lg bg-gold px-3 py-1.5 text-xs font-semibold text-ink-950 transition hover:bg-gold-soft disabled:bg-ink-700 disabled:text-parchment-dim/50"
        >
          {t.notebook.logButton}
        </button>
      </div>
    </form>
  );
}
