import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useJournalContext } from "../hooks/useJournalContext";
import { useHistoryContext } from "../hooks/useHistoryContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { interpolate } from "../lib/i18n";
import { exportAdventureToMarkdown, type JournalEntry } from "../lib/lonelog";
import { ADVENTURE_SEARCH_LIMIT, searchEntries } from "../lib/journalSearch";
import { buildCast } from "../lib/lonelogTags";
import { exportAdventureToHtml } from "../lib/htmlExport";
import { readExportTheme } from "../lib/htmlExportTheme";
import { shareTextFile } from "../lib/share";
import { AdventureNotebook } from "./AdventureNotebook";
import { AdventureStatsDialog } from "./AdventureStatsDialog";
import { AdventureHeader } from "./AdventureHeader";
import { ConfirmDialog } from "./ConfirmDialog";
import { JournalComposer } from "./JournalComposer";
import { DialogBody, DialogHeader } from "./Dialog";
import { Modal } from "./Modal";
import { DiceTool, OracleTool, TableTool } from "./PlayTools";
import { EmptyState, LoadingState } from "./StateViews";
import { Toast } from "./Toast";
import { JournalSearchPanel } from "./JournalSearchPanel";
import { EntryList, LineButtons, SessionGroupRow, type EntryActions } from "./journalShared";
import { SessionIndex } from "./SessionNavigation";
import {
  downloadTextFile,
  groupBySession,
  INPUT_CLASS,
  PRIMARY_BUTTON_CLASS,
  sanitizeFilename,
  type ComposerMode,
} from "../lib/journalUi";
import {
  IconChevronRight,
  IconDice,
  IconJournal,
  IconNotebook,
  IconOracle,
  IconSession,
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
 *   to jump between them and the notebook (pinned notes, characters
 *   and places); below xl the notebook is a sheet from the header.
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
    deleteAdventure,
    setAdventureNotes,
    setCastDescription,
    addEntry,
    removeEntry,
    restoreEntry,
    editEntry,
    moveEntry,
    insertionPoint,
    setInsertionPoint,
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

  // "Write below" an entry: new entries go after it instead of at the
  // end (see useJournal). Only while on this screen; at the last entry
  // it's just the end again.
  const insertAfter =
    insertionPoint?.adventureId === adventureId
      ? adventureEntries.find((e) => e.id === insertionPoint.afterId)
      : undefined;
  const inserting = !!insertAfter && insertAfter !== adventureEntries.at(-1);
  useEffect(() => {
    if (insertionPoint && !inserting) setInsertionPoint(null);
  }, [insertionPoint, inserting, setInsertionPoint]);
  useEffect(() => () => setInsertionPoint(null), [adventureId, setInsertionPoint]);
  const cast = useMemo(() => buildCast(adventureEntries), [adventureEntries]);

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
  const [deleting, setDeleting] = useState(false);
  const [exportedFilename, setExportedFilename] = useState<string | null>(null);
  const [deletedEntry, setDeletedEntry] = useState<JournalEntry | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [notebookOpen, setNotebookOpen] = useState(false);
  // The character/place chip last tapped in the journal; the tick makes
  // tapping the same one again scroll to it again.
  const [castFocus, setCastFocus] = useState<{ key: string | null; tick: number }>({ key: null, tick: 0 });

  // Composer: the entry kind and the roll a consequence links to live
  // here because the desktop panel changes them too.
  const [composerMode, setComposerMode] = useState<ComposerMode>("note");
  const [linkedRollId, setLinkedRollId] = useState<string | undefined>(undefined);
  const composerInputRef = useRef<HTMLTextAreaElement>(null);
  // An entry to keep in sight once the journal repaints (moved, or the
  // latest one written below another): its session is unfolded first.
  const revealRef = useRef<string | null>(null);
  // Set by the composer: adds text (a "Mention" from the notebook) to what's being written.
  const composerInsertRef = useRef<((text: string) => void) | null>(null);

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
    cast,
    onMove: (id, direction) => {
      moveEntry(id, direction);
      revealRef.current = id;
    },
    canMove: (id, direction) => {
      const index = adventureEntries.findIndex((e) => e.id === id);
      return direction === "up" ? index > 0 : index < adventureEntries.length - 1;
    },
    onInsertBelow: (id) => {
      const entry = adventureEntries.find((e) => e.id === id);
      setSelectedEntryId(null);
      setInsertionPoint({ adventureId, afterId: id });
      // A consequence written there joins that roll, not the latest one.
      setLinkedRollId(entry?.kind === "roll" ? entry.linkedRollId : undefined);
      if (window.matchMedia("(pointer: fine)").matches) composerInputRef.current?.focus();
    },
    onTagClick: (key) => {
      setCastFocus((prev) => ({ key, tick: prev.tick + 1 }));
      // From xl the notebook is always visible in the left column.
      if (!window.matchMedia("(min-width: 80rem)").matches) setNotebookOpen(true);
    },
  };

  const searchMatches = useMemo(
    () => (searchOpen ? searchEntries(adventureEntries, searchQuery, ADVENTURE_SEARCH_LIMIT + 1) : []),
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

  // Runs again after unfolding, when the entry is finally on screen.
  useEffect(() => {
    const id = revealRef.current === INSERTION ? insertionPoint?.afterId : revealRef.current;
    if (!id) return;
    const index = groups.findIndex((g) => g.sessionEntry?.id === id || g.items.some((e) => e.id === id));
    const group = groups[index];
    if (!group) {
      revealRef.current = null;
      return;
    }
    const sessionId = group.sessionEntry?.id;
    if (index < groups.length - 1 && (!previousExpanded || (sessionId && !expandedSessions.has(sessionId)))) {
      setPreviousExpanded(true);
      if (sessionId) setExpandedSessions((prev) => new Set(prev).add(sessionId));
      return;
    }
    revealRef.current = null;
    const el = document.getElementById(`entry-${id}`) ?? document.getElementById(`session-${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [groups, previousExpanded, expandedSessions, insertionPoint]);

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

  function commitSessionTitleEdit() {
    if (currentGroup?.sessionEntry && sessionTitleEditValue.trim()) {
      editEntry(currentGroup.sessionEntry.id, sessionTitleEditValue.trim());
    }
    setEditingEntryId(null);
  }

  function handleExport() {
    const markdown = exportAdventureToMarkdown(t, adventure!.name, adventureEntries, adventure!.notes, adventure!.descriptions);
    const filename = `${sanitizeFilename(adventure!.name)}.md`;
    downloadTextFile(filename, markdown);
    setExportedFilename(filename);
  }

  // A page to read or share, in the theme on screen (htmlExport.ts).
  async function handleExportHtml() {
    const html = exportAdventureToHtml({
      t,
      name: adventure!.name,
      entries: adventureEntries,
      notes: adventure!.notes,
      descriptions: adventure!.descriptions,
      theme: await readExportTheme(),
      answerFor: entryActions.answerFor,
    });
    const filename = `${sanitizeFilename(adventure!.name)}.html`;
    downloadTextFile(filename, html, "text/html");
    setExportedFilename(filename);
  }

  // The same Lonelog .md as the export, through the system's share
  // sheet; if it fails (not just cancelled), it's downloaded instead.
  function handleShare() {
    const markdown = exportAdventureToMarkdown(t, adventure!.name, adventureEntries, adventure!.notes, adventure!.descriptions);
    shareTextFile(`${sanitizeFilename(adventure!.name)}.md`, markdown, adventure!.name).catch(handleExport);
  }

  // Written below an entry: what's kept in sight is that spot, not the end.
  function keepInSight() {
    if (inserting) revealRef.current = INSERTION;
    else scrollPendingRef.current = true;
  }

  function handleLogged() {
    if (composerMode !== "consequence") setLinkedRollId(undefined);
    keepInSight();
  }

  // After a roll (oracle, table or dice) the next thing is usually to
  // write what happens: the composer switches to "Consequence" by itself.
  function handleRolled(rollId?: string) {
    setComposerMode("consequence");
    setLinkedRollId(rollId);
    keepInSight();
    // No focus on touch: it would open the keyboard over the result that
    // was just logged, right when you want to read it.
    if (window.matchMedia("(pointer: fine)").matches) {
      window.setTimeout(() => composerInputRef.current?.focus(), 0);
    }
  }

  function moveCurrentSession(direction: "up" | "down") {
    moveEntry(currentGroup!.sessionEntry!.id, direction);
    revealRef.current = currentGroup!.sessionEntry!.id;
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

  const hasSessionIndex = groups.some((g) => g.sessionEntry);

  const notebook = (
    <AdventureNotebook
      notes={adventure.notes ?? ""}
      onNotesChange={(notes) => setAdventureNotes(adventure.id, notes)}
      descriptions={adventure.descriptions ?? {}}
      onDescriptionChange={(key, text) => setCastDescription(adventure.id, key, text)}
      entries={adventureEntries}
      focusKey={castFocus.key}
      focusTick={castFocus.tick}
      onJump={(id) => {
        setNotebookOpen(false);
        jumpToEntry(id);
      }}
      onMention={(text) => {
        setNotebookOpen(false);
        composerInsertRef.current?.(text);
      }}
      onLog={(text) => {
        addEntry(adventure.id, "note", text);
        handleLogged();
      }}
      onRoll={(text) => {
        // Like any roll: the sheet closes so the result is in sight,
        // and the composer moves on to "Consequence".
        addEntry(adventure.id, "roll", text);
        setNotebookOpen(false);
        handleRolled();
      }}
    />
  );

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 md:max-w-3xl lg:grid lg:max-w-7xl lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8 xl:grid-cols-[13rem_minmax(0,1fr)_21rem] 2xl:max-w-[110rem] 2xl:grid-cols-[16rem_minmax(0,1fr)_26rem] 2xl:gap-12">
      {/* Wide desktop: sessions and notebook in their own column. Padded on
          both sides: it scrolls, so a selected item's ring would be clipped. */}
      <aside className="sticky top-14 hidden max-h-[calc(100dvh-3.5rem)] flex-col gap-8 overflow-y-auto overscroll-contain px-1 py-8 xl:flex">
        {hasSessionIndex && <SessionIndex groups={groups} onJump={jumpToSession} />}
        {notebook}
      </aside>

      <div className="flex flex-1 flex-col gap-4 pt-5 sm:pt-8 lg:col-start-1 lg:min-h-[calc(100dvh-3.5rem)] xl:col-start-2">
        <AdventureHeader
          adventure={adventure}
          isActive={isActive}
          hasEntries={adventureEntries.length > 0}
          searchOpen={searchOpen}
          onToggleSearch={() => setSearchOpen((v) => !v)}
          notebookOpen={notebookOpen}
          onOpenNotebook={() => setNotebookOpen(true)}
          groups={groups}
          onJumpToSession={jumpToSession}
          onStats={() => setStatsOpen(true)}
          onExport={handleExport}
          onExportHtml={() => void handleExportHtml()}
          onShare={handleShare}
          onDelete={() => setDeleting(true)}
        />

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
                        onMoveUp={
                          adventureEntries[0] !== currentGroup.sessionEntry ? () => moveCurrentSession("up") : undefined
                        }
                        onMoveDown={
                          adventureEntries.at(-1) !== currentGroup.sessionEntry ? () => moveCurrentSession("down") : undefined
                        }
                        onInsertBelow={() => entryActions.onInsertBelow!(currentGroup.sessionEntry!.id)}
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
          insertRef={composerInsertRef}
          adventureId={adventure.id}
          mode={composerMode}
          onModeChange={setComposerMode}
          linkedRollId={linkedRollId}
          insertAfter={inserting ? insertAfter : undefined}
          onInsertDone={() => {
            setInsertionPoint(null);
            setLinkedRollId(undefined);
            scrollPendingRef.current = false;
            listEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
          }}
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

      {notebookOpen && (
        <Modal
          sheet
          onClose={() => setNotebookOpen(false)}
          label={t.notebook.title}
          size="lg"
        >
          <DialogHeader title={t.notebook.title} Icon={IconNotebook} onClose={() => setNotebookOpen(false)} />
          <DialogBody>{notebook}</DialogBody>
        </Modal>
      )}

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

/** revealRef: the entry being written below, whatever its id is by then. */
const INSERTION = "insertion";

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

