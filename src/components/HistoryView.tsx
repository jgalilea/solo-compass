import { useMemo, useState } from "react";
import { useHistoryContext } from "../hooks/useHistoryContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { HistoryEntryCard } from "./HistoryEntryCard";
import { ConfirmDialog } from "./ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "./StateViews";
import { IconScroll, IconTrash } from "./icons/Icons";
import type { HistoryEntry } from "../lib/history";
import type { Dictionary } from "../lib/i18n";

type Filter = "todo" | "oraculo" | "tabla" | "favoritas";

function describeEntry(t: Dictionary, entry: HistoryEntry): string {
  if (entry.kind === "oraculo") {
    return entry.question ? `“${entry.question}”` : t.history.describeOracleFallback;
  }
  return `${entry.tableName}: ${entry.resultText}`;
}

export function HistoryView() {
  const { status, entries, error, removeEntry, toggleFavorite, clear, retry } =
    useHistoryContext();
  const { t } = useLocaleContext();
  const [filter, setFilter] = useState<Filter>("todo");
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const entryToDelete = useMemo(
    () => entries.find((e) => e.id === deleteId) ?? null,
    [entries, deleteId],
  );

  const filtered = useMemo(() => {
    if (filter === "todo") return entries;
    if (filter === "favoritas") return entries.filter((e) => e.favorite);
    return entries.filter((e) => e.kind === filter);
  }, [entries, filter]);

  const filters: [Filter, string][] = [
    ["todo", t.history.filterAll],
    ["oraculo", t.history.filterOracle],
    ["tabla", t.history.filterTables],
    ["favoritas", t.history.filterFavorites],
  ];

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-parchment sm:text-4xl">
            {t.history.title}
          </h1>
          <p className="mt-1 text-sm text-parchment-dim">{t.history.subtitle}</p>
        </div>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={() => setConfirmingClear(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-ink-border px-3 py-1.5 text-xs text-parchment-dim transition hover:border-no/50 hover:text-no"
          >
            <IconTrash size={14} />
            {t.history.clearAll}
          </button>
        )}
      </header>

      {status === "ready" && entries.length > 0 && (
        <div className="flex gap-1 rounded-2xl border border-ink-border bg-ink-900/60 p-1 text-xs">
          {filters.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
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
          icon={<IconScroll size={28} />}
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
        <ul className="flex flex-col gap-3">
          {filtered.map((entry) => (
            <li key={entry.id}>
              <HistoryEntryCard
                entry={entry}
                onRequestDelete={setDeleteId}
                onToggleFavorite={toggleFavorite}
              />
            </li>
          ))}
        </ul>
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

      {entryToDelete && (
        <ConfirmDialog
          title={t.history.deleteConfirmTitle}
          description={`${describeEntry(t, entryToDelete)} ${t.history.deleteConfirmSuffix}`}
          confirmLabel={t.history.deleteConfirmButton}
          onConfirm={() => {
            removeEntry(entryToDelete.id);
            setDeleteId(null);
          }}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}
