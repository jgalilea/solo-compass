import { useEffect, useRef, useState } from "react";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { INPUT_CLASS } from "../lib/journalUi";
import { IconCheckbox, IconCheckboxChecked, IconPencil } from "./icons/Icons";

const CHECKBOX_LINE = /^(\s*[-*] )\[( |x|X)\] (.*)$/;
const BULLET_LINE = /^\s*[-*] (.*)$/;

/**
 * The notes as text you read, ticking checkboxes in place; tapping
 * anywhere else (or the pencil) turns it into a field. While writing
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
