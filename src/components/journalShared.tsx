import { useState, type ComponentType } from "react";
import type { JournalEntry, JournalLineKind } from "../lib/lonelog";
import type { Answer } from "../lib/oracle";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS, type EntryGroup, buildEntryBlocks, splitRollText } from "../lib/journalUi";
import { useLocaleContext } from "../hooks/useLocaleContext";
import {
  IconAction,
  IconChevronRight,
  IconConsequence,
  IconDice,
  IconNote,
  IconPencil,
  IconQuestion,
  IconTrash,
} from "./icons/Icons";

/**
 * Filas compartidas entre JournalListView y AdventureDetailView (esta
 * última es quien realmente las usa; conviven aquí porque son
 * componentes, no utilidades — ver src/lib/journalUi.ts para esas).
 *
 * Qué entrada está en edición vive en el padre (un solo id para toda
 * la pantalla, vía editingId/onStartEdit/onStopEdit) en vez de en
 * cada fila: así abrir una cierra cualquier otra que estuviera
 * abierta, en vez de permitir varios formularios a la vez.
 *
 * Lonelog es el formato de exportación, no la vista: aquí cada tipo
 * se pinta con su icono (el símbolo solo aparece al exportar), y una
 * pregunta + su tirada + sus consecuencias se agrupan en un bloque.
 */

export interface EntryActions {
  onDelete: (id: string) => void;
  onEdit: (id: string, text: string) => void;
  editingId: string | null;
  onStartEdit: (id: string) => void;
  onStopEdit: () => void;
  /** Respuesta del oráculo de una tirada enlazada, si se conoce (vía historial). */
  answerFor: (rollId: string | undefined) => Answer | undefined;
}

const KIND_ICON: Record<Exclude<JournalLineKind, "session">, ComponentType<{ size?: number; className?: string }>> = {
  action: IconAction,
  question: IconQuestion,
  roll: IconDice,
  consequence: IconConsequence,
  note: IconNote,
};

const ANSWER_CHIP: Record<Answer, string> = {
  si: "border-yes/40 bg-yes/10 text-yes",
  no: "border-no/40 bg-no/10 text-no",
  contradiccion: "border-contradiction/40 bg-contradiction/10 text-contradiction",
};

/** Lista de entradas de una sesión, agrupando pregunta → tirada → consecuencias. */
export function EntryList({ items, actions }: { items: JournalEntry[]; actions: EntryActions }) {
  return (
    <>
      {buildEntryBlocks(items).map((block) =>
        block.length === 1 && block[0].kind !== "roll" && block[0].kind !== "question" ? (
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

export function SessionGroupRow({
  group,
  expanded,
  onToggle,
  toggleLabel,
  actions,
}: {
  group: EntryGroup;
  expanded: boolean;
  onToggle: () => void;
  toggleLabel: string;
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
    <li className="flex flex-col gap-2">
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
        <div className="group flex items-center gap-1 rounded-xl border border-ink-border/70 bg-ink-900/40 px-4 py-3">
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
          <LineButtons
            onEdit={() => {
              setValue(session.text);
              actions.onStartEdit(session.id);
            }}
            onDelete={() => actions.onDelete(session.id)}
          />
        </div>
      )}
      {expanded && (
        <ul className="flex flex-col gap-2 pl-1">
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
  const Icon = KIND_ICON[entry.kind === "session" ? "note" : entry.kind];
  const kindLabel = {
    action: t.journal.kindAction,
    question: t.journal.kindQuestion,
    roll: t.journal.kindRoll,
    consequence: t.journal.kindConsequence,
    note: t.journal.kindNote,
    session: t.journal.kindSession,
  }[entry.kind];

  function commit() {
    if (value.trim()) actions.onEdit(entry.id, value.trim());
    actions.onStopEdit();
  }

  const icon = (
    <Icon
      size={18}
      aria-label={kindLabel}
      className={[
        "mt-0.5 shrink-0",
        entry.kind === "note" ? "text-parchment-dim/50" : "text-gold",
      ].join(" ")}
    />
  );

  if (editing) {
    return (
      <div className="flex items-start gap-2.5">
        {icon}
        <textarea
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit();
            if (e.key === "Escape") actions.onStopEdit();
          }}
          rows={2}
          className="min-w-0 flex-1 resize-none rounded-lg border border-ink-border bg-ink-800/70 px-2.5 py-1.5 text-base text-parchment focus:border-gold focus:outline-none"
        />
        <button type="button" onClick={commit} className="-m-2 shrink-0 p-2 text-sm font-medium text-gold">
          {t.common.save}
        </button>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-2.5">
      {icon}
      <div className="min-w-0 flex-1">
        <EntryContent entry={entry} answer={actions.answerFor(entry.linkedRollId)} />
      </div>
      <LineButtons
        onEdit={() => {
          setValue(entry.text);
          actions.onStartEdit(entry.id);
        }}
        onDelete={() => actions.onDelete(entry.id)}
      />
    </div>
  );
}

function EntryContent({ entry, answer }: { entry: JournalEntry; answer: Answer | undefined }) {
  if (entry.kind === "question") {
    return <p className="whitespace-pre-wrap text-base italic text-parchment">{entry.text}</p>;
  }

  if (entry.kind === "roll") {
    const { detail, result, answer: parsedAnswer } = splitRollText(entry.text);
    const knownAnswer = answer ?? parsedAnswer;
    if (result === null) {
      return <p className="whitespace-pre-wrap text-base text-parchment/90">{entry.text}</p>;
    }
    return (
      <div className="flex flex-col gap-1">
        <p className="text-xs text-parchment-dim">{detail}</p>
        {knownAnswer ? (
          <span
            className={`w-fit rounded-full border px-2.5 py-0.5 font-display text-sm font-semibold uppercase tracking-wide ${ANSWER_CHIP[knownAnswer]}`}
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
      {entry.text}
    </p>
  );
}

function LineButtons({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const { t } = useLocaleContext();
  // Con ratón aparecen al pasar por encima (menos ruido en bloques de
  // varias líneas); en táctil no hay hover, así que siempre se ven.
  return (
    <div className="-my-1 flex shrink-0 items-center transition pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:focus-within:opacity-100">
      <button
        type="button"
        onClick={onEdit}
        aria-label={t.journal.editEntry}
        className="p-1.5 text-parchment-dim/50 transition hover:text-gold"
      >
        <IconPencil size={15} />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={t.journal.deleteEntry}
        className="p-1.5 text-parchment-dim/50 transition hover:text-no"
      >
        <IconTrash size={15} />
      </button>
    </div>
  );
}
