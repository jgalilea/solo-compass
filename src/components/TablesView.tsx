import { useEffect, useMemo, useRef, useState } from "react";
import { diceMax, getMeaningTables, type MeaningTable } from "../lib/tables";
import { loadFavoriteTableIds, saveFavoriteTableIds } from "../lib/tableFavorites";
import type { TableRollEntry } from "../lib/history";
import { useJournalContext } from "../hooks/useJournalContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { usePlayActions } from "../hooks/usePlayActions";
import { interpolate } from "../lib/i18n";
import type { Adventure } from "../lib/journal";
import { ActivateAdventureNudge } from "./ActivateAdventureNudge";
import { ConsequenceComposer } from "./ConsequenceComposer";
import { EmptyState } from "./StateViews";
import {
  IconClose,
  IconDice,
  IconExternalLink,
  IconList,
  IconSearch,
  IconStar,
  IconTable,
} from "./icons/Icons";
import { Modal } from "./Modal";

function normalize(s: string): string {
  // Quita acentos (vía descomposición Unicode) para que la búsqueda
  // encuentre "accion" al escribir "Acción" y viceversa.
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

interface LastResult {
  table: MeaningTable;
  entry: TableRollEntry;
}

/**
 * Lista compacta de tablas + un único "último resultado". En móvil y
 * tablet el resultado se abre bajo la tabla tirada; en escritorio va
 * en un panel fijo a la derecha. Solo se guarda el último (no uno por
 * tabla), para que la lista no crezca con cada tirada.
 */
export function TablesView() {
  const { adventures, activeAdventureId } = useJournalContext();
  const { rollTable, addConsequence } = usePlayActions();
  const { t } = useLocaleContext();
  const [last, setLast] = useState<LastResult | null>(null);
  const [rollingId, setRollingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() =>
    loadFavoriteTableIds(),
  );

  const tables = useMemo(() => getMeaningTables(t), [t]);
  const activeAdventure = adventures.find((c) => c.id === activeAdventureId) ?? null;

  function handleRoll(table: MeaningTable) {
    setRollingId(table.id);
    // Pequeña pausa para que se note que "se está tirando".
    window.setTimeout(() => {
      setLast({ table, entry: rollTable(table) });
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

  function renderRow(table: MeaningTable) {
    return (
      <TableRow
        key={table.id}
        table={table}
        last={last?.table.id === table.id ? last : null}
        rolling={rollingId === table.id}
        favorite={favoriteIds.has(table.id)}
        activeAdventure={activeAdventure}
        onRoll={() => handleRoll(table)}
        onToggleFavorite={() => toggleFavorite(table.id)}
        onSaveConsequence={addConsequence}
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8 sm:py-12 md:max-w-3xl lg:max-w-6xl">
      <header className="text-center">
        <h1 className="font-display text-3xl text-parchment sm:text-4xl">
          {t.tables.title}
        </h1>
        <p className="mt-2 text-sm text-parchment-dim">{t.tables.subtitle}</p>
      </header>

      <ActivateAdventureNudge />

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start lg:gap-8">
        <div className="flex flex-col gap-6">
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
                <section className="flex flex-col gap-3">
                  <h2 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-parchment-dim">
                    <IconStar size={13} filled className="text-gold" />
                    {t.tables.favoritesHeading}
                  </h2>
                  <ul className="flex flex-col gap-3">{favoriteTables.map(renderRow)}</ul>
                </section>
              )}

              {otherTables.length > 0 && (
                <section className="flex flex-col gap-3">
                  {favoriteTables.length > 0 && (
                    <h2 className="text-xs font-medium uppercase tracking-wide text-parchment-dim">
                      {t.tables.allHeading}
                    </h2>
                  )}
                  <ul className="flex flex-col gap-3">{otherTables.map(renderRow)}</ul>
                </section>
              )}
            </>
          )}
        </div>

        <aside className="hidden lg:sticky lg:top-24 lg:flex lg:flex-col lg:gap-3">
          <h2 className="text-xs font-medium uppercase tracking-wide text-parchment-dim">
            {t.tables.resultPanelHeading}
          </h2>
          {last ? (
            <ResultPanel
              key={last.entry.id}
              last={last}
              activeAdventure={activeAdventure}
              onSaveConsequence={addConsequence}
            />
          ) : (
            <EmptyState icon={<IconTable size={24} />} title={t.tables.resultPanelEmpty} compact />
          )}
        </aside>
      </div>
    </div>
  );
}

function TableRow({
  table,
  last,
  rolling,
  favorite,
  activeAdventure,
  onRoll,
  onToggleFavorite,
  onSaveConsequence,
}: {
  table: MeaningTable;
  last: LastResult | null;
  rolling: boolean;
  favorite: boolean;
  activeAdventure: Adventure | null;
  onRoll: () => void;
  onToggleFavorite: () => void;
  onSaveConsequence: (rollId: string, text: string) => void;
}) {
  const { t } = useLocaleContext();
  const resultRef = useRef<HTMLDivElement>(null);

  // En móvil el resultado se abre bajo la fila: se trae a la vista.
  useEffect(() => {
    if (last) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [last]);

  return (
    <li
      className={[
        "rounded-2xl border bg-ink-800/50 p-4 transition-colors sm:p-5",
        last ? "border-gold/40" : "border-ink-border",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5">
            <h2 className="min-w-0 break-words font-display text-lg leading-snug text-parchment">{table.name}</h2>
            <button
              type="button"
              onClick={onToggleFavorite}
              aria-pressed={favorite}
              aria-label={favorite ? t.tables.favoriteRemove : t.tables.favoriteAdd}
              className={[
                "-m-1 mt-0 shrink-0 p-1 transition",
                favorite ? "text-gold" : "text-parchment-dim/40 hover:text-gold",
              ].join(" ")}
            >
              <IconStar size={16} filled={favorite} />
            </button>
          </div>
          <p className="mt-0.5 text-sm text-parchment-dim">{table.description}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
            <GameBadge table={table} />
            <TableEntriesButton table={table} />
          </div>
        </div>
        <button
          type="button"
          onClick={onRoll}
          disabled={rolling}
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-gold/50 bg-gold/10 px-3.5 py-2.5 text-sm font-medium text-gold transition hover:bg-gold/20 active:scale-95 disabled:opacity-60"
        >
          <IconDice size={17} className={rolling ? "animate-spin" : ""} />
          {interpolate(t.tables.rollButton, { dice: table.dice })}
        </button>
      </div>

      {last && (
        <div ref={resultRef} className="mt-4 scroll-mb-24 lg:hidden">
          <ResultPanel
            key={last.entry.id}
            last={last}
            activeAdventure={activeAdventure}
            onSaveConsequence={onSaveConsequence}
            inline
          />
        </div>
      )}
    </li>
  );
}

function ResultPanel({
  last,
  activeAdventure,
  onSaveConsequence,
  inline = false,
}: {
  last: LastResult;
  activeAdventure: Adventure | null;
  onSaveConsequence: (rollId: string, text: string) => void;
  inline?: boolean;
}) {
  const { t } = useLocaleContext();
  const { table, entry } = last;

  return (
    <div className="flex flex-col gap-3">
      <div
        className={[
          "animate-fade-up rounded-2xl border p-4",
          inline ? "border-ink-border bg-ink-900/60" : "border-gold/40 bg-ink-800/70 p-5",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-wide text-parchment-dim">
          <span className="truncate">
            {inline ? interpolate(t.tables.resultLabel, { n: entry.total }) : table.name}
          </span>
          <span className="shrink-0">
            {table.dice} · {entry.rolls.join(" · ")}
            {!inline && ` → ${entry.total}`}
          </span>
        </div>
        <p className={inline ? "mt-2 text-parchment" : "mt-3 text-lg font-medium leading-snug text-parchment"}>
          {entry.resultText}
        </p>
      </div>

      {activeAdventure && (
        <ConsequenceComposer
          onSave={(text) => onSaveConsequence(entry.id, text)}
          placeholder={t.oracle.consequencePlaceholder}
          saveLabel={t.common.save}
          savedLabel={interpolate(t.oracle.consequenceSaved, { name: activeAdventure.name })}
        />
      )}
    </div>
  );
}

function GameBadge({ table }: { table: MeaningTable }) {
  const className =
    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium uppercase tracking-wide";
  return table.game.url ? (
    <a
      href={table.game.url}
      target="_blank"
      rel="noreferrer"
      className={`${className} border-gold/40 bg-gold/10 text-gold transition hover:bg-gold/20`}
    >
      {table.game.name}
      <IconExternalLink size={11} />
    </a>
  ) : (
    <span className={`${className} border-ink-border text-parchment-dim`}>{table.game.name}</span>
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
        className="-m-1 flex items-center gap-1 p-1 text-parchment-dim transition hover:text-gold"
      >
        <IconList size={14} />
        {t.tables.viewResultsHint}
        <span className="text-parchment-dim/60">· 1–{diceMax(table.dice)}</span>
      </button>

      {open && (
        <Modal
          onClose={() => setOpen(false)}
          label={interpolate(t.tables.allResultsDialogLabel, { name: table.name })}
          className="flex max-h-[80vh] w-full max-w-sm flex-col rounded-t-3xl border border-ink-border bg-ink-800 p-5 shadow-2xl sm:rounded-3xl"
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
        </Modal>
      )}
    </>
  );
}
