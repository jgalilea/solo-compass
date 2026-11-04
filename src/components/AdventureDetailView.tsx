import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDismiss } from "../hooks/useDismiss";
import { useJournalContext } from "../hooks/useJournalContext";
import { useHistoryContext } from "../hooks/useHistoryContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { interpolate } from "../lib/i18n";
import { exportAdventureToMarkdown, type JournalEntry } from "../lib/lonelog";
import { ActionMenu } from "./ActionMenu";
import { ConfirmDialog } from "./ConfirmDialog";
import { JournalComposer } from "./JournalComposer";
import { DiceTool, OracleTool, TableTool } from "./PlayTools";
import { EmptyState, LoadingState } from "./StateViews";
import { Toast } from "./Toast";
import { EntryList, LineButtons, SessionGroupRow, type EntryActions } from "./journalShared";
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
  IconChevronRight,
  IconDice,
  IconDownload,
  IconJournal,
  IconOracle,
  IconPause,
  IconPencil,
  IconPlay,
  IconSession,
  IconStar,
  IconTable,
  IconTrash,
} from "./icons/Icons";

/**
 * Una aventura: su diario y la "mesa de juego" para seguir jugándola.
 *
 * - Móvil/tablet: una sola columna para el diario, con el composer de
 *   una fila al pie; oráculo, tablas y dados se abren en una hoja.
 * - Escritorio (lg): el diario en el centro y la mesa siempre abierta a
 *   la derecha, sin hojas. Desde xl, a la izquierda, el índice de
 *   sesiones para saltar entre ellas.
 *
 * Las sesiones van en orden cronológico, como el propio diario: las
 * anteriores, plegadas, arriba; la actual (la última) abierta debajo,
 * con su título fijo arriba al hacer scroll.
 */
