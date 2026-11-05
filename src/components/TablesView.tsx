import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { formatRange, TABLE_THEMES, type MeaningTable, type TableTheme } from "../lib/tables";
import { loadFavoriteTableIds, saveFavoriteTableIds } from "../lib/tableFavorites";
import { loadOpenTableSections, saveOpenTableSections } from "../lib/tableSections";
import { gameOfTable, TABLE_GAMES } from "../lib/tableGames";
import {
  exportTableToMarkdown,
  parseTablesFile,
  type CustomTable,
  type CustomTableDraft,
} from "../lib/customTables";
import { useCustomTablesContext } from "../hooks/useCustomTablesContext";
import { useJournalContext } from "../hooks/useJournalContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { useMeaningTables } from "../hooks/useMeaningTables";
import { usePlayActions } from "../hooks/usePlayActions";
import { interpolate } from "../lib/i18n";
import type { Adventure } from "../lib/journal";
import { downloadTextFile, sanitizeFilename } from "../lib/journalUi";
import { canShare, shareTextFile } from "../lib/share";
import { normalizeForSearch } from "../lib/text";
import { ActionMenu } from "./ActionMenu";
import { ConsequenceComposer } from "./ConsequenceComposer";
import { EmptyState } from "./StateViews";
import { TableEditorDialog } from "./TableEditorDialog";
import { Toast } from "./Toast";
import {
  IconAlertCircle,
  IconChevronRight,
  IconClose,
  IconDice,
  IconDownload,
  IconExternalLink,
  IconList,
  IconPencil,
  IconPlus,
  IconSearch,
  IconShare,
  IconSparkles,
  IconStar,
  IconTable,
  IconTrash,
  IconUpload,
} from "./icons/Icons";
import { Modal } from "./Modal";

/** The latest roll on this screen: a table, or the quick inspiration. */
interface LastResult {
  /** Table id, or "inspiration": which row shows it inline on phones. */
  sourceId: string;
  /** History id, to link the consequence. */
  rollId: string;
  title: string;
  /** "d20 · 14", or the inspiration's "Action 3/4, Theme 2/5". */
  detail: string;
  /** Value looked up in the table (single tables only). */
  total?: number;
  text: string;
}

const INSPIRATION_ID = "inspiration";

type ToastState =
  | { kind: "deleted"; table: CustomTable; index: number }
  | { kind: "message"; title: string; error?: boolean };

/**
 * Compact list of tables + a single "latest result". On phone and
 * tablet the result opens below the rolled table; on desktop it goes in
 * a fixed panel on the right. Only the latest is kept (not one per
 * table), so the list doesn't grow with every roll.
 *
 * On top, the quick inspiration (action + theme in one roll); then
 * favourites, the player's own tables (create, import, edit, export,
 * share) and the built-in ones, one folding block per game.
 */
