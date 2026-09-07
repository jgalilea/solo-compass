import { Fragment, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useJournalContext } from "../hooks/useJournalContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { interpolate } from "../lib/i18n";
import { exportCampaignToMarkdown, type JournalLineKind } from "../lib/lonelog";
import { ConfirmDialog } from "./ConfirmDialog";
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
} from "../lib/journalUi";
import {
  IconArchive,
  IconArchiveRestore,
  IconArrowLeft,
  IconCheck,
  IconDownload,
  IconFeather,
  IconPause,
  IconPencil,
  IconPlay,
  IconPlus,
  IconStar,
  IconTrash,
} from "./icons/Icons";

export function CampaignDetailView() {
  const { campaignId = "" } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { t } = useLocaleContext();
  const {
    status,
    campaigns,
    entries,
    activeCampaignId,
    setActiveCampaignId,
    renameCampaign,
    deleteCampaign,
    toggleCampaignFavorite,
    setCampaignStatus,
    addEntry,
    removeEntry,
  } = useJournalContext();

  const campaign = campaigns.find((c) => c.id === campaignId) ?? null;
  const isActive = campaignId === activeCampaignId;

  const campaignEntries = useMemo(
    () =>
      entries
        .filter((e) => e.campaignId === campaignId)
        .sort((a, b) => a.timestamp - b.timestamp),
    [entries, campaignId],
  );
  const groups = useMemo(() => groupBySession(campaignEntries), [campaignEntries]);
  const lastSessionId = useMemo(() => {
    const last = groups.findLast((g) => g.sessionEntry);
    return last?.sessionEntry?.id ?? null;
  }, [groups]);
  const [manualOverrides, setManualOverrides] = useState<Map<string, boolean>>(new Map());

  function isSessionExpanded(id: string): boolean {
    return manualOverrides.get(id) ?? id === lastSessionId;
  }

  function toggleSession(id: string) {
    setManualOverrides((prev) => {
      const next = new Map(prev);
      next.set(id, !isSessionExpanded(id));
      return next;
    });
  }

  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [exportedFilename, setExportedFilename] = useState<string | null>(null);

  const [composerKind, setComposerKind] = useState<JournalLineKind>("note");
  const [composerText, setComposerText] = useState("");
  const [sessionTitle, setSessionTitle] = useState("");
  const [showNewSession, setShowNewSession] = useState(false);

  const kindLabels: Record<Exclude<JournalLineKind, "session">, string> = {
    action: t.journal.kindAction,
    question: t.journal.kindQuestion,
    roll: t.journal.kindRoll,
    consequence: t.journal.kindConsequence,
    note: t.journal.kindNote,
  };

  if (status === "loading") {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-8 sm:py-12">
        <LoadingState label={t.journal.loading} />
      </div>
    );
  }

  if (!campaign) {
    // Campaña inexistente (id inválido, o borrada mientras estaba
    // abierta en otra pestaña) — de vuelta a la lista en vez de
    // enseñar una pantalla rota.
    return (
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 py-8 text-center sm:py-12">
        <EmptyState
          icon={<IconFeather size={24} />}
          title={t.journal.noCampaignsTitle}
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
    setRenameValue(campaign!.name);
    setRenaming(true);
  }

  function commitRename() {
    if (renameValue.trim()) renameCampaign(campaign!.id, renameValue);
    setRenaming(false);
  }

  function handleAddEntry() {
    if (!composerText.trim()) return;
    addEntry(campaign!.id, composerKind, composerText.trim());
    setComposerText("");
  }

  function handleAddSession() {
    const title = sessionTitle.trim() || new Date().toLocaleDateString();
    addEntry(campaign!.id, "session", title);
    setSessionTitle("");
    setShowNewSession(false);
  }

  function handleExport() {
    const markdown = exportCampaignToMarkdown(t, campaign!.name, campaignEntries);
    const filename = `${sanitizeFilename(campaign!.name)}.md`;
    downloadTextFile(filename, markdown);
    setExportedFilename(filename);
  }

  const isArchived = campaign.status === "archived";
  const isPaused = campaign.status === "paused";

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
              placeholder={t.journal.renameCampaignPlaceholder}
              className={INPUT_CLASS}
            />
            <button type="button" onClick={commitRename} className={PRIMARY_BUTTON_CLASS}>
              {t.common.save}
            </button>
          </div>
        ) : (
          <>
            <h1 className="min-w-0 flex-1 truncate font-display text-2xl text-parchment sm:text-3xl">
              {campaign.name}
            </h1>
            <button
              type="button"
              onClick={() => toggleCampaignFavorite(campaign.id)}
              aria-pressed={campaign.favorite}
              aria-label={campaign.favorite ? t.journal.favoriteRemove : t.journal.favoriteAdd}
              className={[
                "-m-2 shrink-0 p-2 transition",
                campaign.favorite ? "text-gold" : "text-parchment-dim/40 hover:text-gold",
              ].join(" ")}
            >
              <IconStar size={19} filled={campaign.favorite} />
            </button>
            <button
              type="button"
              onClick={startRename}
              aria-label={t.journal.renameCampaign}
              className="-m-2 shrink-0 p-2 text-parchment-dim/60 transition hover:text-gold"
            >
              <IconPencil size={19} />
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
          onClick={() => setActiveCampaignId(isActive ? null : campaign.id)}
          aria-pressed={isActive}
          className={[
            "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition",
            isActive
              ? "border border-gold/50 bg-gold/10 text-gold"
              : "border border-ink-border text-parchment-dim hover:border-gold/50 hover:text-gold",
          ].join(" ")}
        >
          <IconCheck size={16} />
          {isActive ? t.journal.unsetActive : t.journal.setActive}
        </button>

        {!isArchived && (
          <button
            type="button"
            onClick={() => setCampaignStatus(campaign.id, isPaused ? "ongoing" : "paused")}
            aria-label={isPaused ? t.journal.resumeCampaign : t.journal.pauseCampaign}
            title={isPaused ? t.journal.resumeCampaign : t.journal.pauseCampaign}
            className="rounded-xl border border-ink-border p-2.5 text-parchment-dim transition hover:border-gold/50 hover:text-gold"
          >
            {isPaused ? <IconPlay size={16} /> : <IconPause size={16} />}
          </button>
        )}

        <button
          type="button"
          onClick={() => setCampaignStatus(campaign.id, isArchived ? "ongoing" : "archived")}
          aria-label={isArchived ? t.journal.unarchiveCampaign : t.journal.archiveCampaign}
          title={isArchived ? t.journal.unarchiveCampaign : t.journal.archiveCampaign}
          className="rounded-xl border border-ink-border p-2.5 text-parchment-dim transition hover:border-gold/50 hover:text-gold"
        >
          {isArchived ? <IconArchiveRestore size={16} /> : <IconArchive size={16} />}
        </button>

        <button
          type="button"
          onClick={handleExport}
          className="flex items-center gap-2 rounded-xl border border-ink-border px-3.5 py-2.5 text-sm text-parchment-dim transition hover:border-gold/50 hover:text-gold"
        >
          <IconDownload size={15} />
          {t.journal.exportButton}
        </button>

        <button
          type="button"
          onClick={() => setDeleting(true)}
          aria-label={t.journal.deleteCampaign}
          title={t.journal.deleteCampaign}
          className="ml-auto rounded-xl border border-ink-border p-2.5 text-parchment-dim/70 transition hover:border-no/40 hover:text-no"
        >
          <IconTrash size={16} />
        </button>
      </div>

      {isActive ? (
        <p className="-mt-2 text-sm text-gold/80">
          {interpolate(t.journal.activeCampaignNote, { name: campaign.name })}
        </p>
      ) : (
        !isArchived && (
          <p className="-mt-2 text-sm text-parchment-dim/70">{t.journal.activateHint}</p>
        )
      )}

      {campaignEntries.length === 0 ? (
        <EmptyState
          icon={<IconFeather size={20} />}
          title={t.journal.noEntriesTitle}
          description={t.journal.noEntriesDescription}
          compact
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {groups.map((group, i) =>
            group.sessionEntry ? (
              <SessionGroupRow
                key={group.sessionEntry.id}
                group={group}
                expanded={isSessionExpanded(group.sessionEntry.id)}
                onToggle={() => toggleSession(group.sessionEntry!.id)}
                onDeleteEntry={removeEntry}
                deleteLabel={t.journal.deleteEntry}
                toggleLabel={t.journal.toggleSession}
              />
            ) : (
              <Fragment key={`prologue-${i}`}>
                {group.items.map((entry) => (
                  <EntryRow key={entry.id} entry={entry} onDelete={removeEntry} deleteLabel={t.journal.deleteEntry} />
                ))}
              </Fragment>
            ),
          )}
        </ul>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-ink-border bg-ink-900/50 p-4">
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

      {deleting && (
        <ConfirmDialog
          title={interpolate(t.journal.deleteCampaignConfirmTitle, { name: campaign.name })}
          description={t.journal.deleteCampaignConfirmDescription}
          confirmLabel={t.journal.deleteCampaignConfirmButton}
          onConfirm={() => {
            deleteCampaign(campaign.id);
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
