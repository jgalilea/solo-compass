import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useHistoryContext } from "../hooks/useHistoryContext";
import { useJournalContext } from "../hooks/useJournalContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { HistoryEntryCard } from "./HistoryEntryCard";
import { ConfirmDialog } from "./ConfirmDialog";
import { Toast } from "./Toast";
import { EmptyState, ErrorState, LoadingState } from "./StateViews";
import { IconArrowLeft, IconChevronDown, IconHistory, IconTrash } from "./icons/Icons";
import type { HistoryEntry } from "../lib/history";

type Filter = "todo" | "oraculo" | "tabla" | "dados" | "favoritas";

/**
 * Rolls shown at first, and added each time the end of the list comes
 * into view: years of play are thousands of rolls, and rendering them
 * all at once took seconds on a phone (e2e/volume.perf.ts).
 */
const PAGE_SIZE = 60;

export function HistoryView() {
  const { status, entries, error, removeEntry, restoreEntry, toggleFavorite, clear, retry } =
    useHistoryContext();
  const { t } = useLocaleContext();
  // Coming from the Tables or Dice screen: their rolls only, and back there.
  const [searchParams] = useSearchParams();
  const from = searchParams.get("tipo");
  const origin = from === "tabla" ? "tabla" : from === "dados" ? "dados" : null;
  const [filter, setFilter] = useState<Filter>(origin ?? "todo");
  const { adventures, entries: journalEntries } = useJournalContext();
  const adventureNames = useMemo(() => new Map(adventures.map((a) => [a.id, a.name])), [adventures]);
  // Rolls from before they kept their adventure: the journal entry
  // linked to them says which one (oracle and table rolls logged there).
  const loggedIn = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of journalEntries) if (e.linkedRollId) map.set(e.linkedRollId, e.adventureId);
    return map;
  }, [journalEntries]);
  const adventureOf = (entry: HistoryEntry) => entry.adventureId ?? loggedIn.get(entry.id);
  const [confirmingClear, setConfirmingClear] = useState(false);
  // Deleting a roll doesn't ask for confirmation: it's undone from the toast.
  // Clearing the whole history does ask (it's big and irreversible).
  const [deletedEntry, setDeletedEntry] = useState<HistoryEntry | null>(null);
  const dismissUndo = useCallback(() => setDeletedEntry(null), []);

  function deleteWithUndo(id: string) {
    const entry = entries.find((e) => e.id === id);
    removeEntry(id);
    if (entry) setDeletedEntry(entry);
  }

  const filtered = useMemo(() => {
    if (filter === "todo") return entries;
    if (filter === "favoritas") return entries.filter((e) => e.favorite);
    return entries.filter((e) => e.kind === filter);
  }, [entries, filter]);

  const [shown, setShown] = useState(PAGE_SIZE);
  const showMore = useCallback(() => setShown((n) => n + PAGE_SIZE), []);
  const hasMore = filtered.length > shown;
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

  const backLabel =
    origin === "tabla" ? t.history.backToTables : origin === "dados" ? t.history.backToDice : t.history.backToOracle;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8 sm:py-12 md:max-w-3xl lg:max-w-7xl 2xl:max-w-[110rem]">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <Link
              to={origin === "tabla" ? "/tablas" : origin === "dados" ? "/dados" : "/"}
              aria-label={backLabel}
              title={backLabel}
              className="-m-2 shrink-0 p-2 text-parchment-dim transition hover:text-gold"
            >
              <IconArrowLeft size={20} />
            </Link>
            <h1 className="font-display text-3xl text-parchment sm:text-4xl">
              {t.history.title}
            </h1>
          </div>
          <p className="mt-1 text-sm text-parchment-dim">{t.history.subtitle}</p>
          {/* Gestures only exist on touch screens; with a mouse each roll
              already has its star and trash icons. */}
          <p className="mt-1 hidden text-xs text-parchment-dim/70 pointer-coarse:block">
            {t.history.swipeHint}
          </p>
        </div>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={() => setConfirmingClear(true)}
            className="mt-1.5 flex shrink-0 items-center gap-1.5 rounded-xl border border-ink-border px-3 py-1.5 text-xs text-parchment-dim transition hover:border-no/50 hover:text-no"
          >
            <IconTrash size={14} />
            {t.history.clearAll}
          </button>
        )}
      </header>

      {status === "ready" && entries.length > 0 && (
        <div className="flex gap-1 rounded-2xl border border-ink-border bg-ink-900/60 p-1 text-xs sm:text-sm md:max-w-xl">
          {filters.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => changeFilter(key)}
              className={[
                "flex-1 rounded-xl px-1 py-1.5 transition",
                filter === key
                  ? "bg-gold text-ink-950 font-medium"
                  : "text-parchment-dim hover:text-parchment",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
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

      {status === "ready" && entries.length === 0 && (
        <EmptyState
          icon={<IconHistory size={28} />}
          title={t.history.emptyTitle}
          description={t.history.emptyDescription}
        />
      )}

      {status === "ready" && entries.length > 0 && filtered.length === 0 && (
        <EmptyState
          title={
            filter === "favoritas"
              ? t.history.emptyFavoritesTitle
              : t.history.emptyFilterTitle
          }
          description={
            filter === "favoritas" ? t.history.emptyFavoritesDescription : undefined
          }
        />
      )}

      {status === "ready" && filtered.length > 0 && (
        <ul className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.slice(0, shown).map((entry) => (
            <li key={entry.id}>
              <HistoryEntryCard
                entry={entry}
                adventureId={adventureOf(entry)}
                adventureName={adventureOf(entry) ? (adventureNames.get(adventureOf(entry)!) ?? null) : undefined}
                onRequestDelete={deleteWithUndo}
                onToggleFavorite={toggleFavorite}
              />
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