export function TablesView() {
  const { adventures, activeAdventureId } = useJournalContext();
  const { rollTable, rollInspiration, addConsequence } = usePlayActions();
  const { tables: customTables, addTables, updateTable, removeTable, restoreTable } = useCustomTablesContext();
  const { t } = useLocaleContext();
  const [last, setLast] = useState<LastResult | null>(null);
  const [rollingId, setRollingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() =>
    loadFavoriteTableIds(),
  );
  const [openSections, setOpenSections] = useState<Set<string>>(() => loadOpenTableSections());
  const [themeFilter, setThemeFilter] = useState<TableTheme | null>(null);
  const q = normalizeForSearch(query.trim());
  // Searching or filtering by theme looks through every game at once.
  const filtering = !!q || themeFilter !== null;
  // Each game is loaded only when needed: Solo Compass's (quick
  // inspiration), unfolded blocks, the favourites' games, and all of
  // them while searching or filtering.
  const { blocks, custom, inspiration, retry } = useMeaningTables(
    filtering
      ? "all"
      : [
          "solo-compass",
          ...TABLE_GAMES.filter((g) => openSections.has(g.id)).map((g) => g.id),
          ...[...favoriteIds].map(gameOfTable).filter((id) => id !== undefined),
        ],
  );
  const builtIn = blocks.flatMap((b) => b.tables);
  const [editor, setEditor] = useState<{ id?: string; draft?: CustomTableDraft } | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dismissToast = useCallback(() => setToast(null), []);

  const activeAdventure = adventures.find((c) => c.id === activeAdventureId) ?? null;

  // Short pause so it feels like "rolling".
  function withRollPause(id: string, roll: () => LastResult) {
    setRollingId(id);
    window.setTimeout(() => {
      setLast(roll());
      setRollingId(null);
    }, 220);
  }

  function handleRoll(table: MeaningTable) {
    withRollPause(table.id, () => {
      const entry = rollTable(table);
      return {
        sourceId: table.id,
        rollId: entry.id,
        title: entry.tableName,
        detail: `${table.dice} · ${entry.rolls.join(" · ")}`,
        total: entry.total,
        text: entry.resultText,
      };
    });
  }

  function handleInspiration() {
    if (!inspiration) return;
    withRollPause(INSPIRATION_ID, () => {
      const rolled = rollInspiration(inspiration);
      return {
        sourceId: INSPIRATION_ID,
        rollId: rolled.id,
        title: t.tables.inspirationName,
        detail: rolled.detail,
        text: rolled.text,
      };
    });
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

  // While searching or filtering, every block with matches starts open,
  // but can still be folded. Those folds are only for this search (not
  // saved): a new query or theme opens them all again.
  const filterKey = `${q}|${themeFilter ?? ""}`;
  const [filterFolds, setFilterFolds] = useState<{ key: string; ids: Set<string> }>({ key: "", ids: new Set() });
  const foldedWhileFiltering = filterFolds.key === filterKey ? filterFolds.ids : new Set<string>();
  const isOpen = (id: string) => (filtering ? !foldedWhileFiltering.has(id) : openSections.has(id));

  function toggleSection(id: string) {
    if (filtering) {
      const next = new Set(foldedWhileFiltering);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setFilterFolds({ key: filterKey, ids: next });
      return;
    }
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveOpenTableSections(next);
      return next;
    });
  }

  function saveEditor(draft: CustomTableDraft) {
    if (editor?.id) updateTable(editor.id, draft);
    else addTables([draft]);
    setEditor(null);
  }

  async function handleImportFile(file: File) {
    const drafts = parseTablesFile(t, await file.text(), file.name);
    if (drafts.length === 0) setToast({ kind: "message", title: t.tables.importError, error: true });
    // A single table opens in the editor, to review it before saving.
    else if (drafts.length === 1) setEditor({ draft: drafts[0] });
    else {
      addTables(drafts);
      setToast({ kind: "message", title: interpolate(t.tables.importedCount, { count: drafts.length }) });
    }
  }

  function deleteTable(id: string) {
    const index = customTables.findIndex((x) => x.id === id);
    if (index < 0) return;
    setToast({ kind: "deleted", table: customTables[index], index });
    removeTable(id);
    if (last?.sourceId === id) setLast(null);
  }

  function exportTable(id: string) {
    const table = customTables.find((x) => x.id === id);
    if (!table) return;
    const filename = `${sanitizeFilename(table.name)}.md`;
    downloadTextFile(filename, exportTableToMarkdown(t, table));
    setToast({ kind: "message", title: interpolate(t.tables.exportedTable, { filename }) });
  }

  function shareTable(id: string) {
    const table = customTables.find((x) => x.id === id);
    if (!table) return;
    shareTextFile(`${sanitizeFilename(table.name)}.md`, exportTableToMarkdown(t, table), table.name).catch(() =>
      exportTable(id),
    );
  }

  // By name, description, game or theme ("ironsworn", "naves"…), and
  // within the chosen theme (the player's own only if they gave it one).
  const matches = useCallback(
    (table: MeaningTable) =>
      (themeFilter === null || table.theme === themeFilter) &&
      (!q ||
        normalizeForSearch(table.name).includes(q) ||
        normalizeForSearch(table.description).includes(q) ||
        normalizeForSearch(table.game.name).includes(q) ||
        (!!table.theme && normalizeForSearch(t.tables.themes[table.theme]).includes(q))),
    [q, themeFilter, t],
  );
  const favoriteTables = useMemo(
    () => [...custom, ...builtIn].filter((x) => favoriteIds.has(x.id) && matches(x)),
    [custom, builtIn, favoriteIds, matches],
  );
  const otherCustom = custom.filter((x) => !favoriteIds.has(x.id) && matches(x));
  const otherBlocks = blocks.map((b) => ({ ...b, tables: b.tables.filter((x) => !favoriteIds.has(x.id) && matches(x)) }));
  // Only once every game has been searched: not while one is still loading.
  const nothingFound =
    filtering &&
    blocks.every((b) => b.status === "ready" || b.status === "error") &&
    favoriteTables.length + otherCustom.length + otherBlocks.reduce((n, b) => n + b.tables.length, 0) === 0;

  // A block's tables, under a sub-heading per theme (when it has several
  // and no theme is chosen). Tables without one (the player's own) go last.
  function renderTables(tables: MeaningTable[]) {
    const groups = [...TABLE_THEMES, undefined]
      .map((theme) => ({ theme, tables: tables.filter((x) => x.theme === theme) }))
      .filter((g) => g.tables.length > 0);
    if (groups.length <= 1) return <ul className="grid gap-3 2xl:grid-cols-2">{tables.map(renderRow)}</ul>;
    return (
      <div className="flex flex-col gap-5">
        {groups.map((g) => (
          <div key={g.theme ?? "none"} className="flex flex-col gap-3">
            <h3 className="flex items-center gap-2 px-1 text-xs font-medium uppercase tracking-wide text-parchment-dim">
              {g.theme ? t.tables.themes[g.theme] : t.tables.editor.themeNone}
              <span className="text-parchment-dim/50">{g.tables.length}</span>
            </h3>
            <ul className="grid gap-3 2xl:grid-cols-2">{g.tables.map(renderRow)}</ul>
          </div>
        ))}
      </div>
    );
  }

  function renderRow(table: MeaningTable) {
    return (
      <TableRow
        key={table.id}
        table={table}
        last={last?.sourceId === table.id ? last : null}
        rolling={rollingId === table.id}
        favorite={favoriteIds.has(table.id)}
        activeAdventure={activeAdventure}
        onRoll={() => handleRoll(table)}
        onToggleFavorite={() => toggleFavorite(table.id)}
        onSaveConsequence={addConsequence}
        menu={
          table.custom ? (
            <ActionMenu
              label={t.tables.tableActions}
              items={[
                {
                  label: t.tables.editTable,
                  Icon: IconPencil,
                  onSelect: () => setEditor({ id: table.id, draft: customTables.find((x) => x.id === table.id) }),
                },
                { label: t.tables.exportTable, Icon: IconDownload, onSelect: () => exportTable(table.id) },
                ...(canShare()
                  ? [{ label: t.tables.shareTable, Icon: IconShare, onSelect: () => shareTable(table.id) }]
                  : []),
                { label: t.tables.deleteTable, Icon: IconTrash, onSelect: () => deleteTable(table.id), danger: true },
              ]}
            />
          ) : null
        }
      />
    );
  }

  const customActions = (
    <div className="flex shrink-0 gap-2">
      <button
        type="button"
        onClick={() => setEditor({})}
        className="flex items-center gap-1.5 rounded-xl border border-gold/50 bg-gold/10 px-3 py-2 text-sm font-medium text-gold transition hover:bg-gold/20"
      >
        <IconPlus size={16} />
        {t.tables.newTable}
      </button>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        title={t.tables.importTableTitle}
        className="flex items-center gap-1.5 rounded-xl border border-ink-border px-3 py-2 text-sm text-parchment-dim transition hover:border-gold/50 hover:text-gold"
      >
        <IconUpload size={16} />
        {t.tables.importTable}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.txt,.json,text/plain,text/markdown,application/json"
        className="hidden"
        onChange={(ev) => {
          const file = ev.target.files?.[0];
          ev.target.value = "";
          if (file) void handleImportFile(file);
        }}
      />
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8 sm:py-12 md:max-w-3xl lg:max-w-7xl 2xl:max-w-[110rem]">
      <header className="text-center">
        <h1 className="font-display text-3xl text-parchment sm:text-4xl">
          {t.tables.title}
        </h1>
        <p className="mt-2 text-sm text-parchment-dim">{t.tables.subtitle}</p>
      </header>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start lg:gap-8 2xl:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] 2xl:gap-12">
        <div className="flex flex-col gap-6">
          <label className="relative block">
            <IconSearch
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-parchment-dim/60"
            />
            <input
              data-hotkey="write table"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.tables.searchPlaceholder}
              aria-label={t.tables.searchLabel}
              className="w-full rounded-2xl border border-ink-border bg-ink-900/70 py-2.5 pl-10 pr-4 text-parchment placeholder:text-parchment-dim/50 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
            />
          </label>

          <ThemeFilter value={themeFilter} onChange={setThemeFilter} />

          {!filtering && (
            <InspirationCard
              last={last?.sourceId === INSPIRATION_ID ? last : null}
              rolling={rollingId === INSPIRATION_ID || !inspiration}
              activeAdventure={activeAdventure}
              onRoll={handleInspiration}
              onSaveConsequence={addConsequence}
            />
          )}

          {nothingFound ? (
            <EmptyState
              icon={<IconSearch size={24} />}
              title={t.tables.noResultsTitle}
              description={interpolate(t.tables.noResultsDescription, {
                query: query.trim() || (themeFilter ? t.tables.themes[themeFilter] : ""),
              })}
            />
          ) : (
            <>
              {favoriteTables.length > 0 && (
                <TableSection
                  title={
                    <>
                      <IconStar size={13} filled className="text-gold" />
                      {t.tables.favoritesHeading}
                    </>
                  }
                >
                  <ul className="grid gap-3 2xl:grid-cols-2">{favoriteTables.map(renderRow)}</ul>
                </TableSection>
              )}

              {/* Always there (unless searching or filtering): creating or
                  importing a table is one unfold away. Folded, it's just a line. */}
              {(!filtering || otherCustom.length > 0) && (
                <FoldingSection
                  title={t.tables.customHeading}
                  count={filtering ? otherCustom.length : custom.length}
                  open={isOpen("custom")}
                  onToggle={() => toggleSection("custom")}
                >
                  <div className="flex flex-col gap-4">
                    {customActions}
                    {otherCustom.length > 0
                      ? renderTables(otherCustom)
                      : custom.length === 0 && (
                          <p className="rounded-2xl border border-dashed border-ink-border px-4 py-3 text-sm text-parchment-dim">
                            {t.tables.customEmpty}
                          </p>
                        )}
                  </div>
                </FoldingSection>
              )}

              {otherBlocks.map(
                (block) =>
                  // While searching or filtering, a game without matches is left out once it's loaded.
                  (!filtering || block.status !== "ready" || block.tables.length > 0) && (
                    <FoldingSection
                      key={block.id}
                      title={block.title}
                      note={block.note}
                      count={filtering ? block.tables.length : block.count}
                      open={isOpen(block.id)}
                      onToggle={() => toggleSection(block.id)}
                    >
                      {block.status === "error" ? (
                        <div className="flex flex-wrap items-center gap-3 px-1 text-sm text-parchment-dim">
                          {t.tables.loadError}
                          <button
                            type="button"
                            onClick={() => retry(block.id)}
                            className="rounded-xl border border-ink-border px-3 py-1.5 text-parchment transition hover:border-gold/50 hover:text-gold"
                          >
                            {t.common.retry}
                          </button>
                        </div>
                      ) : block.status === "ready" ? (
                        block.tables.length > 0 && renderTables(block.tables)
                      ) : (
                        <p className="px-1 text-sm text-parchment-dim">{t.common.loading}</p>
                      )}
                    </FoldingSection>
                  ),
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
              key={last.rollId}
              last={last}
              activeAdventure={activeAdventure}
              onSaveConsequence={addConsequence}
            />
          ) : (
            <EmptyState icon={<IconTable size={24} />} title={t.tables.resultPanelEmpty} compact />
          )}
        </aside>
      </div>

      {editor && (
        <TableEditorDialog
          initial={editor.draft}
          editing={!!editor.id}
          onSave={saveEditor}
          onClose={() => setEditor(null)}
        />
      )}

      {toast?.kind === "deleted" && (
        <Toast
          key={toast.table.id}
          Icon={IconTrash}
          title={t.tables.tableDeleted}
          closeLabel={t.common.close}
          action={{ label: t.common.undo, onClick: () => restoreTable(toast.table, toast.index) }}
          duration={6000}
          onDismiss={dismissToast}
        />
      )}
      {toast?.kind === "message" && (
        <Toast
          key={toast.title}
          Icon={toast.error ? IconAlertCircle : IconDownload}
          title={toast.title}
          closeLabel={t.common.close}
          onDismiss={dismissToast}
        />
      )}
    </div>
  );
}

