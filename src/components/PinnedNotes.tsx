import { useEffect, useRef, useState } from "react";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { INPUT_CLASS } from "../lib/journalUi";
import { toggleNoteCheckbox } from "../lib/noteMarkdown";
import { IconPencil } from "./icons/Icons";
import { NoteText } from "./NoteText";

/**
 * The notes as text you read (their Markdown drawn, NoteText), ticking
 * checkboxes in place; tapping anywhere else (or the pencil) turns it
 * into a field. While writing
 * it's saved after a short pause, and when leaving the field.
 */
export function PinnedNotes({ notes, onChange }: { notes: string; onChange: (notes: string) => void }) {
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
        className="rounded-xl border border-dashed border-ink-border px-3.5 py-3 text-left text-xs text-parchment-dim transition hover:border-gold/50 hover:text-parchment-dim"
      >
        {t.notebook.notesEmpty}
      </button>
    );
  }

  return (
    <div className="group relative rounded-xl border border-ink-border/70 bg-ink-900/40 py-2.5 pl-3.5 pr-9 text-sm text-parchment/90">
      <div onClick={startEditing} className="flex cursor-text flex-col gap-0.5">
        <NoteText text={notes} onToggle={(line) => onChange(toggleNoteCheckbox(notes, line))} />
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