export function AdventureDetailView() {
  const { adventureId = "" } = useParams<{ adventureId: string }>();
  const navigate = useNavigate();
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

  // La sesión actual es la última: siempre abierta. Las anteriores
  // (y el "prólogo" sin sesión, si lo hay) van plegadas encima.
  const currentGroup = groups.at(-1) ?? null;
  const previousGroups = groups.slice(0, -1);

  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [previousExpanded, setPreviousExpanded] = useState(false);
  // Un solo id "en edición" a la vez para toda la pantalla (título de
  // sesión o cualquier entrada), y uno "seleccionado" (táctil: muestra
  // sus botones) — abrir uno cierra el que hubiera.
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [sessionTitleEditValue, setSessionTitleEditValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [exportedFilename, setExportedFilename] = useState<string | null>(null);
  const [deletedEntry, setDeletedEntry] = useState<JournalEntry | null>(null);

  // Composer: el tipo y la tirada a la que enlazar la consecuencia viven
  // aquí porque también los cambia el panel de escritorio.
  const [composerMode, setComposerMode] = useState<ComposerMode>("note");
  const [linkedRollId, setLinkedRollId] = useState<string | undefined>(undefined);
  const composerInputRef = useRef<HTMLTextAreaElement>(null);

  // Respuesta del oráculo de cada tirada enlazada, para pintarla con
  // su color en el diario (Sí/No/Contradicción).
  const answersByRollId = useMemo(() => {
    const map = new Map<string, (typeof historyEntries)[number] & { kind: "oraculo" }>();
    for (const h of historyEntries) if (h.kind === "oraculo") map.set(h.id, h);
    return map;
  }, [historyEntries]);

  // Borrar no pide confirmación: se deshace desde el aviso (el último
  // borrado; uno nuevo sustituye al anterior).
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
  };

  // Tocar fuera de cualquier entrada quita la selección.
  useEffect(() => {
    if (!selectedEntryId) return;
    function handlePointerDown(e: PointerEvent) {
      if (!(e.target as Element).closest?.("[data-entry]")) setSelectedEntryId(null);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [selectedEntryId]);

  // Al apuntar algo se baja hasta ello para que se vea el resultado. Es
  // un ref (no estado): solo marca que la próxima entrada nueva viene
  // del composer o de la mesa, sin provocar un render extra.
  const listEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const scrollPendingRef = useRef(false);
  useEffect(() => {
    if (!scrollPendingRef.current) return;
    scrollPendingRef.current = false;
    const end = listEndRef.current;
    if (!end) return;
    // Se mide el composer cada vez en lugar de usar un margen fijo: su
    // alto cambia (p. ej. en escritorio no lleva herramientas).
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
    // Aventura inexistente (id inválido, o borrada mientras estaba
    // abierta en otra pestaña) — de vuelta a la lista en vez de
    // enseñar una pantalla rota.
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

  function handleLogged() {
    if (composerMode !== "consequence") setLinkedRollId(undefined);
    scrollPendingRef.current = true;
  }

  // Tras una tirada (oráculo, tabla o dados) lo siguiente suele ser
  // apuntar qué pasa: el composer pasa solo a "Consecuencia".
  function handleRolled(rollId?: string) {
    setComposerMode("consequence");
    setLinkedRollId(rollId);
    scrollPendingRef.current = true;
    // En táctil no se enfoca: abriría el teclado encima del resultado
    // que se acaba de apuntar, justo cuando se quiere leer.
    if (window.matchMedia("(pointer: fine)").matches) {
      window.setTimeout(() => composerInputRef.current?.focus(), 0);
    }
  }

  // Saltar a una sesión desde el índice (index: posición en `groups`;
  // la última es la actual). Se despliega con flushSync para que ya
  // esté pintada al llevarla a la vista.
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

  // Sin sesiones no hay índice: el diario ocupa también su columna en
  // vez de dejar un hueco vacío a la izquierda.
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
              {/* Con una sola sesión no hay adónde saltar. */}
              {groups.length > 1 && <SessionMenu groups={groups} onJump={jumpToSession} className="xl:hidden" />}
              {/* Todo lo poco frecuente, agrupado, para que la cabecera
                  quepa en una línea y no compita con lo que se usa al jugar. */}
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
                  { label: t.journal.exportButton, Icon: IconDownload, onSelect: handleExport },
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
                  // Fijo arriba al hacer scroll: siempre se sabe en qué
                  // sesión se está escribiendo.
                  <div
                    data-entry
                    onClick={() =>
                      setSelectedEntryId((id) => (id === currentGroup.sessionEntry!.id ? null : currentGroup.sessionEntry!.id))
                    }
                    className="group sticky top-0 z-20 -mx-4 bg-ink-950/90 px-4 py-1.5 backdrop-blur sm:mx-0 sm:px-0 lg:top-14"
                  >
                    <div className="relative flex items-center gap-2 rounded-xl border border-gold/30 bg-gold/[0.06] px-4 py-2.5">
                      <IconSession size={15} className="shrink-0 text-gold" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium uppercase tracking-wide text-parchment">
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
              <ul className="flex flex-col gap-2">
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

      {/* Escritorio: la mesa siempre abierta, sin hojas que tapen nada. */}
      <aside
        aria-label={t.journal.playPanelLabel}
        className="sticky top-14 hidden max-h-[calc(100dvh-3.5rem)] flex-col gap-6 overflow-y-auto overscroll-contain py-8 pr-1 lg:col-start-2 lg:flex xl:col-start-3"
      >
        <PanelSection Icon={IconOracle} title={t.journal.toolOracleTitle}>
          <OracleTool adventureId={adventure.id} onRolled={handleRolled} />
        </PanelSection>
        <PanelSection Icon={IconTable} title={t.journal.toolTableTitle}>
          <TableTool adventureId={adventure.id} onRolled={handleRolled} />
        </PanelSection>
        <PanelSection Icon={IconDice} title={t.journal.toolDiceTitle}>
          <DiceTool adventureId={adventure.id} onRolled={handleRolled} />
        </PanelSection>
      </aside>

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

/** Índice de sesiones (escritorio ancho): salta a cada una. */
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
 * El mismo índice donde no cabe una columna para él (móvil, tablet y
 * escritorio estrecho): un botón en la cabecera que lo despliega.
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
    // Sin "relative" en móvil: el desplegable toma el ancho de la
    // cabecera en vez de salirse por la izquierda desde el botón.
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
