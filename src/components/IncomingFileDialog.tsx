import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useJournalContext } from "../hooks/useJournalContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { interpolate } from "../lib/i18n";
import {
  fileProblemText,
  inspectFile,
  inspectJournal,
  inspectTables,
  type InspectedFile,
} from "../lib/fileImport";
import { readLonelog } from "../lib/lonelog";
import { PRIMARY_BUTTON_CLASS } from "../lib/journalUi";
import { DialogBody, DialogHeader } from "./Dialog";
import { IconAlertCircle, IconFileImport, IconInfo } from "./icons/Icons";
import { Modal } from "./Modal";
import { RestoreChoice } from "./RestoreChoice";

/** How many tables are named before "…". */
const TABLES_LISTED = 8;

/** The state TablesView reads to import tables handed to it (one opens in the editor). */
export interface ImportTablesState {
  importTables: InspectedFile & { kind: "tables" };
}

/**
 * A file dropped on the window, opened with the installed app or shared
 * to it: what it is, and what to do with it, before anything is kept
 * (fileImport.ts looks at it). Its own chunk, with what reads files;
 * drawn by IncomingFiles, one file at a time.
 */
export function IncomingFileDialog({
  file,
  shared,
  after,
  onDone,
}: {
  file: File;
  /** Came through the share target: maybe not the player's doing (incomingFiles.ts). */
  shared: boolean;
  after: number;
  onDone: () => void;
}) {
  const { t } = useLocaleContext();
  const { importAdventure, setActiveAdventureId } = useJournalContext();
  const navigate = useNavigate();
  const [found, setFound] = useState<InspectedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const f = t.files;

  // Drawn afresh for each file (IncomingFiles keys it), so this only reads it.
  useEffect(() => {
    let cancelled = false;
    inspectFile(t, file).then(
      (result) => !cancelled && setFound(result),
      () => !cancelled && setFound({ kind: "problem", name: file.name, problem: "damaged" }),
    );
    return () => {
      cancelled = true;
    };
  }, [file, t]);

  function importJournal(journal: InspectedFile & { kind: "journal" }) {
    const adventure = importAdventure(journal.title, readLonelog(journal.text));
    setActiveAdventureId(adventure.id);
    navigate(`/diario/${adventure.id}`);
    onDone();
  }

  function importTables(tables: InspectedFile & { kind: "tables" }) {
    navigate("/tablas", { state: { importTables: tables } satisfies ImportTablesState });
    onDone();
  }

  // A text could be either; "the other one" reads it again as that.
  const isJson = found !== null && found.kind !== "problem" && /^\s*[[{]/.test(found.text);

  return (
    <Modal onClose={onDone} labelledBy="incoming-file-title" centered size="sm">
      <DialogHeader
        id="incoming-file-title"
        title={f.dialogTitle}
        Icon={IconFileImport}
        subtitle={file.name || undefined}
        onClose={onDone}
      />
      <DialogBody className="block">
        {shared && found?.kind !== "problem" && (
          <p className="mb-4 flex items-start gap-2 rounded-xl border border-ink-border px-3 py-2 text-xs text-parchment-dim">
            <IconInfo size={14} className="mt-0.5 shrink-0 text-gold" />
            {f.sharedNote}
          </p>
        )}
        {found === null ? (
          <p className="text-sm text-parchment-dim">{f.reading}</p>
        ) : found.kind === "problem" ? (
          <div className="flex items-start gap-2.5">
            <IconAlertCircle size={20} className="mt-0.5 shrink-0 text-no" />
            <div>
              <p className="font-medium text-parchment">{f.problemTitle}</p>
              <p className="mt-1 text-sm text-parchment-dim">{fileProblemText(t, found.problem)}</p>
            </div>
          </div>
        ) : found.kind === "journal" ? (
          <>
            <Kind label={f.journalKind} />
            <p className="mt-1 font-display text-lg text-parchment">{found.title}</p>
            <Counts rows={[[f.entriesLabel, found.entries]]} />
            <p className="mt-3 text-sm text-parchment-dim">{f.journalNote}</p>
            <div className="mt-4 flex flex-col items-start gap-2">
              <button
                type="button"
                onClick={() => importJournal(found)}
                className={PRIMARY_BUTTON_CLASS}
              >
                {f.journalAction}
              </button>
              <QuietButton onClick={() => setFound(inspectTables(t, found.name, found.text))}>
                {f.asTables}
              </QuietButton>
            </div>
          </>
        ) : found.kind === "tables" ? (
          <>
            <Kind label={f.tablesKind} />
            <ul className="mt-2 flex flex-col gap-1 text-sm text-parchment">
              {found.drafts.slice(0, TABLES_LISTED).map((draft, i) => (
                <li key={i} className="flex items-baseline gap-2">
                  <span className="min-w-0 break-words">{draft.name}</span>
                  <span className="shrink-0 text-xs text-parchment-faint">{draft.dice}</span>
                </li>
              ))}
              {found.drafts.length > TABLES_LISTED && <li className="text-parchment-faint">…</li>}
            </ul>
            <p className="mt-3 text-sm text-parchment-dim">{f.tablesNote}</p>
            <div className="mt-4 flex flex-col items-start gap-2">
              <button
                type="button"
                onClick={() => importTables(found)}
                className={PRIMARY_BUTTON_CLASS}
              >
                {found.drafts.length === 1
                  ? f.tablesActionOne
                  : interpolate(f.tablesAction, { count: found.drafts.length })}
              </button>
              {!isJson && (
                <QuietButton onClick={() => setFound(inspectJournal(found.name, found.text))}>
                  {f.asJournal}
                </QuietButton>
              )}
            </div>
          </>
        ) : (
          <>
            <Kind label={f.backupKind} />
            {found.exportedAt !== null && (
              <p className="mt-1 text-sm text-parchment">
                {interpolate(f.backupMadeOn, {
                  date: new Intl.DateTimeFormat(t.dateLocale, {
                    dateStyle: "long",
                    timeStyle: "short",
                  }).format(found.exportedAt),
                })}
              </p>
            )}
            <Counts
              rows={[
                [f.adventuresLabel, found.adventures],
                [f.entriesLabel, found.entries],
                [f.rollsLabel, found.rolls],
                [f.tablesLabel, found.tables],
              ]}
            />
            {error && <p className="mt-3 text-sm text-no">{error}</p>}
            <RestoreChoice text={found.text} onCancel={onDone} onError={setError} />
          </>
        )}

        {after > 0 && (
          <p className="mt-4 text-xs text-parchment-faint">
            {after === 1 ? f.nextFilesOne : interpolate(f.nextFiles, { count: after })}
          </p>
        )}
      </DialogBody>
    </Modal>
  );
}

function Kind({ label }: { label: string }) {
  return (
    <p className="text-xs font-medium uppercase tracking-wide text-parchment-faint">{label}</p>
  );
}

function Counts({ rows }: { rows: [string, number][] }) {
  const { t } = useLocaleContext();
  const number = new Intl.NumberFormat(t.dateLocale);
  return (
    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
      {rows.map(([label, count]) => (
        <div key={label} className="contents">
          <dt className="text-parchment-dim">{label}</dt>
          <dd className="tabular-nums text-parchment">{number.format(count)}</dd>
        </div>
      ))}
    </dl>
  );
}

function QuietButton({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-1 py-1 text-sm text-parchment-dim underline decoration-ink-border underline-offset-4 transition hover:text-gold hover:decoration-gold"
    >
      {children}
    </button>
  );
}
