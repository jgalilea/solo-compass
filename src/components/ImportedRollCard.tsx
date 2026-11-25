import { Link } from "react-router-dom";
import { useLocaleContext } from "../hooks/useLocaleContext";
import type { ImportedRoll } from "../lib/importedRolls";
import { formatIsoDay } from "../lib/journalUi";
import { EntryContent } from "./journalShared";
import { IconJournal } from "./icons/Icons";

/**
 * A roll that came with an imported journal, among the history's: the
 * journal's own (nothing to star or delete here), and a link to it.
 */
export function ImportedRollCard({ roll }: { roll: ImportedRoll }) {
  const { t } = useLocaleContext();
  const kind = { oraculo: t.history.kindOracle, tabla: t.history.filterTables, dados: t.history.kindDice }[roll.kind];
  return (
    <div className="rounded-2xl border border-ink-border bg-ink-800/50 p-4">
      <div className="flex items-start justify-between gap-3 text-xs uppercase tracking-wide text-parchment-faint">
        <span>{kind}</span>
        <span className="normal-case tracking-normal">
          {roll.day ? formatIsoDay(roll.day, t.dateLocale) : t.history.importedNote}
        </span>
      </div>
      <div className="mt-1 flex min-w-0 items-center gap-1 text-xs text-parchment-dim">
        <IconJournal size={12} className="shrink-0" />
        <Link
          to={`/diario/${roll.entry.adventureId}`}
          state={{ entryId: roll.entry.id }}
          className="min-w-0 truncate text-gold/90 underline decoration-dotted underline-offset-2 hover:text-gold"
        >
          {roll.sessionTitle ?? t.journal.prologueLabel}
        </Link>
      </div>
      <div className="mt-2 flex flex-col gap-2">
        {roll.question && <p className="text-sm italic text-parchment/90">“{roll.question}”</p>}
        <EntryContent entry={roll.entry} answer={undefined} />
      </div>
    </div>
  );
}
