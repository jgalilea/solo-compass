import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useJournalContext } from "../hooks/useJournalContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { interpolate } from "../lib/i18n";
import type { Adventure } from "../lib/journal";
import { AllDiceStatsDialog } from "./AllDiceStatsDialog";
import { EmptyState, ErrorState, LoadingState } from "./StateViews";
import { BackupNote } from "./BackupNote";
import { SafariStorageNote } from "./SafariStorageNote";
import { buildSampleAdventure } from "../lib/sampleAdventure";
import { readLonelog } from "../lib/lonelog";
import { fileProblemText, inspectFile } from "../lib/fileImport";
import { offerFiles } from "../lib/incomingFiles";
import { loadMeaningTables } from "../lib/tableGames";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "../lib/journalUi";
import { ENTRY_TYPES, entryType, searchEntries, type EntryType } from "../lib/journalSearch";
import { PAGE_CLASS } from "../lib/pageLayout";
import { normalizeForSearch } from "../lib/text";
import { FilterChips } from "./FilterChips";
import { PageHeader } from "./PageHeader";
import { SearchResultList } from "./journalShared";
import {
  IconChart,
  IconCheck,
  IconChevronRight,
  IconClose,
  IconJournal,
  IconGripVertical,
  IconPlus,
  IconSearch,
  IconStar,
  IconUpload,
} from "./icons/Icons";

/**
 * The journal's list of adventures. Each one's content (sessions,
 * composer…) lives in AdventureDetailView (/diario/:adventureId) — so
 * this screen stays light even with many adventures, and never
 * pushes anything out of place.
 */
