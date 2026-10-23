import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useJournalContext } from "../hooks/useJournalContext";
import { useHistoryContext } from "../hooks/useHistoryContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { interpolate } from "../lib/i18n";
import { exportAdventureToMarkdown } from "../lib/lonelog";
import { ActionMenu } from "./ActionMenu";
import { ConfirmDialog } from "./ConfirmDialog";
import { JournalComposer } from "./JournalComposer";
import { EmptyState, LoadingState } from "./StateViews";
import { Toast } from "./Toast";
import { EntryList, SessionGroupRow, type EntryActions } from "./journalShared";
import {
  downloadTextFile,
  groupBySession,
  INPUT_CLASS,
  PRIMARY_BUTTON_CLASS,
  sanitizeFilename,
  SECONDARY_BUTTON_CLASS,
} from "../lib/journalUi";
import {
  IconArchive,
  IconArchiveRestore,
  IconArrowLeft,
  IconCheck,
  IconChevronRight,
  IconDownload,
  IconJournal,
  IconPencil,
  IconPlay,
  IconPlus,
  IconStar,
  IconTrash,
} from "./icons/Icons";

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
    addEntry,
    removeEntry,
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
  const lastSessionId = useMemo(() => {
    const last = groups.findLast((g) => g.sessionEntry);
    return last?.sessionEntry?.id ?? null;
  }, [groups]);

  // La sesión actual (la última creada, o el "prólogo" si aún no hay
  // ninguna sesión) se pinta siempre primero y siempre expandida —
  // así nunca hay que bajar entre sesiones ya cerradas para llegar a
  // ella. El resto vive en "Sesiones anteriores", colapsado.
  const currentGroupIndex = useMemo(() => {
    if (lastSessionId) return groups.findIndex((g) => g.sessionEntry?.id === lastSessionId);
    return groups.length > 0 ? groups.length - 1 : -1;
  }, [groups, lastSessionId]);
  const currentGroup = currentGroupIndex >= 0 ? groups[currentGroupIndex] : null;
  const previousGroups = groups.filter((_, i) => i !== currentGroupIndex);

  const [manualOverrides, setManualOverrides] = useState<Map<string, boolean>>(new Map());

  function isSessionExpanded(id: string): boolean {
    return manualOverrides.get(id) ?? false;
  }

  function toggleSession(id: string) {
    setManualOverrides((prev) => {
      const next = new Map(prev);
      next.set(id, !isSessionExpanded(id));
      return next;
    });
  }

  const [previousExpanded, setPreviousExpanded] = useState(false);
  // Un solo id "en edición" a la vez para toda la pantalla (título de
  // sesión o cualquier entrada) — abrir uno cierra cualquier otro que
  // estuviera abierto, en vez de permitir varios formularios a la vez.
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [sessionTitleEditValue, setSessionTitleEditValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [exportedFilename, setExportedFilename] = useState<string | null>(null);

  const [sessionTitle, setSessionTitle] = useState("");
  const [showNewSession, setShowNewSession] = useState(false);

  // Respuesta del oráculo de cada tirada enlazada, para pintarla con
  // su color en el diario (Sí/No/Contradicción).
  const answersByRollId = useMemo(() => {
    const map = new Map<string, (typeof historyEntries)[number] & { kind: "oraculo" }>();
    for (const h of historyEntries) if (h.kind === "oraculo") map.set(h.id, h);
    return map;
  }, [historyEntries]);

  const entryActions: EntryActions = {
    onDelete: removeEntry,
    onEdit: editEntry,
    editingId: editingEntryId,
    onStartEdit: setEditingEntryId,
    onStopEdit: () => setEditingEntryId(null),
    answerFor: (rollId) => (rollId ? answersByRollId.get(rollId)?.answer : undefined),
  };

  // Al apuntar algo desde el panel de abajo, se baja hasta ello para
  // que se vea el resultado (si no, en móvil queda tapado por el panel).
  // Es un ref (no estado): solo marca que la próxima entrada nueva
  // viene del panel, sin provocar un render extra.
  const listEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const scrollPendingRef = useRef(false);
  useEffect(() => {
    if (!scrollPendingRef.current) return;
    scrollPendingRef.current = false;
    const end = listEndRef.current;
    if (!end) return;
    // El panel cambia de alto según el modo (los dados de "Tirada", una
    // pista de dos líneas…), así que se mide en cada vez en lugar de
    // usar un margen fijo: con uno fijo, la entrada recién apuntada
    // quedaba a veces tapada justo por la parte que importa.
    const visibleBottom = composerRef.current?.getBoundingClientRect().top ?? window.innerHeight;
    const delta = end.getBoundingClientRect().top - (visibleBottom - 12);
    window.scrollBy({ top: delta, behavior: "smooth" });
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

  function handleAddSession() {
    const title = sessionTitle.trim() || new Date().toLocaleDateString();
    addEntry(adventure!.id, "session", title);
    setSessionTitle("");
    setShowNewSession(false);
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

  const isArchived = adventure.status === "archived";
  // "Pausada" no es un estado guardado: es solo cómo se ve cualquier
  // aventura en curso que no es la activa ahora mismo.
  const isPaused = !isArchived && !isActive;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 pt-8 sm:py-12 md:max-w-3xl lg:pb-0">
      <div className="flex items-center gap-1">
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
            <h1 className="min-w-0 flex-1 truncate font-display text-2xl text-parchment sm:text-3xl">
              {adventure.name}
            </h1>
            <button
              type="button"
              onClick={() => toggleAdventureFavorite(adventure.id)}
              aria-pressed={adventure.favorite}
              aria-label={adventure.favorite ? t.journal.favoriteRemove : t.journal.favoriteAdd}
              className={[
                "-m-1 shrink-0 p-1.5 transition",
                adventure.favorite ? "text-gold" : "text-parchment-dim/50 hover:text-gold",
              ].join(" ")}
            >
              <IconStar size={20} filled={adventure.favorite} />
            </button>
            {/* Acciones poco frecuentes agrupadas, para que la cabecera
                no compita con lo que se usa al jugar. */}
            <ActionMenu
              label={t.journal.moreActions}
              items={[
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

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <button
          type="button"
          onClick={() => setActiveAdventureId(isActive ? null : adventure.id)}
          aria-pressed={isActive}
          aria-label={isActive ? t.journal.unsetActive : t.journal.setActive}
          title={isActive ? t.journal.unsetActive : t.journal.setActive}
          className={[
            "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition",
            isActive
              ? "border-gold/50 bg-gold/10 text-gold"
              : "border-ink-border text-parchment-dim hover:border-gold/50 hover:text-gold",
          ].join(" ")}
        >
          {isActive ? <IconCheck size={16} /> : <IconPlay size={16} />}
          {isActive ? t.journal.activeLabel : t.journal.setActive}
        </button>
        {(isPaused || isArchived) && (
          <span className="rounded-full border border-ink-border px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-parchment-dim">
            {isArchived ? t.journal.statusArchived : t.journal.statusPaused}
          </span>
        )}
        <p className={`min-w-0 basis-full text-sm sm:basis-auto sm:flex-1 ${isActive ? "text-gold/80" : "text-parchment-dim/70"}`}>
          {isActive
            ? interpolate(t.journal.activeAdventureNote, { name: adventure.name })
            : !isArchived && t.journal.activateHint}
        </p>
      </div>

      {adventureEntries.length === 0 ? (
        <EmptyState
          icon={<IconJournal size={22} />}
          title={t.journal.noEntriesTitle}
          description={t.journal.noEntriesDescription}
          compact
        />
      ) : (
        currentGroup && (
          <ul className="flex flex-col gap-2">
            {currentGroup.sessionEntry ? (
              <li className="flex flex-col gap-2">
                {editingEntryId === currentGroup.sessionEntry.id ? (
                  <div className="flex items-center gap-2 rounded-xl border border-gold/30 bg-gold/[0.05] px-4 py-2.5">
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
                  <div className="group flex items-center gap-2 rounded-xl border border-gold/30 bg-gold/[0.05] px-4 py-3">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium uppercase tracking-wide text-parchment">
                      {currentGroup.sessionEntry.text}
                    </span>
                    <span className="shrink-0 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-gold">
                      {t.journal.currentSessionBadge}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSessionTitleEditValue(currentGroup.sessionEntry!.text);
                        setEditingEntryId(currentGroup.sessionEntry!.id);
                      }}
                      aria-label={t.journal.editEntry}
                      className="-m-1 shrink-0 p-1.5 text-parchment-dim/50 transition hover:text-gold"
                    >
                      <IconPencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeEntry(currentGroup.sessionEntry!.id)}
                      aria-label={t.journal.deleteEntry}
                      className="-m-1 shrink-0 p-1.5 text-parchment-dim/50 transition hover:text-no"
                    >
                      <IconTrash size={15} />
                    </button>
                  </div>
                )}
                <ul className="flex flex-col gap-2 pl-1">
                  <EntryList items={currentGroup.items} actions={entryActions} />
                </ul>
              </li>
            ) : (
              <EntryList items={currentGroup.items} actions={entryActions} />
            )}
          </ul>
        )
      )}
      <div ref={listEndRef} className="-mt-5" />

      {showNewSession ? (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={sessionTitle}
            onChange={(e) => setSessionTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddSession();
              if (e.key === "Escape") setShowNewSession(false);
            }}
            placeholder={t.journal.newSessionPlaceholder}
            className={INPUT_CLASS}
          />
          <button type="button" onClick={handleAddSession} className={SECONDARY_BUTTON_CLASS}>
            {t.common.save}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowNewSession(true)}
          className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-ink-border py-2.5 text-sm text-parchment-dim transition hover:border-gold/50 hover:text-gold"
        >
          <IconPlus size={15} />
          {t.journal.newSessionButton}
        </button>
      )}

      {previousGroups.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => setPreviousExpanded((v) => !v)}
            aria-expanded={previousExpanded}
            aria-label={t.journal.togglePreviousSessions}
            className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-parchment-dim transition hover:text-parchment"
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
                    expanded={isSessionExpanded(group.sessionEntry.id)}
                    onToggle={() => toggleSession(group.sessionEntry!.id)}
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

      <JournalComposer ref={composerRef} adventureId={adventure.id} onLogged={() => {
          scrollPendingRef.current = true;
        }} />

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

      {exportedFilename && (
        <Toast
          title={interpolate(t.journal.exportedToastTitle, { filename: exportedFilename })}
          description={t.journal.exportedToastDescription}
          closeLabel={t.common.close}
          onDismiss={() => setExportedFilename(null)}
        />
      )}
    </div>
  );
}
