import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useDismiss } from "../hooks/useDismiss";
import { useJournalContext } from "../hooks/useJournalContext";
import { useHistoryContext } from "../hooks/useHistoryContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { interpolate } from "../lib/i18n";
import { exportAdventureToMarkdown, type JournalEntry } from "../lib/lonelog";
import { searchEntries } from "../lib/journalSearch";
import { canShare, shareTextFile } from "../lib/share";
import { AdventureStatsDialog } from "./AdventureStatsDialog";
import { ActionMenu } from "./ActionMenu";
import { ConfirmDialog } from "./ConfirmDialog";
import { JournalComposer } from "./JournalComposer";
import { DiceTool, OracleTool, TableTool } from "./PlayTools";
import { EmptyState, LoadingState } from "./StateViews";
import { Toast } from "./Toast";
import { EntryList, LineButtons, SearchResultList, SessionGroupRow, type EntryActions } from "./journalShared";
import {
  downloadTextFile,
  groupBySession,
  INPUT_CLASS,
  PRIMARY_BUTTON_CLASS,
  sanitizeFilename,
  type ComposerMode,
  type EntryGroup,
} from "../lib/journalUi";
import {
  IconArchive,
  IconArchiveRestore,
  IconArrowLeft,
  IconChart,
  IconChevronRight,
  IconClose,
  IconDice,
  IconDownload,
  IconJournal,
  IconOracle,
  IconPause,
  IconPencil,
  IconPlay,
  IconSearch,
  IconSession,
  IconShare,
  IconStar,
  IconTable,
  IconTrash,
} from "./icons/Icons";

/**
 * One adventure: its journal and the "game table" to keep playing it.
 *
 * - Phone/tablet: a single column for the journal, with the one-row
 *   composer at the bottom; oracle, tables and dice open in a sheet.
 * - Desktop (lg): the journal in the middle and the table always open
 *   on the right, no sheets. From xl, on the left, the session index
 *   to jump between them.
 *
 * Sessions are in chronological order, like the journal itself: the
 * earlier ones folded at the top; the current one (the last) open
 * below, with its title pinned at the top while scrolling.
 */
