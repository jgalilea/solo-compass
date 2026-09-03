import { useMemo, useState } from "react";
import {
  diceMax,
  getMeaningTables,
  lookupEntry,
  rollForTable,
  type MeaningTable,
} from "../lib/tables";
import { loadFavoriteTableIds, saveFavoriteTableIds } from "../lib/tableFavorites";
import type { TableRollEntry } from "../lib/history";
import { useHistoryContext } from "../hooks/useHistoryContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { interpolate, type Dictionary } from "../lib/i18n";
import { EmptyState } from "./StateViews";
import {
  IconClose,
  IconExternalLink,
  IconList,
  IconSearch,
  IconStar,
} from "./icons/Icons";

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildTableRollEntry(t: Dictionary, table: MeaningTable): TableRollEntry {
  const { rolls, total } = rollForTable(table.dice);
  const entry = lookupEntry(table, total);
  return {
    kind: "tabla",
    id: makeId(),
    timestamp: Date.now(),
    tableId: table.id,
    tableName: table.name,
    rolls,
    total,
    resultText: entry?.text ?? t.tables.noEntryFallback,
    favorite: false,
  };
}

function normalize(s: string): string {
  // Quita acentos (vía descomposición Unicode) para que la búsqueda
  // encuentre "accion" al escribir "Acción" y viceversa.
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function TablesView() {
  const { addEntry } = useHistoryContext();
  const { t } = useLocaleContext();
  const [results, setResults] = useState<Record<string, TableRollEntry>>({});
  const [rollingId, setRollingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() =>
    loadFavoriteTableIds(),
  );

  const tables = useMemo(() => getMeaningTables(t), [t]);

  function handleRoll(table: MeaningTable) {
    setRollingId(table.id);
    window.setTimeout(() => {
      const historyEntry = buildTableRollEntry(t, table);
      setResults((prev) => ({ ...prev, [table.id]: historyEntry }));
      addEntry(historyEntry);
      setRollingId(null);
    }, 220);
  }

  function toggleFavorite(id: string) {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveFavoriteTableIds(next);
      return next;
    });
  }

  const filteredTables = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return tables;
    return tables.filter(
      (table) =>
        normalize(table.name).includes(q) ||
        normalize(table.description).includes(q) ||
        normalize(table.game.name).includes(q),
    );
  }, [tables, query]);

  const favoriteTables = filteredTables.filter((table) => favoriteIds.has(table.id));
  const otherTables = filteredTables.filter((table) => !favoriteIds.has(table.id));

  function renderCard(table: MeaningTable) {
    return (
      <TableCard
        key={table.id}
        table={table}
        result={results[table.id]}
        rolling={rollingId === table.id}
        favorite={favoriteIds.has(table.id)}
        onRoll={() => handleRoll(table)}
        onToggleFavorite={() => toggleFavorite(table.id)}
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="text-center">
        <h1 className="font-display text-3xl text-parchment sm:text-4xl">
          {t.tables.title}
        </h1>
        <p className="mt-2 text-sm text-parchment-dim">{t.tables.subtitle}</p>
      </header>

      <label className="relative block">
        <IconSearch
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-parchment-dim/60"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.tables.searchPlaceholder}
          aria-label={t.tables.searchLabel}
          className="w-full rounded-2xl border border-ink-border bg-ink-900/70 py-2.5 pl-10 pr-4 text-parchment placeholder:text-parchment-dim/50 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
        />
      </label>

      {filteredTables.length === 0 ? (
        <EmptyState
          icon={<IconSearch size={24} />}
          title={t.tables.noResultsTitle}
          description={interpolate(t.tables.noResultsDescription, {
            query: query.trim(),
          })}
        />
      ) : (
        <>
          {favoriteTables.length > 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-parchment-dim">
                <IconStar size={13} filled className="text-gold" />
                {t.tables.favoritesHeading}
              </h2>
              {favoriteTables.map(renderCard)}
            </div>
          )}

          <div className="flex flex-col gap-4">
            {favoriteTables.length > 0 && otherTables.length > 0 && (
              <h2 className="text-xs font-medium uppercase tracking-wide text-parchment-dim">
                {t.tables.allHeading}
              </h2>
            )}
            {otherTables.map(renderCard)}
          </div>
        </>
      )}
    </div>
  );
}

