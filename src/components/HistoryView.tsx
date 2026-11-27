import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useHistoryContext } from "../hooks/useHistoryContext";
import { useJournalContext } from "../hooks/useJournalContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { PageHeader } from "./PageHeader";
import { Select } from "./Select";
import { HistoryEntryCard } from "./HistoryEntryCard";
import { ImportedRollCard } from "./ImportedRollCard";
import { LogRollDialog } from "./LogRollDialog";
import { rollJournalLines, searchHistory } from "../lib/rollLog";
import { importedRolls, searchImportedRolls } from "../lib/importedRolls";
import { interpolate } from "../lib/i18n";
import { PAGE_CLASS } from "../lib/pageLayout";
import { ConfirmDialog } from "./ConfirmDialog";
import { Toast } from "./Toast";
import { EmptyState, ErrorState, LoadingState } from "./StateViews";
import {
  IconArrowLeft,
  IconCheck,
  IconChevronDown,
  IconClose,
  IconHistory,
  IconJournal,
  IconSearch,
  IconTrash,
} from "./icons/Icons";
import type { HistoryEntry } from "../lib/history";

type Filter = "todo" | "oraculo" | "tabla" | "dados" | "favoritas";

/**
 * Rolls shown at first, and added each time the end of the list comes
 * into view: years of play are thousands of rolls, and rendering them
 * all at once took seconds on a phone (e2e/volume.perf.ts).
 */
const PAGE_SIZE = 60;

// The adventure filter's two values that aren't an adventure's id.
const ALL = "";
const FREE = "-";