export function AdventureDetailView() {
  const { adventureId = "" } = useParams<{ adventureId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLocaleContext();
  const {
    status,
    adventures,
    entries,
    activeAdventureId,
    setActiveAdventureId,
    renameAdventure,
    deleteAdventure,
    toggleAdventureFavorite,
    setAdventureStatus,
    removeEntry,
    restoreEntry,
    editEntry,
  } = useJournalContext();
  const { entries: historyEntries } = useHistoryContext();

  const adventure = adventures.find((c) => c.id === adventureId) ?? null;
  const isActive = adventureId === activeAdventureId;

  const adventureEntries = useMemo(
    () =>
      entries
        .filter((e) => e.adventureId === adventureId)
        .sort((a, b) => a.timestamp - b.timestamp),
    [entries, adventureId],
  );
  const groups = useMemo(() => groupBySession(adventureEntries), [adventureEntries]);

  // The current session is the last one: always open. The earlier ones
  // (and the session-less "prologue", if any) are folded above it.
  const currentGroup = groups.at(-1) ?? null;
  const previousGroups = groups.slice(0, -1);

  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [previousExpanded, setPreviousExpanded] = useState(false);
  // A single "editing" id at a time for the whole screen (session title
  // or any entry), and one "selected" (touch: shows its buttons) —
  // opening one closes whichever was open.
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [sessionTitleEditValue, setSessionTitleEditValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [exportedFilename, setExportedFilename] = useState<string | null>(null);
  const [deletedEntry, setDeletedEntry] = useState<JournalEntry | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Composer: the entry kind and the roll a consequence links to live
  // here because the desktop panel changes them too.
  const [composerMode, setComposerMode] = useState<ComposerMode>("note");
  const [linkedRollId, setLinkedRollId] = useState<string | undefined>(undefined);
  const composerInputRef = useRef<HTMLTextAreaElement>(null);

  // Oracle answer of each linked roll, to paint it in its colour in the
  // journal (Yes/No/Contradiction).
  const answersByRollId = useMemo(() => {
    const map = new Map<string, (typeof historyEntries)[number] & { kind: "oraculo" }>();
    for (const h of historyEntries) if (h.kind === "oraculo") map.set(h.id, h);
    return map;
  }, [historyEntries]);

  // Deleting doesn't ask for confirmation: it's undone from the toast
  // (the latest deletion; a new one replaces the previous).
  const deleteEntryWithUndo = useCallback(
    (id: string) => {
      const entry = entries.find((e) => e.id === id);
      removeEntry(id);
      setSelectedEntryId(null);
      if (entry) setDeletedEntry(entry);
    },
    [entries, removeEntry, setSelectedEntryId],
  );
  const dismissUndo = useCallback(() => setDeletedEntry(null), []);
  const dismissExported = useCallback(() => setExportedFilename(null), []);

  const entryActions: EntryActions = {
    onDelete: deleteEntryWithUndo,
    onEdit: editEntry,
    editingId: editingEntryId,
    onStartEdit: (id) => {
      setSelectedEntryId(null);
      setEditingEntryId(id);
    },
    onStopEdit: () => setEditingEntryId(null),
    selectedId: selectedEntryId,
    onSelect: setSelectedEntryId,
    answerFor: (rollId) => (rollId ? answersByRollId.get(rollId)?.answer : undefined),
    highlightedId,
  };

  const searchMatches = useMemo(
    () => (searchOpen ? searchEntries(adventureEntries, searchQuery, SEARCH_LIMIT + 1) : []),
    [searchOpen, adventureEntries, searchQuery],
  );

  // Jumping to an entry (from the search): its session is unfolded
  // first, and the scroll happens once it's painted (next effect).
  const pendingJumpRef = useRef<string | null>(null);
  const [jumpTick, setJumpTick] = useState(0);
  const highlightTimer = useRef<number | undefined>(undefined);
  const jumpToEntry = useCallback(
    (id: string) => {
      const index = groups.findIndex((g) => g.sessionEntry?.id === id || g.items.some((e) => e.id === id));
      if (index < 0) return;
      const group = groups[index];
      if (index < groups.length - 1) {
        setPreviousExpanded(true);
        if (group.sessionEntry) setExpandedSessions((prev) => new Set(prev).add(group.sessionEntry!.id));
      }
      setSearchOpen(false);
      setHighlightedId(id);
      window.clearTimeout(highlightTimer.current);
      highlightTimer.current = window.setTimeout(() => setHighlightedId(null), 2500);
      pendingJumpRef.current = id;
      setJumpTick((n) => n + 1);
    },
    [groups],
  );
  useEffect(() => {
    const id = pendingJumpRef.current;
    if (!id) return;
    pendingJumpRef.current = null;
    const el = document.getElementById(`entry-${id}`) ?? document.getElementById(`session-${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [jumpTick]);
  useEffect(() => () => window.clearTimeout(highlightTimer.current), []);

  // Coming from the journal list's search: go straight to that entry.
  const targetEntryId = (location.state as { entryId?: string } | null)?.entryId;
  const handledTargetRef = useRef<string | null>(null);
  useEffect(() => {
    if (status !== "ready" || !targetEntryId || handledTargetRef.current === targetEntryId) return;
    handledTargetRef.current = targetEntryId;
    jumpToEntry(targetEntryId);
  }, [status, targetEntryId, jumpToEntry]);

  // Tapping outside any entry clears the selection.
  useEffect(() => {
    if (!selectedEntryId) return;
    function handlePointerDown(e: PointerEvent) {
      if (!(e.target as Element).closest?.("[data-entry]")) setSelectedEntryId(null);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [selectedEntryId]);

  // After logging something we scroll down to it so the result is
  // visible. It's a ref (not state): it only marks that the next new
  // entry comes from the composer or the table, without an extra render.
  const listEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const scrollPendingRef = useRef(false);
  useEffect(() => {
    if (!scrollPendingRef.current) return;
    scrollPendingRef.current = false;
    const end = listEndRef.current;
    if (!end) return;
    // The composer is measured every time instead of using a fixed margin:
    // its height changes (e.g. on desktop it has no tools).
    const visibleBottom = composerRef.current?.getBoundingClientRect().top ?? window.innerHeight;
    const delta = end.getBoundingClientRect().top - (visibleBottom - 12);
    if (delta > 0) window.scrollBy({ top: delta, behavior: "smooth" });
  }, [adventureEntries.length]);

  if (status === "loading") {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-8 sm:py-12 md:max-w-3xl">
        <LoadingState label={t.journal.loading} />
      </div>
    );
  }

  if (!adventure) {
    // Missing adventure (invalid id, or deleted while open in another
    // tab) — back to the list instead of showing a broken screen.
    return (
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 py-8 text-center sm:py-12 md:max-w-3xl">
        <EmptyState
          icon={<IconJournal size={24} />}
          title={t.journal.noAdventuresTitle}
          action={
            <Link to="/diario" className={PRIMARY_BUTTON_CLASS}>
              {t.journal.backToList}
            </Link>
          }
        />
      </div>
    );
  }

  function startRename() {
    setRenameValue(adventure!.name);
    setRenaming(true);
  }

  function commitRename() {
    if (renameValue.trim()) renameAdventure(adventure!.id, renameValue);
    setRenaming(false);
  }

  function commitSessionTitleEdit() {
    if (currentGroup?.sessionEntry && sessionTitleEditValue.trim()) {
      editEntry(currentGroup.sessionEntry.id, sessionTitleEditValue.trim());
    }
    setEditingEntryId(null);
  }

  function handleExport() {
    const markdown = exportAdventureToMarkdown(t, adventure!.name, adventureEntries);
    const filename = `${sanitizeFilename(adventure!.name)}.md`;
    downloadTextFile(filename, markdown);
    setExportedFilename(filename);
  }

  // The same Lonelog .md as the export, through the system's share
  // sheet; if it fails (not just cancelled), it's downloaded instead.
  function handleShare() {
    const markdown = exportAdventureToMarkdown(t, adventure!.name, adventureEntries);
    shareTextFile(`${sanitizeFilename(adventure!.name)}.md`, markdown, adventure!.name).catch(handleExport);
  }

  function handleLogged() {
    if (composerMode !== "consequence") setLinkedRollId(undefined);
    scrollPendingRef.current = true;
  }

  // After a roll (oracle, table or dice) the next thing is usually to
  // write what happens: the composer switches to "Consequence" by itself.
  function handleRolled(rollId?: string) {
    setComposerMode("consequence");
    setLinkedRollId(rollId);
    scrollPendingRef.current = true;
    // No focus on touch: it would open the keyboard over the result that
    // was just logged, right when you want to read it.
    if (window.matchMedia("(pointer: fine)").matches) {
      window.setTimeout(() => composerInputRef.current?.focus(), 0);
    }
  }

  // Jump to a session from the index (index: position in `groups`; the
  // last one is the current one). It's expanded with flushSync so it's
  // already painted when scrolled into view.
  function jumpToSession(index: number) {
    const group = groups[index];
    if (!group) return;
    let target = group.sessionEntry?.id ?? "current";
    if (index < groups.length - 1) {
      flushSync(() => {
        setPreviousExpanded(true);
        if (group.sessionEntry) setExpandedSessions((prev) => new Set(prev).add(group.sessionEntry!.id));
      });
      if (!group.sessionEntry) target = "previous";
    }
    document.getElementById(`session-${target}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const isArchived = adventure.status === "archived";

  // No sessions, no index: the journal takes that column too instead of
  // leaving an empty gap on the left.
  const hasSessionIndex = groups.some((g) => g.sessionEntry);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 md:max-w-3xl lg:grid lg:max-w-7xl lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8 xl:grid-cols-[13rem_minmax(0,1fr)_21rem] 2xl:max-w-[110rem] 2xl:grid-cols-[16rem_minmax(0,1fr)_26rem] 2xl:gap-12">
      {hasSessionIndex && (
        <SessionIndex
          groups={groups}
          onJump={jumpToSession}
          className="hidden xl:flex"
        />
      )}

      <div
        className={`flex flex-1 flex-col gap-4 pt-5 sm:pt-8 lg:col-start-1 lg:min-h-[calc(100dvh-3.5rem)] ${hasSessionIndex ? "xl:col-start-2" : "xl:col-span-2"}`}
      >
        <div className="relative flex items-center gap-2">
          <Link
            to="/diario"
            aria-label={t.journal.backToList}
            className="-m-2 shrink-0 p-2 text-parchment-dim transition hover:text-gold"
          >
            <IconArrowLeft size={20} />
          </Link>
          {renaming ? (
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") setRenaming(false);
                }}
                placeholder={t.journal.renameAdventurePlaceholder}
                className={INPUT_CLASS}
              />
              <button type="button" onClick={commitRename} className={PRIMARY_BUTTON_CLASS}>
                {t.common.save}
              </button>
            </div>
          ) : (
            <>
              <h1 className="min-w-0 truncate font-display text-2xl text-parchment sm:text-3xl">
                {adventure.favorite && <IconStar size={16} filled className="mr-1.5 inline align-baseline text-gold" />}
                {adventure.name}
              </h1>
              {isActive ? (
                <span
                  title={interpolate(t.journal.activeAdventureNote, { name: adventure.name })}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs font-medium text-gold"
                >
                  <span className="size-1.5 rounded-full bg-gold" />
                  {t.journal.activeLabel}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveAdventureId(adventure.id)}
                  title={t.journal.activateHint}
                  className="flex shrink-0 items-center gap-1 rounded-full border border-ink-border px-2.5 py-1 text-xs font-medium text-parchment-dim transition hover:border-gold/50 hover:text-gold"
                >
                  <IconPlay size={13} />
                  {t.journal.setActive}
                </button>
              )}
              {isArchived && (
                <span className="shrink-0 rounded-full border border-ink-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-parchment-dim">
                  {t.journal.statusArchived}
                </span>
              )}
              <div className="ml-auto" />
              {adventureEntries.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSearchOpen((v) => !v)}
                  aria-label={t.journal.searchInJournal}
                  title={t.journal.searchInJournal}
                  aria-expanded={searchOpen}
                  className={[
                    "-m-1 shrink-0 rounded-full p-1.5 transition",
                    searchOpen ? "bg-ink-700 text-parchment" : "text-parchment-dim hover:text-gold",
                  ].join(" ")}
                >
                  <IconSearch size={21} />
                </button>
              )}
              {/* With a single session there's nowhere to jump to. */}
              {groups.length > 1 && <SessionMenu groups={groups} onJump={jumpToSession} className="xl:hidden" />}
              {/* Everything rarely used, grouped, so the header fits on one
                  line and doesn't compete with what's used while playing. */}
              <ActionMenu
                label={t.journal.moreActions}
                items={[
                  {
                    label: adventure.favorite ? t.journal.favoriteRemove : t.journal.favoriteAdd,
                    Icon: IconStar,
                    onSelect: () => toggleAdventureFavorite(adventure.id),
                  },
                  ...(isActive
                    ? [{ label: t.journal.unsetActive, Icon: IconPause, onSelect: () => setActiveAdventureId(null) }]
                    : []),
                  { label: t.journal.renameAdventure, Icon: IconPencil, onSelect: startRename },
                  { label: t.journal.statsButton, Icon: IconChart, onSelect: () => setStatsOpen(true) },
                  { label: t.journal.exportButton, Icon: IconDownload, onSelect: handleExport },
                  ...(canShare() ? [{ label: t.journal.shareButton, Icon: IconShare, onSelect: handleShare }] : []),
                  isArchived
                    ? {
                        label: t.journal.unarchiveAdventure,
                        Icon: IconArchiveRestore,
                        onSelect: () => setAdventureStatus(adventure.id, "ongoing"),
                      }
                    : {
                        label: t.journal.archiveAdventure,
                        Icon: IconArchive,
                        onSelect: () => setAdventureStatus(adventure.id, "archived"),
                      },
                  { label: t.journal.deleteAdventure, Icon: IconTrash, onSelect: () => setDeleting(true), danger: true },
                ]}
              />
            </>
          )}
        </div>

        {searchOpen && (
          <JournalSearchPanel
            query={searchQuery}
            onQueryChange={setSearchQuery}
            matches={searchMatches}
            onPick={(match) => jumpToEntry(match.entry.id)}
            onClose={() => setSearchOpen(false)}
          />
        )}

        {previousGroups.length > 0 && (
          <section id="session-previous" className="flex scroll-mt-16 flex-col gap-2">
            <button
              type="button"
              onClick={() => setPreviousExpanded((v) => !v)}
              aria-expanded={previousExpanded}
              aria-label={t.journal.togglePreviousSessions}
              className="flex items-center gap-2 py-1 text-xs font-medium uppercase tracking-wide text-parchment-dim transition hover:text-parchment"
            >
              <IconChevronRight
                size={14}
                className={`shrink-0 transition-transform ${previousExpanded ? "rotate-90" : ""}`}
              />
              {t.journal.previousSessionsHeading}
              <span className="text-parchment-dim/50">{previousGroups.length}</span>
            </button>
            {previousExpanded && (
              <ul className="flex flex-col gap-2">
                {previousGroups.map((group, i) =>
                  group.sessionEntry ? (
                    <SessionGroupRow
                      key={group.sessionEntry.id}
                      group={group}
                      expanded={expandedSessions.has(group.sessionEntry.id)}
                      onToggle={() =>
                        setExpandedSessions((prev) => {
                          const next = new Set(prev);
                          const id = group.sessionEntry!.id;
                          if (next.has(id)) next.delete(id);
                          else next.add(id);
                          return next;
                        })
                      }
                      toggleLabel={t.journal.toggleSession}
                      actions={entryActions}
                    />
                  ) : (
                    <Fragment key={`prologue-${i}`}>
                      <EntryList items={group.items} actions={entryActions} />
                    </Fragment>
                  ),
                )}
              </ul>
            )}
          </section>
        )}

        {adventureEntries.length === 0 ? (
          <EmptyState
            icon={<IconJournal size={22} />}
            title={t.journal.noEntriesTitle}
            description={t.journal.noEntriesDescription}
            compact
          />
        ) : (
          currentGroup && (
            <section id={`session-${currentGroup.sessionEntry?.id ?? "current"}`} className="flex scroll-mt-16 flex-col gap-2">
              {currentGroup.sessionEntry &&
                (editingEntryId === currentGroup.sessionEntry.id ? (
                  <div className="flex items-center gap-2 rounded-xl border border-gold/30 bg-ink-900 px-3 py-2">
                    <input
                      autoFocus
                      value={sessionTitleEditValue}
                      onChange={(e) => setSessionTitleEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitSessionTitleEdit();
                        if (e.key === "Escape") setEditingEntryId(null);
                      }}
                      className={`${INPUT_CLASS} bg-ink-800/70`}
                    />
                    <button type="button" onClick={commitSessionTitleEdit} className={PRIMARY_BUTTON_CLASS}>
                      {t.common.save}
                    </button>
                  </div>
                ) : (
                  // Pinned at the top while scrolling: you always know which
                  // session you're writing in.
                  <div
                    data-entry
                    onClick={() =>
                      setSelectedEntryId((id) => (id === currentGroup.sessionEntry!.id ? null : currentGroup.sessionEntry!.id))
                    }
                    className="group sticky top-0 z-20 -mx-4 bg-ink-950/90 px-4 py-1.5 backdrop-blur sm:mx-0 sm:px-0 lg:top-14"
                  >
                    <div className="relative flex items-center gap-2 rounded-xl border border-gold/50 bg-gold/10 px-4 py-2.5">
                      <IconSession size={16} className="shrink-0 text-gold" />
                      <span className="min-w-0 flex-1 truncate font-display text-base font-semibold tracking-wide text-parchment">
                        {currentGroup.sessionEntry.text}
                      </span>
                      <LineButtons
                        visible={selectedEntryId === currentGroup.sessionEntry.id}
                        onEdit={() => {
                          setSessionTitleEditValue(currentGroup.sessionEntry!.text);
                          entryActions.onStartEdit(currentGroup.sessionEntry!.id);
                        }}
                        onDelete={() => deleteEntryWithUndo(currentGroup.sessionEntry!.id)}
                      />
                    </div>
                  </div>
                ))}
              {/* The same rail as an unfolded earlier session. */}
              <ul className={currentGroup.sessionEntry ? "flex flex-col gap-2 border-l-2 border-gold/25 pl-2.5 sm:pl-3" : "flex flex-col gap-2"}>
                <EntryList items={currentGroup.items} actions={entryActions} />
              </ul>
            </section>
          )
        )}
        <div ref={listEndRef} className="-mt-4" />

        <JournalComposer
          ref={composerRef}
          inputRef={composerInputRef}
          adventureId={adventure.id}
          mode={composerMode}
          onModeChange={setComposerMode}
          linkedRollId={linkedRollId}
          onLogged={handleLogged}
          onRolled={handleRolled}
        />
      </div>

      {/* Desktop: the table always open, no sheets covering anything. */}
      <aside
        aria-label={t.journal.playPanelLabel}
        className="sticky top-14 hidden max-h-[calc(100dvh-3.5rem)] flex-col gap-6 overflow-y-auto overscroll-contain py-8 pr-1 lg:col-start-2 lg:flex xl:col-start-3"
      >
        <PanelSection Icon={IconOracle} title={t.journal.toolOracleTitle}>
          <OracleTool adventureId={adventure.id} onRolled={handleRolled} />
        </PanelSection>
        <PanelSection Icon={IconDice} title={t.journal.toolDiceTitle}>
          <DiceTool adventureId={adventure.id} onRolled={handleRolled} />
        </PanelSection>
        <PanelSection Icon={IconTable} title={t.journal.toolTableTitle}>
          <TableTool adventureId={adventure.id} onRolled={handleRolled} />
        </PanelSection>
      </aside>

      {statsOpen && (
        <AdventureStatsDialog name={adventure.name} entries={adventureEntries} onClose={() => setStatsOpen(false)} />
      )}

      {deleting && (
        <ConfirmDialog
          title={interpolate(t.journal.deleteAdventureConfirmTitle, { name: adventure.name })}
          description={t.journal.deleteAdventureConfirmDescription}
          confirmLabel={t.journal.deleteAdventureConfirmButton}
          onConfirm={() => {
            deleteAdventure(adventure.id);
            setDeleting(false);
            navigate("/diario");
          }}
          onCancel={() => setDeleting(false)}
        />
      )}

      {deletedEntry ? (
        <Toast
          key={deletedEntry.id}
          Icon={IconTrash}
          title={t.journal.entryDeleted}
          closeLabel={t.common.close}
          action={{ label: t.common.undo, onClick: () => restoreEntry(deletedEntry) }}
          duration={6000}
          onDismiss={dismissUndo}
        />
      ) : (
        exportedFilename && (
          <Toast
            title={interpolate(t.journal.exportedToastTitle, { filename: exportedFilename })}
            description={t.journal.exportedToastDescription}
            closeLabel={t.common.close}
            onDismiss={dismissExported}
          />
        )
      )}
    </div>
  );
}

