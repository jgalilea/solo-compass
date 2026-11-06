import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { interpolate } from "../lib/i18n";
import type { JournalEntry } from "../lib/lonelog";
import { buildCast, formatTag, tagsToPlainText, type CastKind, type CastMember } from "../lib/lonelogTags";
import { INPUT_CLASS } from "../lib/journalUi";
import { CastIcon } from "./CastIcon";
import {
  IconCast,
  IconCheckbox,
  IconCheckboxChecked,
  IconChevronRight,
  IconMention,
  IconPencil,
  IconPinned,
  IconPlus,
} from "./icons/Icons";

/**
 * An adventure's notebook: what's kept at hand beside the journal.
 *
 * - Pinned notes: free text edited in place (inventory, clues, to-dos),
 *   with "- [ ]" checkboxes you can tick. Saved on its own as you type.
 * - Characters and places: derived from the journal's Lonelog tags
 *   ([N:…], [PC:…], [L:…]), each with its current traits and every
 *   entry that mentions it. Nothing is stored apart: adding one or
 *   logging a change writes a tag entry in the journal.
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
}) {
  const { t } = useLocaleContext();
  const cast = useMemo(() => buildCast(entries), [entries]);
  const characters = cast.filter((c) => c.kind !== "place");
  const places = cast.filter((c) => c.kind === "place");
  const [adding, setAdding] = useState(false);

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
        {cast.length === 0 && <p className="text-xs text-parchment-dim/80">{t.notebook.castEmpty}</p>}
        {[
          { title: t.notebook.groupCharacters, members: characters },
          { title: t.notebook.groupPlaces, members: places },
        ].map(
          ({ title, members }) =>
            members.length > 0 && (
              <div key={title} className="flex flex-col gap-1">
                <h3 className="px-1 text-[0.7rem] font-medium text-parchment-dim/70">{title}</h3>
                <ul className="flex flex-col gap-1">
                  {members.map((member) => (
                    <CastItem
                      key={member.key}
                      member={member}
                      entries={entries}
                      focused={member.key === focusKey}
                      focusTick={focusTick}
                      onJump={onJump}
                      onMention={onMention}
                      onLog={onLog}
                    />
                  ))}
                </ul>
              </div>
            ),
        )}
        {adding ? (
          <AddCastForm
            onAdd={(text) => {
              onLog(text);
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 self-start rounded-lg px-1 py-1 text-xs font-medium text-gold transition hover:text-gold-soft"
          >
            <IconPlus size={14} />
            {t.notebook.addButton}
          </button>
        )}
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
  focused,
  focusTick,
  onJump,
  onMention,
  onLog,
}: {
  member: CastMember;
  entries: JournalEntry[];
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
  const kindLabel = { pc: t.notebook.kindPc, npc: t.notebook.kindNpc, place: t.notebook.kindPlace }[member.kind];
  const count = member.mentions.length;

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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left transition hover:bg-ink-700/50"
      >
        <CastIcon kind={member.kind} size={16} className="shrink-0 text-gold" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-parchment">{member.name}</span>
          {member.tags.length > 0 && (
            <span className="block truncate text-xs text-parchment-dim">{member.tags.join(" · ")}</span>
          )}
        </span>
        {member.kind === "pc" && (
          <span className="shrink-0 rounded border border-gold/40 px-1 text-[0.65rem] font-medium text-gold">{kindLabel}</span>
        )}
        <IconChevronRight size={14} className={`shrink-0 text-parchment-dim transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="flex flex-col gap-2 px-2.5 pb-2.5 pt-1">
          {member.tags.length > 0 && (
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

/** A new character or place, logged as its tag: "[N:Odile|innkeeper]". */
function AddCastForm({ onAdd, onCancel }: { onAdd: (text: string) => void; onCancel: () => void }) {
  const { t } = useLocaleContext();
  const [kind, setKind] = useState<CastKind>("npc");
  const [name, setName] = useState("");
  const [details, setDetails] = useState("");
  const kinds: { id: CastKind; label: string }[] = [
    { id: "npc", label: t.notebook.kindNpc },
    { id: "pc", label: t.notebook.kindPc },
    { id: "place", label: t.notebook.kindPlace },
  ];

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onAdd(formatTag(kind, name, details.split(",")));
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onCancel();
        }
      }}
      className="flex flex-col gap-2 rounded-xl border border-ink-border bg-ink-800/50 p-2.5"
    >
      <div role="radiogroup" aria-label={t.notebook.addKindLabel} className="flex gap-1 rounded-lg bg-ink-900/60 p-1">
        {kinds.map((k) => (
          <button
            key={k.id}
            type="button"
            role="radio"
            aria-checked={kind === k.id}
            onClick={() => setKind(k.id)}
            className={[
              "flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition",
              kind === k.id ? "bg-gold text-ink-950" : "text-parchment-dim hover:text-parchment",
            ].join(" ")}
          >
            <CastIcon kind={k.id} size={13} className="shrink-0" />
            {k.label}
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
      <input
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        placeholder={t.notebook.addDetailsLabel}
        aria-label={t.notebook.addDetailsLabel}
        className={`${INPUT_CLASS} bg-ink-900/70 py-1.5 text-sm`}
      />
      <p className="text-[0.7rem] text-parchment-dim/70">{t.notebook.addHint}</p>
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
