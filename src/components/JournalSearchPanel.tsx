import { interpolate } from "../lib/i18n";
import { ADVENTURE_SEARCH_LIMIT, ENTRY_TYPES, type EntryType, type searchEntries } from "../lib/journalSearch";
import { INPUT_CLASS } from "../lib/journalUi";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { FilterChips } from "./FilterChips";
import { SearchResultList } from "./journalShared";
import { IconClose, IconSearch } from "./icons/Icons";

/**
 * Search inside the adventure, below its header, by words, by type of
 * entry or both; picking a result jumps to it.
 */
export function JournalSearchPanel({
  query,
  onQueryChange,
  type,
  types,
  onTypeChange,
  matches,
  onPick,
  onClose,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  type: EntryType | null;
  /** Those the adventure has. */
  types: ReadonlySet<EntryType>;
  onTypeChange: (type: EntryType | null) => void;
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
      className="animate-fade-up flex flex-col gap-2.5 rounded-2xl border border-ink-border bg-ink-800 p-3 shadow-2xl"
    >
      <div className="relative flex">
        <IconSearch
          size={17}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-parchment-faint"
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
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-parchment-faint transition hover:text-parchment"
        >
          <IconClose size={15} />
        </button>
      </div>
      {types.size > 1 && (
        <FilterChips
          label={t.journal.searchTypeLabel}
          allLabel={t.journal.searchTypeAll}
          options={ENTRY_TYPES.filter((id) => types.has(id)).map((id) => [id, t.journal.searchTypes[id]] as const)}
          value={type}
          onChange={onTypeChange}
          className="-mx-3 px-3"
        />
      )}
      {(q || type) && (
        <>
          <p aria-live="polite" className="px-1 text-xs text-parchment-dim">
            {shown.length === 0
              ? interpolate(type ? t.journal.searchNoMatchesOfType : t.journal.searchNoMatches, { query: q })
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

