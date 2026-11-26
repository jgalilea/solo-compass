import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { TABLE_THEMES, type MeaningTable, type TableTheme } from "../lib/tables";
import { loadFavoriteTableIds, saveFavoriteTableIds } from "../lib/tableFavorites";
import { loadOpenTableSections, saveOpenTableSections } from "../lib/tableSections";
import { gameOfTable, TABLE_GAMES } from "../lib/tableGames";
import { type CustomTable, type CustomTableDraft } from "../lib/customTables";
import { exportTableToMarkdown } from "../lib/customTableText";
import { fileProblemText, inspectFile } from "../lib/fileImport";
import { offerFiles } from "../lib/incomingFiles";
import { loadSearchResults, matchingEntries, saveSearchResults } from "../lib/tableSearch";
import { Switch } from "./Switch";
import type { ImportTablesState } from "./IncomingFileDialog";
import { useCustomTablesContext } from "../hooks/useCustomTablesContext";
import { useJournalContext } from "../hooks/useJournalContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { useMeaningTables } from "../hooks/useMeaningTables";
import { usePlayActions } from "../hooks/usePlayActions";
import { readTableDice } from "../lib/rolledDice";
import { interpolate } from "../lib/i18n";
import { downloadTextFile, sanitizeFilename } from "../lib/journalUi";
import { canShare, shareTextFile } from "../lib/share";
import { PAGE_CLASS } from "../lib/pageLayout";
import { normalizeForSearch } from "../lib/text";
import { ActionMenu } from "./ActionMenu";
import { EmptyState } from "./StateViews";
import { Toast } from "./Toast";
import {
  IconAlertCircle,
  IconDownload,
  IconPencil,
  IconPlus,
  IconSearch,
  IconShare,
  IconStar,
  IconTable,
  IconTrash,
  IconUpload,
} from "./icons/Icons";
import { InspirationCard } from "./InspirationCard";
import { PageHeader } from "./PageHeader";
import { FoldingSection, SectionList, TableSection, ThemeFilter } from "./TableSections";
import { TableRow } from "./TableRow";
import { ResultPanel, type LastResult } from "./TableResultPanel";
import { RecentRolls } from "./RecentRolls";
import { GeneratorRow } from "./GeneratorRow";
import { useGeneratorsContext } from "../hooks/useGeneratorsContext";
import { generatorGames, generatorTables, type Generator, type GeneratorDraft } from "../lib/generators";

const INSPIRATION_ID = "inspiration";

/** Tables side by side where each keeps room for its description. */
const TABLE_GRID = "grid gap-2.5 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 4xl:grid-cols-3";

// The editors load when opened: they're a good part of the main bundle otherwise.
const TableEditorDialog = lazy(() => import("./TableEditorDialog").then((m) => ({ default: m.TableEditorDialog })));
const GeneratorEditorDialog = lazy(() =>
  import("./GeneratorEditorDialog").then((m) => ({ default: m.GeneratorEditorDialog })),
);