const SEARCH_LIMIT = 50;

/** Search inside the adventure, below its header; picking a result jumps to it. */
function JournalSearchPanel({
  query,
  onQueryChange,
  matches,
  onPick,
  onClose,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  /** Up to SEARCH_LIMIT + 1, to know whether there are more. */
  matches: ReturnType<typeof searchEntries>;
  onPick: (match: ReturnType<typeof searchEntries>[number]) => void;
  onClose: () => void;
}) {
  const { t } = useLocaleContext();
  const q = query.trim();
  const shown = matches.slice(0, SEARCH_LIMIT);
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
              : matches.length > SEARCH_LIMIT
                ? interpolate(t.journal.searchMoreResults, { count: SEARCH_LIMIT })
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

function PanelSection({
  Icon,
  title,
  children,
}: {
  Icon: typeof IconOracle;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-parchment-dim">
        <Icon size={15} className="text-gold" />
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Session index (wide desktop): jumps to each session. */
function SessionIndex({
  groups,
  onJump,
  className,
}: {
  groups: EntryGroup[];
  onJump: (index: number) => void;
  className: string;
}) {
  const { t } = useLocaleContext();
  return (
    <nav
      aria-label={t.journal.sessionsHeading}
      className={`${className} sticky top-14 max-h-[calc(100dvh-3.5rem)] flex-col gap-2 overflow-y-auto py-8`}
    >
      <h2 className="flex items-center gap-2 px-3 text-xs font-medium uppercase tracking-wide text-parchment-dim">
        <IconSession size={15} className="text-gold" />
        {t.journal.sessionsHeading}
      </h2>
      <SessionList groups={groups} onJump={onJump} />
    </nav>
  );
}

/**
 * The same index where there's no room for a column (phone, tablet and
 * narrow desktop): a button in the header that drops it down.
 */
function SessionMenu({
  groups,
  onJump,
  className,
}: {
  groups: EntryGroup[];
  onJump: (index: number) => void;
  className: string;
}) {
  const { t } = useLocaleContext();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useDismiss(open, rootRef, () => setOpen(false));

  return (
    // No "relative" on phones: the dropdown takes the header's width
    // instead of overflowing to the left from the button.
    <div ref={rootRef} className={`${className} shrink-0 sm:relative`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t.journal.sessionsHeading}
        title={t.journal.sessionsHeading}
        aria-haspopup="true"
        aria-expanded={open}
        className={[
          "-m-1 rounded-full p-1.5 transition",
          open ? "bg-ink-700 text-parchment" : "text-parchment-dim hover:text-gold",
        ].join(" ")}
      >
        <IconSession size={21} />
      </button>
      {open && (
        <nav
          aria-label={t.journal.sessionsHeading}
          className="animate-fade-up absolute inset-x-0 top-full z-40 mt-2 flex max-h-[60dvh] flex-col overflow-y-auto overscroll-contain rounded-2xl border border-ink-border bg-ink-800 p-1.5 shadow-2xl sm:left-auto sm:w-72"
        >
          <SessionList
            groups={groups}
            onJump={(i) => {
              setOpen(false);
              onJump(i);
            }}
          />
        </nav>
      )}
    </div>
  );
}

function SessionList({ groups, onJump }: { groups: EntryGroup[]; onJump: (index: number) => void }) {
  const { t } = useLocaleContext();
  const last = groups.length - 1;
  return (
    <ul className="flex flex-col gap-0.5">
      {groups.map((g, i) => (
        <li key={g.sessionEntry?.id ?? `prologue-${i}`}>
          <button
            type="button"
            onClick={() => onJump(i)}
            aria-current={i === last ? "true" : undefined}
            className={[
              "flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm transition hover:bg-ink-700/60",
              i === last ? "font-medium text-gold" : "text-parchment-dim hover:text-parchment",
            ].join(" ")}
          >
            <span className="min-w-0 flex-1 truncate">{g.sessionEntry?.text ?? t.journal.prologueLabel}</span>
            <span className="shrink-0 text-xs text-parchment-dim/50">{g.items.length}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
