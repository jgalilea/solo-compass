import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { interpolate } from "../lib/i18n";
import type { JournalEntry } from "../lib/lonelog";
import {
  foeIsOut,
  formatProgressTag,
  formatTag,
  PROGRESS_KINDS,
  QUANTITY_KINDS,
  progressDone,
  progressText,
  tagsToPlainText,
  threadStatus,
  type CastKind,
  type CastMember,
} from "../lib/lonelogTags";
import { INPUT_CLASS, formatIsoDay } from "../lib/journalUi";
import { titleIfCut } from "../lib/truncation";
import { CastIcon } from "./CastIcon";
import {
  IconChevronRight,
  IconFilter,
  IconRename,
  IconMention,
  IconMinus,
  IconPencil,
  IconPlus,
} from "./icons/Icons";

export function CastItem({
  member,
  entries,
  sessionOf,
  focused,
  focusTick,
  onJump,
  onMention,
  onFilter,
  onRename,
  onLog,
  description,
  onDescriptionChange,
}: {
  member: CastMember;
  entries: JournalEntry[];
  sessionOf: Map<string, { title: string | null; day: string | null }>;
  focused: boolean;
  focusTick: number;
  onJump: (entryId: string) => void;
  onMention: (text: string) => void;
  /** Show only this element's entries in the journal. */
  onFilter: () => void;
  /** Rename it in every entry of the journal. */
  onRename: (name: string) => void;
  /** `step`: a −/+, which may join the one just before (see combineSteps). */
  onLog: (text: string, step?: boolean) => void;
  description: string;
  onDescriptionChange: (text: string) => void;
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
  const [renaming, setRenaming] = useState<string | null>(null);
  const [change, setChange] = useState("");
  const rootRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (focused) rootRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [focused, focusTick]);

  const byId = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);
  const dayOf = (id: string) => {
    const day = sessionOf.get(id)?.day;
    return day ? formatIsoDay(day, t.dateLocale) : null;
  };
  const kindLabel = t.notebook.kinds[member.kind];
  const count = member.mentions.length;
  const status = member.kind === "thread" ? threadStatus(member) : null;
  const progress = member.progress;
  const isProgress = PROGRESS_KINDS.has(member.kind);
  const isQuantity = QUANTITY_KINDS.has(member.kind);
  // A full clock or a timer at zero: its number says so, quietly.
  const complete = isProgress && progressDone(member.kind, progress);
  // A closed thread or a foe out of the fight: dimmed and struck through.
  const done = (status && status !== "open") || (member.kind === "foe" && foeIsOut(member));

  // −/+ on a clock writes its new value as a journal entry (the log is
  // a record: nothing is edited in place). Clocks and tracks stay
  // within their size, timers don't go below zero.
  function step(delta: number) {
    const value = (progress?.value ?? 0) + delta;
    if (value < 0 || (progress?.max !== undefined && value > progress.max)) return;
    // An item or money logs the change ("[Inv:Torch-1]"), as the
    // resource add-on writes it; a clock, where it stands now.
    if (isQuantity) onLog(formatTag(member.kind, `${member.name}${delta > 0 ? "+" : "-"}${Math.abs(delta)}`), true);
    else onLog(formatProgressTag(member.kind, member.name, value, progress?.max), true);
  }

  function logChange(e: FormEvent) {
    e.preventDefault();
    // An amount for an item or money: "+15", "-8", or "45" (what there is now).
    const amount = change.trim().match(/^([+-]?)\s*(\d+)$/);
    if (isQuantity && amount) {
      if (amount[1]) onLog(formatTag(member.kind, `${member.name}${amount[1]}${amount[2]}`));
      else if (member.kind === "wealth") onLog(formatProgressTag("wealth", member.name, Number(amount[2])));
      else onLog(formatTag("item", member.name, [amount[2]]));
    } else {
      const details = change.split(",").map((d) => d.trim()).filter(Boolean);
      if (details.length === 0) return;
      onLog(formatTag(member.kind, member.name, details));
    }
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
          <CastIcon kind={member.kind} size={16} className={`shrink-0 ${done ? "text-parchment-dim" : "text-gold"}`} />
          <span className="min-w-0 flex-1">
            <span
              onMouseEnter={titleIfCut(member.name)}
              className={[
                "block truncate text-sm font-medium",
                done ? "text-parchment-dim line-through" : "text-parchment",
              ].join(" ")}
            >
              {member.name}
            </span>
            {isProgress ? (
              <ProgressBar kind={member.kind} progress={progress} />
            ) : (
              member.tags.length > 0 && (
                <span onMouseEnter={titleIfCut(member.tags.join(" · "))} className="block truncate text-xs text-parchment-dim">
                  {member.tags.join(" · ")}
                </span>
              )
            )}
          </span>
          {(member.kind === "pc" || isProgress || (isQuantity && progress)) && (
            <span
              className={[
                "shrink-0 rounded border px-1 text-[0.65rem] font-medium tabular-nums",
                complete ? "border-no/50 bg-no/10 text-no" : "border-gold/40 text-gold",
              ].join(" ")}
            >
              {(isProgress || isQuantity) && progress ? progressText(progress) : kindLabel}
              {complete && ` · ${member.kind === "timer" ? t.notebook.timerDone : t.notebook.progressFull}`}
            </span>
          )}
          {!isProgress && !isQuantity && (
            <IconChevronRight size={14} className={`shrink-0 text-parchment-dim transition-transform ${open ? "rotate-90" : ""}`} />
          )}
        </button>
        {(isProgress || isQuantity) && (
          <div className="flex shrink-0 items-center pr-1">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label={interpolate(isQuantity ? t.notebook.useOne : t.notebook.decrease, { name: member.name })}
              title={interpolate(isQuantity ? t.notebook.useOne : t.notebook.decrease, { name: member.name })}
              className="rounded-md p-1.5 text-parchment-dim transition hover:text-gold"
            >
              <IconMinus size={14} />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label={interpolate(isQuantity ? t.notebook.addOne : t.notebook.increase, { name: member.name })}
              title={interpolate(isQuantity ? t.notebook.addOne : t.notebook.increase, { name: member.name })}
              className="rounded-md p-1.5 text-parchment-dim transition hover:text-gold"
            >
              <IconPlus size={14} />
            </button>
          </div>
        )}
      </div>

      {open && (
        <div className="flex flex-col gap-2 px-2.5 pb-2.5 pt-1">
          <DescriptionField name={member.name} text={description} onChange={onDescriptionChange} />
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
                    <span onMouseEnter={titleIfCut(tagsToPlainText(entry.text))} className="line-clamp-2">
                      {tagsToPlainText(entry.text)}
                    </span>
                    {/* Where it is, as in the journal search. */}
                    <span className="mt-0.5 block truncate text-[0.65rem] text-parchment-dim/60">
                      {[sessionOf.get(id)?.title ?? t.journal.prologueLabel, dayOf(id)].filter(Boolean).join(" · ")}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {renaming !== null ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (renaming.trim() && renaming.trim() !== member.name) onRename(renaming);
                setRenaming(null);
              }}
              className="flex flex-col gap-1.5"
            >
              <div className="flex gap-1.5">
                <input
                  autoFocus
                  value={renaming}
                  onChange={(e) => setRenaming(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.stopPropagation();
                      setRenaming(null);
                    }
                  }}
                  aria-label={t.notebook.renameLabel}
                  className={`${INPUT_CLASS} bg-ink-900/70 py-1.5 text-base`}
                />
                <button
                  type="submit"
                  disabled={!renaming.trim()}
                  className="shrink-0 rounded-lg bg-gold px-3 text-xs font-semibold text-ink-950 transition hover:bg-gold-soft disabled:bg-ink-700 disabled:text-parchment-dim/50"
                >
                  {t.notebook.renameButton}
                </button>
              </div>
              <p className="text-[0.7rem] text-parchment-dim/70">{t.notebook.renameHint}</p>
            </form>
          ) : changing ? (
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
                  placeholder={isQuantity ? t.notebook.quantityChangePlaceholder : t.notebook.changePlaceholder}
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
              <p className="text-[0.7rem] text-parchment-dim/70">
                {isQuantity ? t.notebook.quantityChangeHint : t.notebook.changeHint}
              </p>
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
                onClick={onFilter}
                title={t.notebook.filterHint}
                className="flex items-center gap-1 rounded-lg border border-ink-border px-2 py-1 text-xs text-parchment-dim transition hover:border-gold/50 hover:text-gold"
              >
                <IconFilter size={13} />
                {t.notebook.filterButton}
              </button>
              <button
                type="button"
                onClick={() => setRenaming(member.name)}
                className="flex items-center gap-1 rounded-lg border border-ink-border px-2 py-1 text-xs text-parchment-dim transition hover:border-gold/50 hover:text-gold"
              >
                <IconRename size={13} />
                {t.notebook.renameButton}
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
 * An element's description: read as text, tapped to edit, saved after
 * a short pause and when leaving the field (like the pinned notes).
 */
function DescriptionField({ name, text, onChange }: { name: string; text: string; onChange: (text: string) => void }) {
  const { t } = useLocaleContext();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
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
  useEffect(() => flush, []);

  function write(value: string) {
    setDraft(value);
    pending.current = value;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 500);
  }

  function stopEditing() {
    flush();
    setEditing(false);
  }

  const label = interpolate(t.notebook.descriptionLabel, { name });
  if (editing) {
    return (
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
        rows={Math.min(8, Math.max(3, draft.split("\n").length + 1))}
        placeholder={t.notebook.descriptionPlaceholder}
        aria-label={label}
        className={`${INPUT_CLASS} resize-y bg-ink-900/70 py-1.5 text-sm leading-relaxed`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(text);
        setEditing(true);
      }}
      aria-label={text.trim() ? label : undefined}
      className={
        text.trim()
          ? "-mx-1.5 whitespace-pre-wrap rounded-md px-1.5 py-1 text-left text-sm text-parchment/90 transition hover:bg-ink-700/50"
          : "flex items-center gap-1 self-start rounded-md py-0.5 text-xs text-parchment-dim/80 transition hover:text-gold"
      }
    >
      {text.trim() ? (
        text
      ) : (
        <>
          <IconPlus size={12} />
          {t.notebook.descriptionAdd}
        </>
      )}
    </button>
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
