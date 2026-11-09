import { interpolate } from "../lib/i18n";
import { ADVENTURE_SEARCH_LIMIT, type searchEntries } from "../lib/journalSearch";
import { INPUT_CLASS } from "../lib/journalUi";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { SearchResultList } from "./journalShared";
import { IconClose, IconSearch } from "./icons/Icons";

/** Search inside the adventure, below its header; picking a result jumps to it. */
export function JournalSearchPanel({
  query,
  onQueryChange,
  matches,
  onPick,
  onClose,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  /** Up to ADVENTURE_SEARCH_LIMIT + 1, to know whether there are more. */
  matches: ReturnType<typeof searchEntries>;
  onPick: (match: ReturnType<typeof searchEntries>[number]) => void;
  onClose: () => void;
}) {
  const { t } = useLocaleContext();
  const q = query.trim();
  const shown = matches.slice(0, ADVENTURE_SEARCH_LIMIT);
  return (
    <section
      aria-label={t.journal.searchInJournal}
      className="animate-fade-up flex flex-col gap-2.5 rounded-2xl border border-ink-border bg-ink-800/60 p-3"
    >
      <div className="relative flex">
        <IconSearch
          size={17}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-parchment-dim/50"
        />
        <input
          autoFocus
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "Enter" && shown[0]) onPick(shown[0]);
          }}
          placeholder={t.journal.searchInJournalPlaceholder}
          aria-label={t.journal.searchInJournal}
          className={`${INPUT_CLASS} w-full py-2.5 pl-10 pr-10`}
        />
        <button
          type="button"
          onClick={onClose}
          aria-label={t.common.close}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-parchment-dim/60 transition hover:text-parchment"
        >
          <IconClose size={15} />
        </button>
      </div>
      {q && (
        <>
          <p aria-live="polite" className="px-1 text-xs text-parchment-dim">
            {shown.length === 0
              ? interpolate(t.journal.searchNoMatches, { query: q })
              : matches.length > ADVENTURE_SEARCH_LIMIT
                ? interpolate(t.journal.searchMoreResults, { count: ADVENTURE_SEARCH_LIMIT })
                : shown.length === 1
                  ? t.journal.searchMatchCountOne
                  : interpolate(t.journal.searchMatchCount, { count: shown.length })}
          </p>
          {shown.length > 0 && (
            <div className="max-h-[50dvh] overflow-y-auto overscroll-contain pr-0.5">
              <SearchResultList matches={shown} query={q} onPick={onPick} />
            </div>
          )}
        </>
      )}
    </section>
  );
}