export function HistoryView() {
  const {
    status,
    entries,
    error,
    removeEntry,
    restoreEntry,
    toggleFavorite,
    setAdventure,
    clear,
    retry,
  } = useHistoryContext();
  const { t } = useLocaleContext();
  // Coming from the Oracle, Tables or Dice screen: their rolls only, and back there.
  const [searchParams] = useSearchParams();
  const from = searchParams.get("tipo");
  const origin = from === "oraculo" || from === "tabla" || from === "dados" ? from : null;
  const [filter, setFilter] = useState<Filter>(origin ?? "todo");
  const {
    adventures,
    activeAdventureId,
    entries: journalEntries,
    addEntry: addJournalEntry,
    removeEntry: removeJournalEntry,
  } = useJournalContext();
  const adventureNames = useMemo(
    () => new Map(adventures.map((a) => [a.id, a.name])),
    [adventures],
  );
  // Rolls from before they kept their adventure: the journal entry
  // linked to them says which one (oracle and table rolls logged there).
  const loggedIn = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of journalEntries) if (e.linkedRollId) map.set(e.linkedRollId, e.adventureId);
    return map;
  }, [journalEntries]);
  const adventureOf = useCallback(
    (entry: HistoryEntry) => entry.adventureId ?? loggedIn.get(entry.id),
    [loggedIn],
  );
  // One adventure's rolls (its mechanics, without the narration), the
  // free ones, or all. From an adventure's menu it comes already set.
  const fromAdventure = searchParams.get("aventura");
  const [adventureFilter, setAdventureFilter] = useState<string>(fromAdventure ?? ALL);
  const [confirmingClear, setConfirmingClear] = useState(false);
  // Deleting a roll doesn't ask for confirmation: it's undone from the toast.
  // Clearing the whole history does ask (it's big and irreversible).
  const [deletedEntry, setDeletedEntry] = useState<HistoryEntry | null>(null);
  const dismissUndo = useCallback(() => setDeletedEntry(null), []);

  function deleteWithUndo(id: string) {
    const entry = entries.find((e) => e.id === id);
    removeEntry(id);
    setLogged(null);
    if (entry) setDeletedEntry(entry);
  }

  // A free roll (the adventure was paused, say) can still go to a journal:
  // the only adventure there is, or the one picked, the active one first.
  const openAdventures = useMemo(
    () =>
      adventures
        .filter((a) => a.status !== "archived")
        .sort((a, b) => Number(b.id === activeAdventureId) - Number(a.id === activeAdventureId)),
    [adventures, activeAdventureId],
  );
  const [logging, setLogging] = useState<HistoryEntry | null>(null);
  const [logged, setLogged] = useState<{ rollId: string; entryIds: string[]; name: string } | null>(
    null,
  );
  const dismissLogged = useCallback(() => setLogged(null), []);

  function logIn(entry: HistoryEntry, adventure: { id: string; name: string }) {
    const entryIds = rollJournalLines(t, entry).map((line) =>
      addJournalEntry(adventure.id, line.kind, line.text, entry.id),
    );
    setAdventure(entry.id, adventure.id);
    setLogging(null);
    setDeletedEntry(null);
    setLogged({ rollId: entry.id, entryIds, name: adventure.name });
  }

  function undoLog({ rollId, entryIds }: { rollId: string; entryIds: string[] }) {
    for (const id of entryIds) removeJournalEntry(id);
    setAdventure(rollId, null);
  }

  function startLog(entry: HistoryEntry) {
    if (openAdventures.length === 1) logIn(entry, openAdventures[0]);
    else setLogging(entry);
  }

  const [query, setQuery] = useState("");
  // Typing stays quick with thousands of rolls.
  const search = useDeferredValue(query);

  const filtered = useMemo(() => {
    const byAdventure =
      adventureFilter === ALL
        ? entries
        : entries.filter((e) =>
            adventureFilter === FREE ? !adventureOf(e) : adventureOf(e) === adventureFilter,
          );
    const byKind =
      filter === "todo"
        ? byAdventure
        : byAdventure.filter((e) => (filter === "favoritas" ? e.favorite : e.kind === filter));
    return searchHistory(t, byKind, search);
  }, [entries, filter, adventureFilter, adventureOf, search, t]);

  // An imported journal's own rolls (the sample's) were never made here:
  // with its adventure picked they're listed too, after those that were.
  const imported = useMemo(
    () =>
      adventureFilter === ALL || adventureFilter === FREE
        ? []
        : importedRolls(journalEntries, adventureFilter),
    [journalEntries, adventureFilter],
  );
  const filteredImported = useMemo(
    () =>
      searchImportedRolls(
        filter === "todo" ? imported : imported.filter((r) => r.kind === filter),
        search,
      ),
    [imported, filter, search],
  );
  const total = filtered.length + filteredImported.length;
  const anything = entries.length > 0 || imported.length > 0;

  const [shown, setShown] = useState(PAGE_SIZE);
  const showMore = useCallback(() => setShown((n) => n + PAGE_SIZE), []);
  const hasMore = total > shown;
  const moreRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const button = moreRef.current;
    if (!hasMore || !button || typeof IntersectionObserver === "undefined") return;
    // Loads the next page a little before the end is reached; the button
    // stays for keyboards and for browsers without the observer.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) showMore();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(button);
    return () => observer.disconnect();
  }, [hasMore, shown, showMore]);

  function changeFilter(next: Filter) {
    setFilter(next);
    setShown(PAGE_SIZE);
  }

  const filters: [Filter, string][] = [
    ["todo", t.history.filterAll],
    ["oraculo", t.history.filterOracle],
    ["tabla", t.history.filterTables],
    ["dados", t.history.filterDice],
    ["favoritas", t.history.filterFavorites],
  ];

  const pickedName = adventureNames.get(adventureFilter);
  const subtitle =
    adventureFilter === FREE
      ? t.history.subtitleFree
      : pickedName !== undefined
        ? interpolate(t.history.subtitleAdventure, { name: pickedName })
        : t.history.subtitle;

  const backLabel = fromAdventure
    ? t.history.backToAdventure
    : origin === "tabla"
      ? t.history.backToTables
      : origin === "dados"
        ? t.history.backToDice
        : t.history.backToOracle;

  return (
    <div className={PAGE_CLASS}>
      <PageHeader
        title={t.history.title}
        subtitle={subtitle}
        before={
          <Link
            to={
              fromAdventure
                ? `/diario/${fromAdventure}`
                : origin === "tabla"
                  ? "/tablas"
                  : origin === "dados"
                    ? "/dados"
                    : "/"
            }
            aria-label={backLabel}
            title={backLabel}
            className="-ml-2.5 -mr-1.5 flex size-10 shrink-0 items-center justify-center rounded-full text-parchment-dim transition hover:text-gold"
          >
            <IconArrowLeft size={20} />
          </Link>
        }
        actions={
          entries.length > 0 ? (
            <button
              type="button"
              onClick={() => setConfirmingClear(true)}
              className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-ink-border px-3 text-xs text-parchment-dim transition hover:border-no/50 hover:text-no"
            >
              <IconTrash size={14} />
              {t.history.clearAll}
            </button>
          ) : undefined
        }
      />

      {status === "ready" && anything && (
        // On a phone: the kinds, then adventure and search side by side.
        <div className="grid grid-cols-2 gap-2.5 md:flex md:flex-wrap md:items-center md:gap-3">
          <div className="col-span-2 flex gap-1 rounded-2xl border border-ink-border bg-ink-900/60 p-1 text-xs sm:text-sm md:max-w-xl md:flex-1">
            {filters.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => changeFilter(key)}
                className={[
                  "flex-1 rounded-xl px-1 py-1.5 transition pointer-coarse:py-2",
                  filter === key
                    ? "bg-gold text-ink-950 font-medium"
                    : "text-parchment-dim hover:text-parchment",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="flex min-w-0 items-center gap-2 text-sm text-parchment-dim">
            <IconJournal size={16} className="shrink-0 text-gold max-md:hidden" />
            <span className="sr-only">{t.history.adventureFilterLabel}</span>
            <Select
              value={adventureFilter}
              onChange={(e) => {
                setAdventureFilter(e.target.value);
                setShown(PAGE_SIZE);
              }}
              wrapperClassName="flex-1 md:w-64 md:flex-none"
              className="rounded-xl border border-ink-border bg-ink-900/70 py-2 pl-3 pr-9 text-base text-parchment focus:border-gold focus:outline-none md:text-sm"
            >
              <option value={ALL}>{t.history.adventureAll}</option>
              <option value={FREE}>{t.history.adventureFree}</option>
              {adventures.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="relative flex min-w-0 md:basis-full lg:ml-auto lg:basis-72">
            <IconSearch
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-parchment-faint"
            />
            <input
              data-hotkey="write"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShown(PAGE_SIZE);
              }}
              placeholder={t.history.searchPlaceholder}
              aria-label={t.history.searchLabel}
              enterKeyHint="search"
              className="w-full min-w-0 rounded-xl border border-ink-border bg-ink-900/70 py-2 pl-9 pr-9 text-base text-parchment placeholder:text-parchment-dim/50 focus:border-gold focus:outline-none md:text-sm"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label={t.history.searchClear}
                title={t.history.searchClear}
                className="absolute inset-y-0 right-1.5 my-auto flex size-7 items-center justify-center rounded-md text-parchment-dim transition hover:text-parchment"
              >
                <IconClose size={15} />
              </button>
            )}
          </label>
        </div>
      )}

      {status === "loading" && <LoadingState label={t.history.loading} />}

      {status === "error" && (
        <ErrorState
          title={t.history.loadErrorTitle}
          description={error ?? undefined}
          onRetry={retry}
        />
      )}

      {status === "ready" && !anything && (
        <EmptyState
          icon={<IconHistory size={28} />}
          title={t.history.emptyTitle}
          description={t.history.emptyDescription}
        />
      )}

      {status === "ready" && anything && total === 0 && (
        <EmptyState
          title={
            search.trim()
              ? interpolate(t.history.searchNoResults, { query: search.trim() })
              : filter === "favoritas"
                ? t.history.emptyFavoritesTitle
                : t.history.emptyFilterTitle
          }
          description={
            filter === "favoritas" && !search.trim()
              ? t.history.emptyFavoritesDescription
              : undefined
          }
        />
      )}

      {status === "ready" && total > 0 && (
        <ul className="grid grid-cols-1 items-start gap-2.5 md:grid-cols-2 md:gap-3 xl:grid-cols-3 2xl:grid-cols-4 4xl:grid-cols-5">
          {filtered.slice(0, shown).map((entry) => (
            <li key={entry.id}>
              <HistoryEntryCard
                entry={entry}
                adventureId={adventureOf(entry)}
                adventureName={
                  adventureOf(entry) ? (adventureNames.get(adventureOf(entry)!) ?? null) : undefined
                }
                onRequestDelete={deleteWithUndo}
                onToggleFavorite={toggleFavorite}
                onLog={openAdventures.length > 0 ? startLog : undefined}
              />
            </li>
          ))}
          {filteredImported.slice(0, Math.max(shown - filtered.length, 0)).map((roll) => (
            <li key={roll.entry.id}>
              <ImportedRollCard roll={roll} />
            </li>
          ))}
        </ul>
      )}

      {status === "ready" && hasMore && (
        <button
          ref={moreRef}
          type="button"
          onClick={showMore}
          className="mx-auto flex items-center gap-1.5 rounded-xl border border-ink-border px-4 py-2 text-sm text-parchment-dim transition hover:border-gold/50 hover:text-gold"
        >
          <IconChevronDown size={16} />
          {t.history.showMore}
        </button>
      )}

      {confirmingClear && (
        <ConfirmDialog
          title={t.history.clearConfirmTitle}
          description={t.history.clearConfirmDescription}
          confirmLabel={t.history.clearConfirmButton}
          onConfirm={() => {
            clear();
            setConfirmingClear(false);
          }}
          onCancel={() => setConfirmingClear(false)}
        />
      )}

      {logging && (
        <LogRollDialog
          adventures={openAdventures}
          activeId={activeAdventureId}
          onPick={(adventure) => logIn(logging, adventure)}
          onClose={() => setLogging(null)}
        />
      )}

      {logged && (
        <Toast
          key={logged.rollId}
          Icon={IconCheck}
          title={interpolate(t.dice.loggedIn, { name: logged.name })}
          closeLabel={t.common.close}
          action={{ label: t.common.undo, onClick: () => undoLog(logged) }}
          duration={6000}
          onDismiss={dismissLogged}
        />
      )}

      {deletedEntry && (
        <Toast
          key={deletedEntry.id}
          Icon={IconTrash}
          title={t.history.entryDeleted}
          closeLabel={t.common.close}
          action={{ label: t.common.undo, onClick: () => restoreEntry(deletedEntry) }}
          duration={6000}
          onDismiss={dismissUndo}
        />
      )}
    </div>
  );
}
