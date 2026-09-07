import { useState } from "react";
import type { JournalEntry } from "../lib/lonelog";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS, type EntryGroup, SYMBOL } from "../lib/journalUi";
import { IconChevronRight, IconPencil, IconTrash } from "./icons/Icons";

/**
 * Filas compartidas entre JournalListView y CampaignDetailView (esta
 * última es quien realmente las usa; conviven aquí porque son
 * componentes, no utilidades — ver src/lib/journalUi.ts para esas).
 */

export function SessionGroupRow({
  group,
  expanded,
  onToggle,
  onDeleteEntry,
  onEditEntry,
  deleteLabel,
  editLabel,
  saveLabel,
  toggleLabel,
}: {
  group: EntryGroup;
  expanded: boolean;
  onToggle: () => void;
  onDeleteEntry: (id: string) => void;
  onEditEntry: (id: string, text: string) => void;
  deleteLabel: string;
  editLabel: string;
  saveLabel: string;
  toggleLabel: string;
}) {
  const session = group.sessionEntry;
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(session?.text ?? "");
  if (!session) return null;

  function commit() {
    if (value.trim()) onEditEntry(session!.id, value.trim());
    setEditing(false);
  }

  return (
    <li className="flex flex-col gap-2">
      {editing ? (
        <div className="flex items-center gap-2 rounded-xl border border-ink-border/70 bg-ink-900/40 px-4 py-2.5">
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setEditing(false);
            }}
            className={`${INPUT_CLASS} bg-ink-800/70`}
          />
          <button type="button" onClick={commit} className={PRIMARY_BUTTON_CLASS}>
            {saveLabel}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1 rounded-xl border border-ink-border/70 bg-ink-900/40 px-4 py-3">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={toggleLabel}
            className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left"
          >
            <IconChevronRight
              size={16}
              className={`shrink-0 text-parchment-dim transition-transform ${expanded ? "rotate-90" : ""}`}
            />
            <span className="min-w-0 flex-1 truncate text-sm font-medium uppercase tracking-wide text-parchment-dim">
              {session.text}
            </span>
            <span className="shrink-0 text-xs text-parchment-dim/50">{group.items.length}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setValue(session.text);
              setEditing(true);
            }}
            aria-label={editLabel}
            className="-m-2 shrink-0 p-2 text-parchment-dim/40 transition hover:text-gold"
          >
            <IconPencil size={15} />
          </button>
          <button
            type="button"
            onClick={() => onDeleteEntry(session.id)}
            aria-label={deleteLabel}
            className="-m-2 shrink-0 p-2 text-parchment-dim/40 transition hover:text-no"
          >
            <IconTrash size={16} />
          </button>
        </div>
      )}
      {expanded && (
        <ul className="flex flex-col gap-2 pl-1">
          {group.items.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              onDelete={onDeleteEntry}
              onEdit={onEditEntry}
              deleteLabel={deleteLabel}
              editLabel={editLabel}
              saveLabel={saveLabel}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function EntryRow({
  entry,
  onDelete,
  onEdit,
  deleteLabel,
  editLabel,
  saveLabel,
}: {
  entry: JournalEntry;
  onDelete: (id: string) => void;
  onEdit: (id: string, text: string) => void;
  deleteLabel: string;
  editLabel: string;
  saveLabel: string;
}) {
  const symbol = SYMBOL[entry.kind];
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(entry.text);

  function commit() {
    if (value.trim()) onEdit(entry.id, value.trim());
    setEditing(false);
  }

  if (editing) {
    return (
      <li className="flex items-start gap-2.5 rounded-xl border border-ink-border/70 bg-ink-900/40 px-4 py-3">
        {symbol && (
          <span className="shrink-0 pt-2.5 font-display text-sm text-gold">{symbol}</span>
        )}
        <textarea
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit();
            if (e.key === "Escape") setEditing(false);
          }}
          rows={2}
          className="min-w-0 flex-1 resize-none rounded-lg border border-ink-border bg-ink-800/70 px-2.5 py-1.5 text-base text-parchment focus:border-gold focus:outline-none"
        />
        <button
          type="button"
          onClick={commit}
          className="-m-2 shrink-0 p-2 text-sm font-medium text-gold"
        >
          {saveLabel}
        </button>
      </li>
    );
  }

  return (
    <li className="flex items-start gap-2.5 rounded-xl border border-ink-border/70 bg-ink-900/40 px-4 py-3">
      {symbol && (
        <span className="shrink-0 pt-0.5 font-display text-sm text-gold">{symbol}</span>
      )}
      <p className="min-w-0 flex-1 whitespace-pre-wrap text-base text-parchment/90">
        {entry.text}
      </p>
      <button
        type="button"
        onClick={() => {
          setValue(entry.text);
          setEditing(true);
        }}
        aria-label={editLabel}
        className="-m-2 shrink-0 p-2 text-parchment-dim/40 transition hover:text-gold"
      >
        <IconPencil size={15} />
      </button>
      <button
        type="button"
        onClick={() => onDelete(entry.id)}
        aria-label={deleteLabel}
        className="-m-2 shrink-0 p-2 text-parchment-dim/40 transition hover:text-no"
      >
        <IconTrash size={16} />
      </button>
    </li>
  );
}
