import type { JournalEntry } from "../lib/lonelog";
import { type EntryGroup, SYMBOL } from "../lib/journalUi";
import { IconChevronRight, IconTrash } from "./icons/Icons";

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
  deleteLabel,
  toggleLabel,
}: {
  group: EntryGroup;
  expanded: boolean;
  onToggle: () => void;
  onDeleteEntry: (id: string) => void;
  deleteLabel: string;
  toggleLabel: string;
}) {
  const session = group.sessionEntry;
  if (!session) return null;

  return (
    <li className="flex flex-col gap-2">
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
          onClick={() => onDeleteEntry(session.id)}
          aria-label={deleteLabel}
          className="-m-2 shrink-0 p-2 text-parchment-dim/40 transition hover:text-no"
        >
          <IconTrash size={16} />
        </button>
      </div>
      {expanded && (
        <ul className="flex flex-col gap-2 pl-1">
          {group.items.map((entry) => (
            <EntryRow key={entry.id} entry={entry} onDelete={onDeleteEntry} deleteLabel={deleteLabel} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function EntryRow({
  entry,
  onDelete,
  deleteLabel,
}: {
  entry: JournalEntry;
  onDelete: (id: string) => void;
  deleteLabel: string;
}) {
  const symbol = SYMBOL[entry.kind];

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
        onClick={() => onDelete(entry.id)}
        aria-label={deleteLabel}
        className="-m-2 shrink-0 p-2 text-parchment-dim/40 transition hover:text-no"
      >
        <IconTrash size={16} />
      </button>
    </li>
  );
}