type ToastState =
  | { kind: "deleted"; table: CustomTable; index: number }
  | { kind: "generatorDeleted"; generator: Generator }
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
  const { rollTable, rollInspiration, rollGenerator, addConsequence } = usePlayActions();
  const {
    generators,
    load: loadGenerators,
    addGenerator,
    updateGenerator,
    removeGenerator,
    restoreGenerator,
  } = useGeneratorsContext();
  useEffect(() => loadGenerators(), [loadGenerators]);
  const [generatorEditor, setGeneratorEditor] = useState<{ id?: string; draft?: GeneratorDraft } | null>(null);
  const {
    status: customStatus,
    tables: customTables,
    addTables,
    updateTable,
    removeTable,
    restoreTable,
  } = useCustomTablesContext();
  const { t } = useLocaleContext();
  const [last, setLast] = useState<LastResult | null>(null);
  const [rollingId, setRollingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() =>
    loadFavoriteTableIds(),
  );
  const [openSections, setOpenSections] = useState<Set<string>>(() => loadOpenTableSections());
  const [themeFilter, setThemeFilter] = useState<TableTheme | null>(null);
  // Off until turned on: a word turns up in the results of many tables.
  const [searchResults, setSearchResults] = useState(loadSearchResults);
  function toggleSearchResults(on: boolean) {
    setSearchResults(on);
    saveSearchResults(on);
  }
  const q = normalizeForSearch(query.trim());
  // Searching or filtering by theme looks through every game at once.
  const filtering = !!q || themeFilter !== null;
  // Each game is loaded only when needed: Solo Compass's (quick
  // inspiration), unfolded blocks, the favourites' games, and all of
  // them while searching or filtering.
  const { all, blocks, custom, inspiration, retry } = useMeaningTables(
    filtering
      ? "all"
      : [
          "solo-compass",
          ...TABLE_GAMES.filter((g) => openSections.has(g.id)).map((g) => g.id),
          ...[...favoriteIds].map(gameOfTable).filter((id) => id !== undefined),
          // What the generators roll on.
          ...generatorGames(generators),
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
      const entry = rollTable(table, undefined, all);
      return {
        sourceId: table.id,
        rollId: entry.id,
        title: entry.tableName,
        detail: table.dice,
        total: entry.total,
        text: entry.resultText,
        dice: readTableDice(`${table.dice}=${entry.total}`),
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
        rollIds: rolled.rollIds,
        title: t.tables.inspirationName,
        detail: rolled.detail,
        text: rolled.text,
        dice: readTableDice(rolled.detail),
      };
    });
  }

  function handleGenerator(generator: Generator) {
    const tables = generatorTables(generator, all);
    if (tables.length === 0) return;
    withRollPause(generatorSource(generator), () => {
      const rolled = rollGenerator(generator.name, tables, undefined, all);
      return {
        sourceId: generatorSource(generator),
        rollId: rolled.id,
        rollIds: rolled.rollIds,
        title: generator.name,
        detail: rolled.detail,
        text: rolled.text,
        dice: readTableDice(rolled.detail),
      };
    });
  }

  function saveGenerator(draft: GeneratorDraft) {
    if (generatorEditor?.id) updateGenerator(generatorEditor.id, draft);
    else addGenerator(draft);
    setGeneratorEditor(null);
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

  // Looked at first (fileImport.ts): a backup picked here by mistake
  // goes to the dialog that restores it.
  async function handleImportFile(file: File) {
    const found = await inspectFile(t, file, "tables");
    if (found.kind === "tables") importDrafts(found.drafts);
    else if (found.kind === "problem") setToast({ kind: "message", title: fileProblemText(t, found.problem), error: true });
    else offerFiles([file], "button");
  }

  function importDrafts(drafts: CustomTableDraft[]) {
    // A single table opens in the editor, to review it before saving.
    if (drafts.length === 1) setEditor({ draft: drafts[0] });
    else {
      addTables(drafts);
      setToast({ kind: "message", title: interpolate(t.tables.importedCount, { count: drafts.length }) });
    }
  }

  // Tables from a file dropped on the window or shared to the app
  // (IncomingFileDialog), once the player's own are in.
  const location = useLocation();
  const navigate = useNavigate();
  const handed = (location.state as Partial<ImportTablesState> | null)?.importTables;
  useEffect(() => {
    if (!handed || customStatus !== "ready") return;
    navigate(".", { replace: true, state: null });
    importDrafts(handed.drafts);
    // importDrafts is only ever this render's: nothing else to follow.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [handed, customStatus]);

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
  // its results if asked; within the chosen theme (the player's own
  // only if they gave it one).
  const matches = useCallback(
    (table: MeaningTable) =>
      (themeFilter === null || table.theme === themeFilter) &&
      (!q ||
        normalizeForSearch(table.name).includes(q) ||
        normalizeForSearch(table.description).includes(q) ||
        normalizeForSearch(table.game.name).includes(q) ||
        (!!table.theme && normalizeForSearch(t.tables.themes[table.theme]).includes(q)) ||
        (searchResults && matchingEntries(table, q, 1).length > 0)),
    [q, themeFilter, t, searchResults],
  );
  const favoriteTables = useMemo(
    () => [...custom, ...builtIn].filter((x) => favoriteIds.has(x.id) && matches(x)),
    [custom, builtIn, favoriteIds, matches],
  );
  const otherCustom = custom.filter((x) => !favoriteIds.has(x.id) && matches(x));
  const otherBlocks = blocks.map((b) => ({ ...b, tables: b.tables.filter((x) => !favoriteIds.has(x.id) && matches(x)) }));
  // While searching or filtering, a game without matches is left out once it's loaded.
  const shownBlocks = otherBlocks.filter((block) => !filtering || block.status !== "ready" || block.tables.length > 0);
  // Only once every game has been searched: not while one is still loading.
  const nothingFound =
    filtering &&
    blocks.every((b) => b.status === "ready" || b.status === "error") &&
    favoriteTables.length + otherCustom.length + otherBlocks.reduce((n, b) => n + b.tables.length, 0) === 0;

  // A block's tables, under a sub-heading per theme (when it has several
  // and no theme is chosen). Tables without one (the player's own) go last.
  function renderTables(tables: MeaningTable[], sameGame = true) {
    const groups = [...TABLE_THEMES, undefined]
      .map((theme) => ({ theme, tables: tables.filter((x) => x.theme === theme) }))
      .filter((g) => g.tables.length > 0);
    const rows = (list: MeaningTable[]) => <ul className={TABLE_GRID}>{list.map((table) => renderRow(table, !sameGame))}</ul>;
    if (groups.length <= 1) return rows(tables);
    return (
      <div className="flex flex-col gap-5">
        {groups.map((g) => (
          <div key={g.theme ?? "none"} className="flex flex-col gap-3">
            <h4 className="flex items-center gap-2 px-1 text-xs font-medium uppercase tracking-wide text-parchment-dim">
              {g.theme ? t.tables.themes[g.theme] : t.tables.editor.themeNone}
              <span className="text-parchment-faint">{g.tables.length}</span>
            </h4>
            {rows(g.tables)}
          </div>
        ))}
      </div>
    );
  }

  // Which game a table is from is only said where they mix (favourites).
  function renderRow(table: MeaningTable, showGame: boolean) {
    return (
      <TableRow
        key={table.id}
        table={table}
        showGame={showGame}
        last={last?.sourceId === table.id ? last : null}
        rolling={rollingId === table.id}
        favorite={favoriteIds.has(table.id)}
        activeAdventure={activeAdventure}
        onRoll={() => handleRoll(table)}
        onToggleFavorite={() => toggleFavorite(table.id)}
        onSaveConsequence={addConsequence}
        found={searchResults && q ? matchingEntries(table, q, Infinity) : undefined}
        query={query.trim()}
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
    <div className={PAGE_CLASS}>
      <PageHeader title={t.tables.title} subtitle={t.tables.subtitle} />

      <div className="flex flex-col gap-5 md:gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] 2xl:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] 2xl:gap-10">
        <div className="flex min-w-0 flex-col gap-5 md:gap-6">
          <label className="relative block">
            <IconSearch
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-parchment-faint"
            />
            <input
              data-hotkey="write table"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.tables.searchPlaceholder}
              aria-label={t.tables.searchLabel}
              className="w-full rounded-2xl border border-ink-border bg-ink-900/70 py-2.5 pl-10 pr-4 text-parchment placeholder:text-parchment-faint focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
            />
          </label>

          <Switch checked={searchResults} onChange={toggleSearchResults} className="-mt-2 self-start md:-mt-3">
            {t.tables.searchResults}
          </Switch>

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

          {/* Phone and tablet: the latest table rolls before the list (on
              desktop they're under the result, in the right column). */}
          {!filtering && <RecentRolls kind="tabla" limit={3} className="lg:hidden" />}

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
                  <ul className={TABLE_GRID}>{favoriteTables.map((table) => renderRow(table, true))}</ul>
                </TableSection>
              )}

              {/* Several tables in one roll. Like the player's tables: one
                  unfold away, and a line when folded. */}
              {(!filtering || otherCustom.length > 0) && (
                <SectionList title={t.tables.ownHeading}>
                  {!filtering && (
                    <FoldingSection
                      title={t.tables.generatorsHeading}
                      count={generators.length}
                      countText={interpolate(
                        generators.length === 1 ? t.tables.generatorCountOne : t.tables.generatorCount,
                        { count: generators.length },
                      )}
                      open={isOpen("generators")}
                      onToggle={() => toggleSection("generators")}
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="min-w-0 flex-1 text-sm text-parchment-dim">{t.tables.generatorsIntro}</p>
                          <button
                            type="button"
                            onClick={() => setGeneratorEditor({})}
                            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-gold/50 bg-gold/10 px-3 py-2 text-sm font-medium text-gold transition hover:bg-gold/20"
                          >
                            <IconPlus size={16} />
                            {t.tables.generatorNew}
                          </button>
                        </div>
                        {generators.length === 0 ? (
                          <p className="rounded-2xl border border-dashed border-ink-border px-4 py-3 text-sm text-parchment-dim">
                            {t.tables.generatorsEmpty}
                          </p>
                        ) : (
                          <ul className={TABLE_GRID}>
                            {generators.map((generator) => (
                              <GeneratorRow
                                key={generator.id}
                                generator={generator}
                                tables={generatorTables(generator, all)}
                                loading={generator.tableIds.some((id) => {
                                  const game = gameOfTable(id);
                                  return !!game && blocks.find((b) => b.id === game)?.status !== "ready";
                                })}
                                last={last?.sourceId === generatorSource(generator) ? last : null}
                                rolling={rollingId === generatorSource(generator)}
                                activeAdventure={activeAdventure}
                                onRoll={() => handleGenerator(generator)}
                                onEdit={() =>
                                  setGeneratorEditor({ id: generator.id, draft: { name: generator.name, tableIds: generator.tableIds } })
                                }
                                onDelete={() => {
                                  removeGenerator(generator.id);
                                  setToast({ kind: "generatorDeleted", generator });
                                }}
                                onSaveConsequence={addConsequence}
                              />
                            ))}
                          </ul>
                        )}
                      </div>
                    </FoldingSection>
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
                </SectionList>
              )}

              {shownBlocks.length > 0 && (
                <SectionList title={t.tables.gamesHeading}>
                  {shownBlocks.map(
                    (block) => (
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
                </SectionList>
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
          {/* As on the Oracle screen: the latest table rolls, and the full history. */}
          <RecentRolls kind="tabla" limit={5} className="mt-3" />
        </aside>
      </div>

      <Suspense fallback={null}>
        {editor && (
          <TableEditorDialog
            initial={editor.draft}
            editing={!!editor.id}
            onSave={saveEditor}
            onClose={() => setEditor(null)}
          />
        )}

        {generatorEditor && (
          <GeneratorEditorDialog
            initial={generatorEditor.draft}
            editing={!!generatorEditor.id}
            onSave={saveGenerator}
            onClose={() => setGeneratorEditor(null)}
          />
        )}
      </Suspense>

      {toast?.kind === "generatorDeleted" && (
        <Toast
          key={toast.generator.id}
          Icon={IconTrash}
          title={t.tables.generatorDeleted}
          closeLabel={t.common.close}
          action={{ label: t.common.undo, onClick: () => restoreGenerator(toast.generator) }}
          duration={6000}
          onDismiss={dismissToast}
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

/** The result panel's source for a generator (tables use their id). */
function generatorSource(generator: Generator): string {
  return `generator:${generator.id}`;
}