export function JournalListView() {
  const {
    status,
    error,
    adventures,
    entries,
    activeAdventureId,
    setActiveAdventureId,
    createAdventure,
    reorderAdventures,
    toggleAdventureFavorite,
    importAdventure,
    retry,
  } = useJournalContext();
  const { t, locale } = useLocaleContext();
  const navigate = useNavigate();

  const [statsOpen, setStatsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchType, setSearchType] = useState<EntryType | null>(null);
  const [newAdventureName, setNewAdventureName] = useState("");
  const [showNewAdventureForm, setShowNewAdventureForm] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [archivedExpanded, setArchivedExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Display order (non-archived adventures only): it comes straight
  // from the stored order of `adventures` (new ones are created at the
  // start and reorderAdventures persists it). While dragging a
  // provisional order is used, saved on release.
  const savedOrder = useMemo(
    () => adventures.filter((c) => c.status !== "archived").map((c) => c.id),
    [adventures],
  );
  const [dragOrder, setDragOrder] = useState<string[] | null>(null);
  const order = dragOrder ?? savedOrder;
  const orderRef = useRef(order);

  const byId = useMemo(() => new Map(adventures.map((c) => [c.id, c])), [adventures]);
  // How much each adventure holds, for the line under its name.
  const entryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entries) counts.set(e.adventureId, (counts.get(e.adventureId) ?? 0) + 1);
    return counts;
  }, [entries]);

  const query = normalizeForSearch(search.trim());
  function matchesQuery(c: Adventure): boolean {
    return !query || normalizeForSearch(c.name).includes(query);
  }
  // The same search also looks inside every journal ("what was that
  // innkeeper called?"), below the matching adventures.
  const allMatches = useMemo(
    () => (search.trim() ? searchEntries(entries, search) : []),
    [entries, search],
  );
  // Only the types found; the one picked waits if this search has none of it.
  const matchTypes = useMemo(() => new Set(allMatches.map((m) => entryType(m.entry))), [allMatches]);
  const shownType = searchType && matchTypes.has(searchType) ? searchType : null;
  const entryMatches = shownType ? allMatches.filter((m) => entryType(m.entry) === shownType) : allMatches;

  const orderedActive = order
    .map((id) => byId.get(id))
    .filter((c): c is Adventure => !!c && c.status !== "archived" && matchesQuery(c));
  const pinned = orderedActive.filter((c) => c.favorite);
  const rest = orderedActive.filter((c) => !c.favorite);

  const archivedAdventures = adventures.filter((c) => c.status === "archived" && matchesQuery(c));
  const showArchivedContents = archivedExpanded || query !== "";

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const rowRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  useEffect(() => {
    if (!draggingId) return;
    // An adventure only moves within its own group (favourites / the
    // rest) — so "pinned at the top" always holds; dragging can never
    // take it out of its group.
    const draggingFavorite = byId.get(draggingId)?.favorite ?? false;

    function handleMove(e: PointerEvent) {
      const y = e.clientY;
      let targetId: string | null = null;
      for (const [id, el] of rowRefs.current) {
        if (id === draggingId) continue;
        if ((byId.get(id)?.favorite ?? false) !== draggingFavorite) continue;
        const rect = el.getBoundingClientRect();
        if (y >= rect.top && y <= rect.bottom) {
          targetId = id;
          break;
        }
      }
      if (targetId) {
        const current = orderRef.current;
        const from = current.indexOf(draggingId as string);
        const to = current.indexOf(targetId);
        if (from !== -1 && to !== -1 && from !== to) {
          const next = [...current];
          next.splice(from, 1);
          next.splice(to, 0, draggingId as string);
          orderRef.current = next;
          setDragOrder(next);
        }
      }
    }

    function handleUp() {
      setDraggingId(null);
      reorderAdventures(orderRef.current);
      setDragOrder(null);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [draggingId, byId, reorderAdventures]);

  function handleCreateAdventure() {
    if (!newAdventureName.trim()) return;
    const adventure = createAdventure(newAdventureName);
    setActiveAdventureId(adventure.id);
    setNewAdventureName("");
    setShowNewAdventureForm(false);
    navigate(`/diario/${adventure.id}`);
  }

  // Looked at first (fileImport.ts): a backup or tables picked here by
  // mistake go to the dialog that opens them as that.
  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const found = await inspectFile(t, file, "journal");
      if (found.kind === "problem") return setImportError(fileProblemText(t, found.problem));
      setImportError(null);
      if (found.kind !== "journal") return offerFiles([file]);
      const adventure = importAdventure(found.title, readLonelog(found.text));
      setActiveAdventureId(adventure.id);
      navigate(`/diario/${adventure.id}`);
    } catch {
      setImportError(t.journal.importError);
    }
  }

  // The sample opens without being activated: oracle and table rolls
  // mustn't end up in it unless you ask for it.
  // Its table rolls come from Solo Compass's tables, loaded on demand.
  // If they can't be loaded, the link just does nothing.
  function handleOpenSample() {
    loadMeaningTables("solo-compass", t, locale)
      .then((tables) => {
        const { name, markdown } = buildSampleAdventure(t, tables);
        const adventure = importAdventure(name, readLonelog(markdown));
        navigate(`/diario/${adventure.id}`, { state: { fromStart: true } });
      })
      .catch(() => undefined);
  }

  const hasAnyAdventures = adventures.length > 0;
  const hasVisibleResults =
    pinned.length > 0 || rest.length > 0 || archivedAdventures.length > 0 || entryMatches.length > 0;

  return (
    <div className={PAGE_CLASS}>
      <PageHeader
        title={t.journal.title}
        subtitle={t.journal.subtitle}
        actions={
          status === "ready" && hasAnyAdventures && !showNewAdventureForm ? (
            <button
              type="button"
              onClick={() => setShowNewAdventureForm(true)}
              className="flex h-10 items-center gap-1.5 rounded-xl bg-gold px-3.5 text-sm font-semibold text-ink-950 transition hover:bg-gold-soft active:scale-95"
            >
              <IconPlus size={17} />
              {t.journal.newAdventure}
            </button>
          ) : undefined
        }
      />

      {statsOpen && <AllDiceStatsDialog onClose={() => setStatsOpen(false)} />}

      {status === "loading" && <LoadingState label={t.journal.loading} />}

      {status === "error" && (
        <ErrorState title={t.journal.loadErrorTitle} description={error ?? undefined} onRetry={retry} />
      )}

      {status === "ready" && (
        <>
          {/* Where its button is, and in the empty journal's card. */}
          {showNewAdventureForm && (
            <form
              className="flex flex-wrap items-center gap-2 sm:flex-nowrap"
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateAdventure();
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") setShowNewAdventureForm(false);
              }}
            >
              <input
                autoFocus
                value={newAdventureName}
                onChange={(e) => setNewAdventureName(e.target.value)}
                placeholder={t.journal.newAdventurePlaceholder}
                className={`${INPUT_CLASS} basis-full sm:basis-auto`}
              />
              <button type="submit" disabled={!newAdventureName.trim()} className={`${PRIMARY_BUTTON_CLASS} flex-1 disabled:opacity-50 sm:flex-none`}>
                {t.journal.createButton}
              </button>
              <button type="button" onClick={() => setShowNewAdventureForm(false)} className={`${SECONDARY_BUTTON_CLASS} flex-1 sm:flex-none`}>
                {t.common.cancel}
              </button>
            </form>
          )}
          <BackupNote />
          {hasAnyAdventures && (
            <div className="relative flex">
              <IconSearch
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-parchment-faint"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.journal.searchPlaceholder}
                aria-label={t.journal.searchLabel}
                className={`${INPUT_CLASS} w-full pl-10 ${search ? "pr-10" : ""}`}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label={t.history.searchClear}
                  title={t.history.searchClear}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-parchment-faint transition hover:text-parchment"
                >
                  <IconClose size={15} />
                </button>
              )}
            </div>
          )}

          <section className="flex flex-col gap-3">
            <h2 className="sr-only">{t.journal.adventuresHeading}</h2>
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.markdown,.txt,text/markdown,text/plain"
              className="hidden"
              onChange={handleImportFile}
            />

            {importError && <p className="text-sm text-no">{importError}</p>}

            {!hasAnyAdventures && !showNewAdventureForm && (
              <EmptyState
                icon={<IconJournal size={24} />}
                title={t.journal.noAdventuresTitle}
                description={t.journal.noAdventuresDescription}
                action={
                  <>
                    <div className="mt-2 flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowNewAdventureForm(true)}
                        className={`${PRIMARY_BUTTON_CLASS} flex items-center gap-1.5`}
                      >
                        <IconPlus size={16} />
                        {t.journal.newAdventure}
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={`${SECONDARY_BUTTON_CLASS} flex items-center gap-1.5`}
                      >
                        <IconUpload size={16} />
                        {t.journal.importButton}
                      </button>
                    </div>
                    {/* Only with an empty journal, and as a discreet link: never created on its own. */}
                    <button
                      type="button"
                      onClick={handleOpenSample}
                      className="mt-2 p-2 text-sm text-gold/80 underline decoration-gold/40 decoration-dotted underline-offset-4 transition hover:text-gold hover:decoration-gold"
                    >
                      {t.sample.offer}
                    </button>
                  </>
                }
                compact
              />
            )}

            {hasAnyAdventures && !hasVisibleResults && (
              <EmptyState
                icon={<IconSearch size={22} />}
                title={t.journal.noSearchResultsTitle}
                description={interpolate(t.journal.noSearchResultsDescription, { query: search.trim() })}
                compact
              />
            )}

            {(pinned.length > 0 || rest.length > 0) && (
              <ul className={ADVENTURE_GRID}>
                {[...pinned, ...rest].map((adventure) => (
                  <AdventureRow
                    key={adventure.id}
                    adventure={adventure}
                    entryCount={entryCounts.get(adventure.id) ?? 0}
                    isActive={adventure.id === activeAdventureId}
                    isDragging={draggingId === adventure.id}
                    rowRef={(el) => {
                      if (el) rowRefs.current.set(adventure.id, el);
                      else rowRefs.current.delete(adventure.id);
                    }}
                    onDragStart={() => {
                      orderRef.current = order;
                      setDraggingId(adventure.id);
                    }}
                    onToggleFavorite={() => toggleAdventureFavorite(adventure.id)}
                    t={t}
                  />
                ))}
              </ul>
            )}

            {hasAnyAdventures && !activeAdventureId && (
              <p className="text-center text-sm text-parchment-faint">
                {t.journal.noActiveAdventureNote}
              </p>
            )}

            {/* What's done once in a while, below the list. */}
            {hasAnyAdventures && !query && (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => fileInputRef.current?.click()} className={QUIET_BUTTON}>
                  <IconUpload size={16} />
                  {t.journal.importButton}
                </button>
                <button type="button" onClick={() => setStatsOpen(true)} className={QUIET_BUTTON}>
                  <IconChart size={16} />
                  {t.journal.stats.allDiceButton}
                </button>
              </div>
            )}

            <SafariStorageNote />
          </section>

          {entryMatches.length > 0 && (
            <section className="flex flex-col gap-2.5">
              <h2 className="text-xs font-medium uppercase tracking-wide text-parchment-dim">
                {t.journal.searchEntriesHeading}
                <span className="ml-2 normal-case tracking-normal text-parchment-faint">
                  {entryMatches.length > ENTRY_RESULTS_LIMIT
                    ? interpolate(t.journal.searchMoreResults, { count: ENTRY_RESULTS_LIMIT })
                    : entryMatches.length === 1
                      ? t.journal.searchMatchCountOne
                      : interpolate(t.journal.searchMatchCount, { count: entryMatches.length })}
                </span>
              </h2>
              {matchTypes.size > 1 && (
                <FilterChips
                  label={t.journal.searchTypeLabel}
                  allLabel={t.journal.searchTypeAll}
                  options={ENTRY_TYPES.filter((id) => matchTypes.has(id)).map((id) => [id, t.journal.searchTypes[id]] as const)}
                  value={shownType}
                  onChange={setSearchType}
                  className="-mx-4 px-4"
                />
              )}
              <SearchResultList
                matches={entryMatches.slice(0, ENTRY_RESULTS_LIMIT)}
                query={search.trim()}
                adventureName={(id) => byId.get(id)?.name}
                onPick={(match) =>
                  navigate(`/diario/${match.entry.adventureId}`, { state: { entryId: match.entry.id } })
                }
              />
            </section>
          )}

          {archivedAdventures.length > 0 && (
            <section className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setArchivedExpanded((v) => !v)}
                aria-expanded={showArchivedContents}
                className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-parchment-dim transition hover:text-parchment"
              >
                <IconChevronRight
                  size={14}
                  className={`shrink-0 transition-transform ${showArchivedContents ? "rotate-90" : ""}`}
                />
                {t.journal.archivedHeading}
                <span className="text-parchment-faint">{archivedAdventures.length}</span>
              </button>
              {showArchivedContents && (
                <ul className={ADVENTURE_GRID}>
                  {archivedAdventures.map((adventure) => (
                    <li key={adventure.id}>
                      <Link
                        to={`/diario/${adventure.id}`}
                        className="flex items-center gap-2 rounded-2xl border border-ink-border bg-ink-800/30 p-4 opacity-70 transition hover:opacity-100"
                      >
                        <span className="min-w-0 flex-1 truncate text-base font-medium text-parchment">
                          {adventure.name}
                        </span>
                        <span className="shrink-0 rounded-full border border-ink-border px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-parchment-dim">
                          {t.journal.statusArchived}
                        </span>
                        <IconChevronRight size={16} className="shrink-0 text-parchment-dim/40" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

const ENTRY_RESULTS_LIMIT = 30;
const ADVENTURE_GRID = "grid gap-2.5 lg:grid-cols-2 3xl:grid-cols-3";
const QUIET_BUTTON =
  "flex h-10 flex-auto items-center justify-center gap-1.5 rounded-xl border border-ink-border px-2.5 text-[13px] text-parchment-dim sm:flex-none sm:px-3 sm:text-sm transition hover:border-gold/50 hover:text-gold";

function AdventureRow({
  adventure,
  entryCount,
  isActive,
  isDragging,
  rowRef,
  onDragStart,
  onToggleFavorite,
  t,
}: {
  adventure: Adventure;
  entryCount: number;
  isActive: boolean;
  isDragging: boolean;
  rowRef: (el: HTMLLIElement | null) => void;
  onDragStart: () => void;
  onToggleFavorite: () => void;
  t: ReturnType<typeof useLocaleContext>["t"];
}) {
  return (
    <li
      ref={rowRef}
      style={isDragging ? { opacity: 0.5 } : undefined}
      className={[
        "group flex min-w-0 items-center gap-1 rounded-2xl border p-2 transition",
        isActive
          ? "border-gold/50 bg-gold/[0.06] has-[a:hover]:bg-gold/10"
          : "border-ink-border bg-ink-800/50 has-[a:hover]:border-gold/40 has-[a:hover]:bg-ink-800",
      ].join(" ")}
    >
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          onDragStart();
        }}
        aria-label={t.journal.dragHandle}
        title={t.journal.dragHandle}
        style={{ touchAction: "none" }}
        className="-m-1 shrink-0 cursor-grab p-3 text-parchment-faint transition hover:text-parchment-dim active:cursor-grabbing"
      >
        <IconGripVertical size={18} />
      </button>
      <button
        type="button"
        onClick={onToggleFavorite}
        aria-pressed={adventure.favorite}
        aria-label={adventure.favorite ? t.journal.favoriteRemove : t.journal.favoriteAdd}
        title={adventure.favorite ? t.journal.favoriteRemove : t.journal.favoriteAddHint}
        className={[
          "-m-1 shrink-0 p-3 transition",
          adventure.favorite ? "text-gold" : "text-parchment-faint hover:text-gold",
        ].join(" ")}
      >
        <IconStar size={16} filled={adventure.favorite} />
      </button>
      <Link
        to={`/diario/${adventure.id}`}
        className="flex min-w-0 flex-1 items-center gap-2 px-1 py-1.5"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          {/* Two lines on phones: one cut most names beside the badge. */}
          <span className="line-clamp-2 break-words text-base font-medium leading-snug text-parchment sm:line-clamp-1">
            {adventure.name}
          </span>
          {/* How much it holds and when it was last touched. */}
          <span className="truncate text-xs text-parchment-faint">
            {entryCount > 0 &&
              `${entryCount === 1 ? t.journal.searchMatchCountOne : interpolate(t.journal.searchMatchCount, { count: entryCount })} · `}
            {new Date(adventure.updatedAt).toLocaleDateString(t.dateLocale, { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </span>
        {/* Only the active one is marked: any other ongoing one is simply
            waiting, and saying so on each took the width of its name. */}
        {isActive && (
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-gold">
            <IconCheck size={12} />
            {t.journal.activeLabel}
          </span>
        )}
        <IconChevronRight size={16} className="shrink-0 text-parchment-dim/40 transition max-sm:hidden group-has-[a:hover]:translate-x-0.5 group-has-[a:hover]:text-gold" />
      </Link>
    </li>
  );
}
