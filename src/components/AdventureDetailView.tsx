import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useJournalContext } from "../hooks/useJournalContext";
import { isTypingTarget } from "../hooks/useHotkeys";
import { useHistoryContext } from "../hooks/useHistoryContext";
import { revealElement, scrollBehaviorFor, smoothBehavior } from "../lib/scrolling";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { interpolate } from "../lib/i18n";
import { exportAdventureToMarkdown, sectionToLonelog, type JournalEntry } from "../lib/lonelog";
import { ADVENTURE_SEARCH_LIMIT, searchEntries } from "../lib/journalSearch";
import { buildCast, castKey, combineSteps, renameInEntry } from "../lib/lonelogTags";
import { exportAdventureToHtml } from "../lib/htmlExport";
import { readExportTheme } from "../lib/htmlExportTheme";
import { copyText, shareTextFile } from "../lib/share";
import { AdventureNotebook } from "./AdventureNotebook";
import { AdventureStatsDialog } from "./AdventureStatsDialog";
import { AdventureHeader } from "./AdventureHeader";
import { ConfirmDialog } from "./ConfirmDialog";
import { JournalComposer } from "./JournalComposer";
import { DialogBody, DialogHeader } from "./Dialog";
import { Modal } from "./Modal";
import { DiceTool, OracleTool, TableTool } from "./PlayTools";
import { FoldingHeading } from "./FoldingHeading";
import { loadFoldedNotebookSections, toggleFoldedNotebookSection, type PlayToolBlock } from "../lib/notebookSections";
import { EmptyState, LoadingState } from "./StateViews";
import { Toast } from "./Toast";
import { JournalSearchPanel } from "./JournalSearchPanel";
import { EntryList, LineButtons, SESSION_BAR, SESSION_RAIL, SessionDate, SessionGroupRow, type EntryActions } from "./journalShared";
import { SessionIndex } from "./SessionNavigation";
import {
  downloadTextFile,
  filterGroups,
  groupBySession,
  INPUT_CLASS,
  PRIMARY_BUTTON_CLASS,
  sanitizeFilename,
  type ComposerMode,
} from "../lib/journalUi";
import {
  IconCheck,
  IconChevronRight,
  IconClose,
  IconDice,
  IconFilter,
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
/** How long after a −/+ the next one on the same element still joins it. */
const STEP_JOIN_MS = 5 * 60_000;

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

  // "Show their entries" from the notebook: the journal shows only what's
  // about one element until the filter is taken off.
  const [journalFilter, setJournalFilter] = useState<string | null>(null);
  const filterMember = journalFilter ? (cast.find((c) => c.key === journalFilter) ?? null) : null;
  const filtered = useMemo(() => (filterMember ? filterGroups(groups, filterMember) : null), [groups, filterMember]);

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
  // Ctrl/Cmd+Z: the toast's "Undo", while it's there (a text field keeps
  // its own undo).
  useEffect(() => {
    if (!deletedEntry) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== "z" || !(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey || isTypingTarget(e.target)) return;
      e.preventDefault();
      restoreEntry(deletedEntry!);
      setDeletedEntry(null);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [deletedEntry, restoreEntry]);
  // Any other short notice (renamed, copied), maybe with an action.
  const [notice, setNotice] = useState<{ key: number; title: string; action?: { label: string; onClick: () => void } } | null>(null);
  const dismissNotice = useCallback(() => setNotice(null), []);

  // A session, a scene or the whole adventure as Lonelog, to paste elsewhere.
  function copyToClipboard(text: string, done: string) {
    void copyText(text).then((ok) => setNotice({ key: Date.now(), title: ok ? done : t.journal.copyFailed }));
  }
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
    anchorId: inserting ? insertAfter.id : null,
    cast,
    onMove: (id, direction) => {
      moveEntry(id, direction);
      revealRef.current = id;
    },
    // Asked by every entry drawn: only the first and last can't move
    // (no search through thousands of entries each time).
    canMove: (id, direction) =>
      adventureEntries.length > 0 &&
      id !== (direction === "up" ? adventureEntries[0] : adventureEntries[adventureEntries.length - 1]).id,
    onInsertBelow: (id) => {
      const entry = adventureEntries.find((e) => e.id === id);
      setSelectedEntryId(null);
      setInsertionPoint({ adventureId, afterId: id });
      // A consequence written there joins that roll, not the latest one.
      setLinkedRollId(entry?.kind === "roll" ? entry.linkedRollId : undefined);
      if (window.matchMedia("(pointer: fine)").matches) composerInputRef.current?.focus();
    },
    onCopy: (id) => copyToClipboard(sectionToLonelog(adventureEntries, id), t.journal.copiedSection),
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
      setJournalFilter(null);
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
    revealElement(el, "center");
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
    if (delta > 0) window.scrollBy({ top: delta, behavior: scrollBehaviorFor(delta) });
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
    revealElement(el, "nearest");
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
    const markdown = exportAdventureToMarkdown(t, adventure!.name, adventureEntries, adventure!.notes, adventure!.descriptions, adventure!);
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
    const markdown = exportAdventureToMarkdown(t, adventure!.name, adventureEntries, adventure!.notes, adventure!.descriptions, adventure!);
    shareTextFile(`${sanitizeFilename(adventure!.name)}.md`, markdown, adventure!.name).catch(handleExport);
  }

  // Written below an entry: what's kept in sight is that spot, not the end.
  function keepInSight() {
    if (inserting) revealRef.current = INSERTION;
    else scrollPendingRef.current = true;
  }

  function handleLogged() {
    // What was just written shows in the whole journal, not hidden by a filter.
    setJournalFilter(null);
    if (composerMode !== "consequence") setLinkedRollId(undefined);
    keepInSight();
  }

  // After a roll (oracle, table or dice) the next thing is usually to
  // write what happens: the composer switches to "Consequence" by itself.
  function handleRolled(rollId?: string) {
    setJournalFilter(null);
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
    if (filtered) flushSync(() => setJournalFilter(null));
    if (index < groups.length - 1) {
      flushSync(() => {
        setPreviousExpanded(true);
        if (group.sessionEntry) setExpandedSessions((prev) => new Set(prev).add(group.sessionEntry!.id));
      });
      if (!group.sessionEntry) target = "previous";
    }
    document.getElementById(`session-${target}`)?.scrollIntoView({ behavior: smoothBehavior(), block: "start" });
  }

  const hasSessionIndex = groups.some((g) => g.sessionEntry || g.items.some((e) => e.kind === "scene"));

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
      onRename={(member, name) => {
        // Every entry that names it, rewritten; Undo puts them back.
        const before = adventureEntries.filter((e) => renameInEntry(e, member, name) !== e.text);
        for (const e of before) editEntry(e.id, renameInEntry(e, member, name));
        const description = adventure.descriptions?.[member.key];
        const newKey = castKey(member.kind, name);
        if (description?.text && newKey !== member.key) {
          setCastDescription(adventure.id, newKey, description.text);
          setCastDescription(adventure.id, member.key, "");
        }
        setNotice({
          key: Date.now(),
          title: interpolate(t.notebook.renamed, { name: name.trim(), count: before.length }),
          action: {
            label: t.common.undo,
            onClick: () => {
              for (const e of before) editEntry(e.id, e.text);
              if (description?.text && newKey !== member.key) {
                setCastDescription(adventure.id, member.key, description.text);
                setCastDescription(adventure.id, newKey, "");
              }
            },
          },
        });
      }}
      onFilter={(key) => {
        setNotebookOpen(false);
        setSearchOpen(false);
        setJournalFilter(key);
        window.scrollTo({ top: 0, behavior: smoothBehavior() });
      }}
      onLog={(text, step) => {
        // −/+ in a row on the same clock or quantity: one entry, not one
        // per tap (only at the end of the journal, and only shortly after).
        const last = adventureEntries.at(-1);
        const combined =
          step && !inserting && last?.kind === "note" && Date.now() - (last.editedAt ?? last.timestamp) < STEP_JOIN_MS
            ? combineSteps(last.text, text)
            : null;
        if (combined === "") removeEntry(last!.id);
        else if (combined !== null) editEntry(last!.id, combined);
        else addEntry(adventure.id, "note", text);
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
      <aside className="sticky top-14 hidden max-h-[calc(100dvh-3.5rem)] flex-col gap-8 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] px-1 py-8 xl:flex">
        {hasSessionIndex && <SessionIndex groups={groups} onJump={jumpToSession} onJumpToEntry={jumpToEntry} />}
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
          onJumpToEntry={jumpToEntry}
          onStats={() => setStatsOpen(true)}
          onExport={handleExport}
          onCopy={() =>
            copyToClipboard(
              exportAdventureToMarkdown(t, adventure.name, adventureEntries, adventure.notes, adventure.descriptions, adventure),
              t.journal.copiedAdventure,
            )
          }
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

        {filterMember && filtered && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-gold/50 bg-gold/10 px-3 py-2 text-sm text-parchment">
              <IconFilter size={16} className="shrink-0 text-gold" />
              <span className="min-w-0 flex-1">
                {interpolate(filtered.count === 1 ? t.journal.filterShowingOne : t.journal.filterShowing, {
                  name: filterMember.name,
                  count: filtered.count,
                })}
              </span>
              <button
                type="button"
                onClick={() => setJournalFilter(null)}
                aria-label={t.journal.filterClear}
                title={t.journal.filterClear}
                className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-gold transition hover:bg-gold/10"
              >
                <IconClose size={14} />
                <span className="max-sm:hidden">{t.journal.filterClear}</span>
              </button>
            </div>
            {filtered.groups.length === 0 ? (
              <p className="px-1 text-sm text-parchment-dim">{interpolate(t.journal.filterEmpty, { name: filterMember.name })}</p>
            ) : (
              filtered.groups.map((group, i) => (
                <section key={group.sessionEntry?.id ?? `prologue-${i}`} className="flex flex-col gap-2">
                  {group.sessionEntry && (
                    <div className={SESSION_BAR}>
                      <h2 className="flex h-12 flex-1 items-center gap-2 rounded-xl border border-ink-border px-4">
                        <IconSession size={16} className="shrink-0 text-gold" />
                        <span className="min-w-0 flex-1 truncate font-display text-base font-semibold tracking-wide text-parchment">
                          {group.sessionEntry.text}
                        </span>
                        <SessionDate session={group.sessionEntry} />
                      </h2>
                    </div>
                  )}
                  <ul className={group.sessionEntry ? SESSION_RAIL : "flex flex-col gap-2"}>
                    <EntryList items={group.items} actions={entryActions} />
                  </ul>
                </section>
              ))
            )}
          </div>
        )}

        {!filtered && previousGroups.length > 0 && (
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
              <span className="text-parchment-faint">{previousGroups.length}</span>
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

        {filtered ? null : adventureEntries.length === 0 ? (
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
                  // Pinned at the top while scrolling, like every
                  // session's bar: you always know which one you're in.
                  <div
                    data-entry
                    onClick={() =>
                      setSelectedEntryId((id) => (id === currentGroup.sessionEntry!.id ? null : currentGroup.sessionEntry!.id))
                    }
                    className={`group ${SESSION_BAR}`}
                  >
                    <div className="relative flex h-12 flex-1 items-center gap-2 rounded-xl border border-gold/50 bg-gold/10 px-4">
                      <IconSession size={16} className="shrink-0 text-gold" />
                      <h2 className="min-w-0 flex-1 truncate font-display text-base font-semibold tracking-wide text-parchment">
                        {currentGroup.sessionEntry.text}
                      </h2>
                      <SessionDate session={currentGroup.sessionEntry} />
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
                        onCopy={() => entryActions.onCopy!(currentGroup.sessionEntry!.id)}
                      />
                    </div>
                  </div>
                ))}
              {/* The same rail as an unfolded earlier session. */}
              <ul className={currentGroup.sessionEntry ? SESSION_RAIL : "flex flex-col gap-2"}>
                <EntryList items={currentGroup.items} actions={entryActions} />
              </ul>
            </section>
          )
        )}
        <div ref={listEndRef} className="-mt-4" />

        <JournalComposer
          key={adventure.id}
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
            revealElement(listEndRef.current, "end");
          }}
          onLogged={handleLogged}
          onRolled={handleRolled}
        />
      </div>

      {/* Desktop: the table always open, no sheets covering anything.
          It scrolls on its own, which clips what pokes out of it: the
          padding on the left (taken back by the negative margin) leaves
          room for the keyboard focus ring of what sits at its edge. */}
      <aside
        aria-label={t.journal.playPanelLabel}
        className="sticky top-14 hidden max-h-[calc(100dvh-3.5rem)] flex-col gap-6 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] -ml-1.5 py-8 pl-1.5 pr-1 lg:col-start-2 lg:flex xl:col-start-3"
      >
        <PanelSection id="oracleTool" Icon={IconOracle} title={t.journal.toolOracleTitle}>
          <OracleTool adventureId={adventure.id} onRolled={handleRolled} />
        </PanelSection>
        <PanelSection id="diceTool" Icon={IconDice} title={t.journal.toolDiceTitle}>
          <DiceTool adventureId={adventure.id} onRolled={handleRolled} />
        </PanelSection>
        <PanelSection id="tableTool" Icon={IconTable} title={t.journal.toolTableTitle}>
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
      ) : notice ? (
        <Toast
          key={notice.key}
          Icon={IconCheck}
          title={notice.title}
          closeLabel={t.common.close}
          action={notice.action}
          duration={notice.action ? 6000 : 3000}
          onDismiss={dismissNotice}
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

/**
 * One tool of the desktop game table, folded away under its heading by
 * whoever doesn't use it. Folded, it stays mounted (hidden), so the dice
 * waiting in the tray aren't lost.
 */
function PanelSection({
  id,
  Icon,
  title,
  children,
}: {
  id: PlayToolBlock;
  Icon: typeof IconOracle;
  title: string;
  children: ReactNode;
}) {
  const [folded, setFolded] = useState(() => loadFoldedNotebookSections().has(id));
  return (
    <section className="flex flex-col gap-3">
      <FoldingHeading
        Icon={Icon}
        title={title}
        folded={folded}
        onToggle={() => setFolded(toggleFoldedNotebookSection(id).has(id))}
      />
      <div hidden={folded} className="flex flex-col gap-3">
        {children}
      </div>
    </section>
  );
}