function TableCard({
  table,
  result,
  rolling,
  favorite,
  onRoll,
  onToggleFavorite,
}: {
  table: MeaningTable;
  result?: TableRollEntry;
  rolling: boolean;
  favorite: boolean;
  onRoll: () => void;
  onToggleFavorite: () => void;
}) {
  const { t } = useLocaleContext();

  return (
    <div className="rounded-3xl border border-ink-border bg-ink-800/50 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-xl text-parchment">{table.name}</h2>
          {table.game.url ? (
            <a
              href={table.game.url}
              target="_blank"
              rel="noreferrer"
              className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-gold transition hover:bg-gold/20"
            >
              {table.game.name}
              <IconExternalLink size={11} />
            </a>
          ) : (
            <span className="mt-1.5 inline-block rounded-full border border-ink-border bg-ink-900/60 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-parchment-dim">
              {table.game.name}
            </span>
          )}
          <p className="mt-2 text-sm text-parchment-dim">{table.description}</p>
        </div>
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-pressed={favorite}
          aria-label={favorite ? t.tables.favoriteRemove : t.tables.favoriteAdd}
          className={[
            "-m-1 shrink-0 p-1 transition",
            favorite ? "text-gold" : "text-parchment-dim/50 hover:text-gold",
          ].join(" ")}
        >
          <IconStar size={18} filled={favorite} />
        </button>
      </div>

      <TableEntriesButton table={table} />

      <button
        type="button"
        onClick={onRoll}
        disabled={rolling}
        className="mt-3 w-full rounded-2xl border border-gold/50 bg-gold/10 py-2.5 font-medium text-gold transition hover:bg-gold/20 disabled:opacity-60"
      >
        {rolling ? t.tables.rolling : interpolate(t.tables.rollButton, { dice: table.dice })}
      </button>

      {result && (
        <div className="animate-fade-up mt-4 rounded-2xl border border-ink-border bg-ink-900/60 p-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-wide text-parchment-dim">
            <span>{interpolate(t.tables.resultLabel, { n: result.total })}</span>
            <span>{result.rolls.join(" · ")}</span>
          </div>
          <p className="mt-2 text-parchment">{result.resultText}</p>
        </div>
      )}
    </div>
  );
}

function TableEntriesButton({ table }: { table: MeaningTable }) {
  const { t } = useLocaleContext();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={t.tables.viewResultsTitle}
        className="mt-3 flex items-center gap-1.5 rounded-xl border border-ink-border px-2.5 py-1.5 text-xs uppercase tracking-wide text-parchment-dim transition hover:border-gold/50 hover:text-gold"
      >
        <IconList size={13} />
        {table.dice} · 1–{diceMax(table.dice)}
        <span className="normal-case tracking-normal text-parchment-dim/70">
          {t.tables.viewResultsHint}
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={interpolate(t.tables.allResultsDialogLabel, { name: table.name })}
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-sm flex-col rounded-t-3xl border border-ink-border bg-ink-800 p-5 shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-start justify-between gap-3">
              <h2 className="font-display text-lg text-parchment">
                {table.name}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t.common.close}
                className="-m-1 shrink-0 p-1 text-parchment-dim transition hover:text-parchment"
              >
                <IconClose size={16} />
              </button>
            </div>
            <p className="mb-3 text-xs uppercase tracking-wide text-parchment-dim/70">
              {table.dice} ·{" "}
              {interpolate(t.tables.resultsCountLabel, { count: table.entries.length })}
            </p>
            <ul className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
              {table.entries.map((entry) => (
                <li
                  key={`${entry.range[0]}-${entry.range[1]}`}
                  className="flex gap-3 rounded-xl border border-ink-border/70 bg-ink-900/50 px-3 py-2 text-sm"
                >
                  <span className="shrink-0 font-display text-parchment-dim">
                    {entry.range[0] === entry.range[1]
                      ? entry.range[0]
                      : `${entry.range[0]}–${entry.range[1]}`}
                  </span>
                  <span className="text-parchment/90">{entry.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