function TableSection({ title, actions, children }: { title: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-parchment-dim">
          {title}
        </h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

/**
 * One chip per theme (plus "All"): narrows every block, and the search,
 * to that theme. On phones the row scrolls sideways instead of wrapping
 * into several lines.
 */
function ThemeFilter({ value, onChange }: { value: TableTheme | null; onChange: (theme: TableTheme | null) => void }) {
  const { t } = useLocaleContext();
  const chip = (selected: boolean) =>
    [
      "shrink-0 rounded-full border px-3 py-1.5 text-sm transition",
      // Filled when selected: not colour alone (some themes' gold is near-white).
      selected
        ? "border-gold bg-gold font-medium text-ink-950"
        : "border-ink-border text-parchment-dim hover:border-gold/50 hover:text-gold",
    ].join(" ");
  return (
    <div role="group" aria-label={t.tables.themeFilterLabel} className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
      <div className="flex gap-2 pb-1 lg:flex-wrap">
        <button type="button" aria-pressed={value === null} onClick={() => onChange(null)} className={chip(value === null)}>
          {t.tables.allThemes}
        </button>
        {TABLE_THEMES.map((theme) => (
          <button
            key={theme}
            type="button"
            aria-pressed={value === theme}
            onClick={() => onChange(value === theme ? null : theme)}
            className={chip(value === theme)}
          >
            {t.tables.themes[theme]}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * A block of tables (yours, or one game's) that folds away. While
 * searching or filtering it only shows the tables that match.
 */
function FoldingSection({
  title,
  note,
  count,
  open,
  onToggle,
  children,
}: {
  title: string;
  note?: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const { t } = useLocaleContext();
  return (
    <section className="rounded-2xl border border-ink-border bg-ink-900/40">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-2xl p-4 text-left transition hover:bg-ink-800/40"
      >
        <IconChevronRight
          size={16}
          className={`shrink-0 text-gold transition-transform ${open ? "rotate-90" : ""}`}
        />
        <span className="min-w-0 flex-1">
          <span className="block font-display text-lg leading-snug text-parchment">{title}</span>
          {note && <span className="mt-0.5 block text-xs text-parchment-dim">{note}</span>}
        </span>
        <span className="shrink-0 text-xs text-parchment-dim/60">
          {interpolate(t.tables.sectionCount, { count })}
        </span>
      </button>
      {open && <div className="px-3 pb-3 sm:px-4 sm:pb-4">{children}</div>}
    </section>
  );
}

function InspirationCard({
  last,
  rolling,
  activeAdventure,
  onRoll,
  onSaveConsequence,
}: {
  last: LastResult | null;
  rolling: boolean;
  activeAdventure: Adventure | null;
  onRoll: () => void;
  onSaveConsequence: (rollId: string, text: string) => void;
}) {
  const { t } = useLocaleContext();
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (last) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [last]);

  return (
    <section className="rounded-2xl border border-gold/40 bg-gold/[0.06] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <IconSparkles size={20} className="mt-0.5 shrink-0 text-gold" />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg leading-snug text-parchment">{t.tables.inspirationTitle}</h2>
          <p className="mt-0.5 text-sm text-parchment-dim">{t.tables.inspirationDescription}</p>
        </div>
        <button
          type="button"
          onClick={onRoll}
          disabled={rolling}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gold px-3.5 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-gold-soft active:scale-95 disabled:opacity-60"
        >
          <IconDice size={17} className={rolling ? "animate-spin" : ""} />
          {t.tables.inspirationButton}
        </button>
      </div>
      {last && (
        <div ref={resultRef} className="mt-4 scroll-mb-24 lg:hidden">
          <ResultPanel
            key={last.rollId}
            last={last}
            activeAdventure={activeAdventure}
            onSaveConsequence={onSaveConsequence}
            inline
          />
        </div>
      )}
    </section>
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
  menu,
}: {
  table: MeaningTable;
  last: LastResult | null;
  rolling: boolean;
  favorite: boolean;
  activeAdventure: Adventure | null;
  onRoll: () => void;
  onToggleFavorite: () => void;
  onSaveConsequence: (rollId: string, text: string) => void;
  /** Options of the player's own tables (edit, export…). */
  menu: ReactNode;
}) {
  const { t } = useLocaleContext();
  const resultRef = useRef<HTMLDivElement>(null);

  // On phones the result opens below the row: bring it into view.
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
          {table.description && <p className="mt-0.5 text-sm text-parchment-dim">{table.description}</p>}
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
      {/* Across the card's full width, not under the description: otherwise
          fitting on one line depended on how long the range was. */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
        <GameBadge table={table} />
        <TableEntriesButton table={table} />
        {menu && <div className="ml-auto">{menu}</div>}
      </div>

      {last && (
        <div ref={resultRef} className="mt-4 scroll-mb-24 lg:hidden">
          <ResultPanel
            key={last.rollId}
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
            {inline && last.total !== undefined ? interpolate(t.tables.resultLabel, { n: last.total }) : last.title}
          </span>
          <span className="shrink-0">
            {last.detail}
            {!inline && last.total !== undefined && ` → ${last.total}`}
          </span>
        </div>
        <p className={inline ? "mt-2 text-parchment" : "mt-3 text-lg font-medium leading-snug text-parchment"}>
          {last.text}
        </p>
      </div>

      {activeAdventure && (
        <ConsequenceComposer
          onSave={(text) => onSaveConsequence(last.rollId, text)}
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
  const credit = [
    table.game.author && `${t.tables.authorLabel}: ${table.game.author}`,
    table.game.license && `${t.tables.licenseLabel}: ${table.game.license}`,
  ].filter(Boolean);

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
        {/* The table's real range: a d66 goes from 11 to 66, not 1 to 66. */}
        <span className="text-parchment-dim/60">
          · {table.entries[0]?.range[0]}–{table.entries.at(-1)?.range[1]}
        </span>
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
          {credit.length > 0 && <p className="-mt-1 mb-3 text-xs text-parchment-dim">{credit.join(" · ")}</p>}
          <ul className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
            {table.entries.map((entry) => (
              <li
                key={`${entry.range[0]}-${entry.range[1]}`}
                className="flex gap-3 rounded-xl border border-ink-border/70 bg-ink-900/50 px-3 py-2 text-sm"
              >
                <span className="shrink-0 font-display text-parchment-dim">{formatRange(entry.range)}</span>
                <span className="text-parchment/90">{entry.text}</span>
              </li>
            ))}
          </ul>
        </Modal>
      )}
    </>
  );
}
