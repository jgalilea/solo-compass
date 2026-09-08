import { Fragment, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useJournalContext } from "../hooks/useJournalContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { interpolate } from "../lib/i18n";
import { exportAdventureToMarkdown } from "../lib/lonelog";
import { ConfirmDialog } from "./ConfirmDialog";
import { DiceRoller } from "./DiceRoller";
import { EmptyState, LoadingState } from "./StateViews";
import { Toast } from "./Toast";
import { EntryRow, SessionGroupRow } from "./journalShared";
import {
  COMPOSER_KINDS,
  downloadTextFile,
  groupBySession,
  INPUT_CLASS,
  PRIMARY_BUTTON_CLASS,
  sanitizeFilename,
  SECONDARY_BUTTON_CLASS,
  type ComposerKind,
} from "../lib/journalUi";
import {
  IconArchive,
  IconArchiveRestore,
  IconArrowLeft,
  IconCheck,
  IconChevronRight,
  IconDownload,
  IconFeather,
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

  const [composerExpanded, setComposerExpanded] = useState(true);
  const [composerKind, setComposerKind] = useState<ComposerKind>("note");
  const [composerText, setComposerText] = useState("");
  const [sessionTitle, setSessionTitle] = useState("");
  const [showNewSession, setShowNewSession] = useState(false);

  const kindLabels: Record<ComposerKind, string> = {
    action: t.journal.kindAction,
    roll: t.journal.kindRoll,
    consequence: t.journal.kindConsequence,
    note: t.journal.kindNote,
  };

  // Una línea de contexto bajo los botones para que quede claro qué
  // es cada tipo sin añadir pasos — sobre todo "Tirada", que se
  // confunde fácil con las tiradas del oráculo/tablas (esas ya se
  // registran solas; esta es para las de tu propio sistema).
  const kindHints: Record<ComposerKind, string> = {
    action: t.journal.composerHintAction,
    roll: t.journal.composerHintRoll,
    consequence: t.journal.composerHintConsequence,
    note: t.journal.composerHintNote,
  };

  if (status === "loading") {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-8 sm:py-12">
        <LoadingState label={t.journal.loading} />
      </div>
    );
  }

  if (!adventure) {
    // Aventura inexistente (id inválido, o borrada mientras estaba
    // abierta en otra pestaña) — de vuelta a la lista en vez de
    // enseñar una pantalla rota.
    return (
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 py-8 text-center sm:py-12">
        <EmptyState
          icon={<IconFeather size={24} />}
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

  function handleAddEntry() {
    if (!composerText.trim()) return;
    addEntry(adventure!.id, composerKind, composerText.trim());
    setComposerText("");
  }

  // Encadena tiradas del roller genérico al texto ya escrito (p. ej.
  // "Ataque al orco" + tocar d20 -> "Ataque al orco d20 -> 14"), en
  // vez de sustituirlo, para poder ir añadiendo contexto y dados.
  function handleDiceRoll(text: string) {
    setComposerText((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
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
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-8 sm:py-12">
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
              onKeyDown={(e) => e.key === "Enter" && commitRename()}
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
                "-m-2 shrink-0 p-2 transition",
                adventure.favorite ? "text-gold" : "text-parchment-dim/40 hover:text-gold",
              ].join(" ")}
            >
              <IconStar size={19} filled={adventure.favorite} />
            </button>
            <button
              type="button"
              onClick={startRename}
              aria-label={t.journal.renameAdventure}
              className="-m-2 shrink-0 p-2 text-parchment-dim/60 transition hover:text-gold"
            >
              <IconPencil size={19} />
            </button>
            <button
              type="button"
              onClick={() => setDeleting(true)}
              aria-label={t.journal.deleteAdventure}
              title={t.journal.deleteAdventure}
              className="-m-2 shrink-0 p-2 text-parchment-dim/60 transition hover:text-no"
            >
              <IconTrash size={19} />
            </button>
          </>
        )}
      </div>

      {(isPaused || isArchived) && (
        <span className="-mt-3 w-fit rounded-full border border-ink-border px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-parchment-dim">
          {isArchived ? t.journal.statusArchived : t.journal.statusPaused}
        </span>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveAdventureId(isActive ? null : adventure.id)}
          aria-pressed={isActive}
          aria-label={isActive ? t.journal.unsetActive : t.journal.setActive}
          title={isActive ? t.journal.unsetActive : t.journal.setActive}
          className={[
            "flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition",
            isActive
              ? "border-gold/50 bg-gold/10 text-gold"
              : "border-ink-border text-parchment-dim hover:border-gold/50 hover:text-gold",
          ].join(" ")}
        >
          {isActive ? <IconCheck size={16} /> : <IconPlay size={16} />}
          {isActive ? t.journal.activeLabel : t.journal.setActive}
        </button>

        <button
          type="button"
          onClick={() => setAdventureStatus(adventure.id, isArchived ? "ongoing" : "archived")}
          aria-label={isArchived ? t.journal.unarchiveAdventure : t.journal.archiveAdventure}
          title={isArchived ? t.journal.unarchiveAdventure : t.journal.archiveAdventure}
          className="rounded-xl border border-ink-border p-2.5 text-parchment-dim transition hover:border-gold/50 hover:text-gold"
        >
          {isArchived ? <IconArchiveRestore size={16} /> : <IconArchive size={16} />}
        </button>

        <button
          type="button"
          onClick={handleExport}
          className="ml-auto flex items-center gap-2 rounded-xl border border-ink-border px-3.5 py-2.5 text-sm text-parchment-dim transition hover:border-gold/50 hover:text-gold"
        >
          <IconDownload size={15} />
          {t.journal.exportButton}
        </button>
      </div>

      {isActive ? (
        <p className="-mt-2 text-sm text-gold/80">
          {interpolate(t.journal.activeAdventureNote, { name: adventure.name })}
        </p>
      ) : (
        !isArchived && (
          <p className="-mt-2 text-sm text-parchment-dim/70">{t.journal.activateHint}</p>
        )
      )}

      {adventureEntries.length === 0 ? (
        <EmptyState
          icon={<IconFeather size={20} />}
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
                  <div className="flex items-center gap-2 rounded-xl border border-gold/30 bg-gold/[0.05] px-4 py-3">
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
                      className="-m-2 shrink-0 p-2 text-parchment-dim/40 transition hover:text-gold"
                    >
                      <IconPencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeEntry(currentGroup.sessionEntry!.id)}
                      aria-label={t.journal.deleteEntry}
                      className="-m-2 shrink-0 p-2 text-parchment-dim/40 transition hover:text-no"
                    >
                      <IconTrash size={16} />
                    </button>
                  </div>
                )}
                <ul className="flex flex-col gap-2 pl-1">
                  {currentGroup.items.map((entry) => (
                    <EntryRow
                      key={entry.id}
                      entry={entry}
                      onDelete={removeEntry}
                      onEdit={editEntry}
                      deleteLabel={t.journal.deleteEntry}
                      editLabel={t.journal.editEntry}
                      saveLabel={t.common.save}
                      editingId={editingEntryId}
                      onStartEdit={setEditingEntryId}
                      onStopEdit={() => setEditingEntryId(null)}
                    />
                  ))}
                </ul>
              </li>
            ) : (
              currentGroup.items.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  onDelete={removeEntry}
                  onEdit={editEntry}
                  deleteLabel={t.journal.deleteEntry}
                  editLabel={t.journal.editEntry}
                  saveLabel={t.common.save}
                  editingId={editingEntryId}
                  onStartEdit={setEditingEntryId}
                  onStopEdit={() => setEditingEntryId(null)}
                />
              ))
            )}
          </ul>
        )
      )}

      {showNewSession ? (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={sessionTitle}
            onChange={(e) => setSessionTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddSession()}
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
                    onDeleteEntry={removeEntry}
                    onEditEntry={editEntry}
                    deleteLabel={t.journal.deleteEntry}
                    editLabel={t.journal.editEntry}
                    saveLabel={t.common.save}
                    toggleLabel={t.journal.toggleSession}
                    editingId={editingEntryId}
                    onStartEdit={setEditingEntryId}
                    onStopEdit={() => setEditingEntryId(null)}
                  />
                ) : (
                  <Fragment key={`prologue-${i}`}>
                    {group.items.map((entry) => (
                      <EntryRow
                        key={entry.id}
                        entry={entry}
                        onDelete={removeEntry}
                        onEdit={editEntry}
                        deleteLabel={t.journal.deleteEntry}
                        editLabel={t.journal.editEntry}
                        saveLabel={t.common.save}
                        editingId={editingEntryId}
                        onStartEdit={setEditingEntryId}
                        onStopEdit={() => setEditingEntryId(null)}
                      />
                    ))}
                  </Fragment>
                ),
              )}
            </ul>
          )}
        </section>
      )}

      <div className="mt-auto sticky bottom-[calc(3.375rem+env(safe-area-inset-bottom))] z-30 -mx-4 rounded-t-2xl border-t border-ink-border bg-ink-900/95 px-4 pt-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
        {composerExpanded ? (
          <div className="flex flex-col gap-3 pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {COMPOSER_KINDS.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setComposerKind(kind)}
                    className={[
                      "rounded-lg px-3 py-2 text-sm transition",
                      composerKind === kind
                        ? "bg-gold text-ink-950 font-medium"
                        : "text-parchment-dim hover:text-parchment",
                    ].join(" ")}
                  >
                    {kindLabels[kind]}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setComposerExpanded(false)}
                aria-label={t.journal.composerHide}
                className="-m-2 shrink-0 p-2 text-parchment-dim/50 transition hover:text-parchment"
              >
                <IconChevronRight size={16} className="rotate-90" />
              </button>
            </div>
            <p className="-mt-1 text-xs text-parchment-dim/70">{kindHints[composerKind]}</p>
            {composerKind === "roll" && (
              <DiceRoller onRoll={handleDiceRoll} ariaLabel={t.journal.diceRollerLabel} />
            )}
            <div className="flex items-center gap-2">
              <input
                value={composerText}
                onChange={(e) => setComposerText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddEntry()}
                placeholder={t.journal.addPlaceholder}
                className={`${INPUT_CLASS} bg-ink-800/70`}
              />
              <button type="button" onClick={handleAddEntry} className={PRIMARY_BUTTON_CLASS}>
                {t.journal.addButton}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setComposerExpanded(true)}
            aria-label={t.journal.composerShow}
            className="flex w-full items-center justify-center gap-2 pb-3 text-sm text-parchment-dim transition hover:text-gold"
          >
            <IconPlus size={15} />
            {t.journal.composerCollapsedLabel}
            <IconChevronRight size={14} className="-rotate-90" />
          </button>
        )}
      </div>

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
