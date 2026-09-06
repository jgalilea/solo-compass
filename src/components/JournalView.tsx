import { useMemo, useRef, useState } from "react";
import { useJournalContext } from "../hooks/useJournalContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { interpolate } from "../lib/i18n";
import {
  exportCampaignToMarkdown,
  type JournalEntry,
  type JournalLineKind,
} from "../lib/lonelog";
import type { Campaign } from "../lib/journal";
import { ConfirmDialog } from "./ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "./StateViews";
import {
  IconCheck,
  IconDownload,
  IconFeather,
  IconPencil,
  IconPlus,
  IconTrash,
  IconUpload,
} from "./icons/Icons";

const COMPOSER_KINDS: Exclude<JournalLineKind, "session">[] = [
  "action",
  "question",
  "roll",
  "consequence",
  "note",
];

const SYMBOL: Record<JournalLineKind, string> = {
  action: "@",
  question: "?",
  roll: "d:",
  consequence: "=>",
  note: "",
  session: "",
};

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name: string): string {
  return name.trim().replace(/[\\/:*?"<>|]+/g, "-") || "diario";
}

export function JournalView() {
  const {
    status,
    error,
    campaigns,
    entries,
    activeCampaignId,
    setActiveCampaignId,
    createCampaign,
    renameCampaign,
    deleteCampaign,
    addEntry,
    removeEntry,
    importCampaign,
    retry,
  } = useJournalContext();
  const { t } = useLocaleContext();

  const [newCampaignName, setNewCampaignName] = useState("");
  const [showNewCampaignForm, setShowNewCampaignForm] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletingCampaign, setDeletingCampaign] = useState<Campaign | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const activeCampaign = campaigns.find((c) => c.id === activeCampaignId) ?? null;

  const activeEntries = useMemo(
    () =>
      activeCampaign
        ? entries
            .filter((e) => e.campaignId === activeCampaign.id)
            .sort((a, b) => a.timestamp - b.timestamp)
        : [],
    [entries, activeCampaign],
  );

  function handleCreateCampaign() {
    if (!newCampaignName.trim()) return;
    const campaign = createCampaign(newCampaignName);
    setActiveCampaignId(campaign.id);
    setNewCampaignName("");
    setShowNewCampaignForm(false);
  }

  function startRename(campaign: Campaign) {
    setRenamingId(campaign.id);
    setRenameValue(campaign.name);
  }

  function commitRename() {
    if (renamingId && renameValue.trim()) {
      renameCampaign(renamingId, renameValue);
    }
    setRenamingId(null);
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const name = file.name.replace(/\.md$/i, "");
      const campaign = importCampaign(name, text);
      setActiveCampaignId(campaign.id);
      setImportError(null);
    } catch {
      setImportError(t.journal.importError);
    }
  }

  function handleExport() {
    if (!activeCampaign) return;
    const markdown = exportCampaignToMarkdown(t, activeCampaign.name, activeEntries);
    downloadTextFile(`${sanitizeFilename(activeCampaign.name)}.md`, markdown);
  }

  function handleAddEntry() {
    if (!activeCampaign || !composerText.trim()) return;
    addEntry(activeCampaign.id, composerKind, composerText.trim());
    setComposerText("");
  }

  function handleAddSession() {
    if (!activeCampaign) return;
    const title = sessionTitle.trim() || new Date().toLocaleDateString();
    addEntry(activeCampaign.id, "session", title);
    setSessionTitle("");
    setShowNewSession(false);
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="text-center">
        <h1 className="font-display text-3xl text-parchment sm:text-4xl">
          {t.journal.title}
        </h1>
        <p className="mt-2 text-sm text-parchment-dim">{t.journal.subtitle}</p>
      </header>

      {status === "loading" && <LoadingState label={t.journal.loading} />}

      {status === "error" && (
        <ErrorState title={t.journal.loadErrorTitle} description={error ?? undefined} onRetry={retry} />
      )}

      {status === "ready" && (
        <>
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-medium uppercase tracking-wide text-parchment-dim">
                {t.journal.campaignsHeading}
              </h2>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 text-xs text-parchment-dim transition hover:text-gold"
                >
                  <IconUpload size={13} />
                  {t.journal.importButton}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".md,text/markdown,text/plain"
                  className="hidden"
                  onChange={handleImportFile}
                />
              </div>
            </div>

            {importError && (
              <p className="text-xs text-no">{importError}</p>
            )}

            {campaigns.length === 0 && !showNewCampaignForm && (
              <EmptyState
                icon={<IconFeather size={24} />}
                title={t.journal.noCampaignsTitle}
                description={t.journal.noCampaignsDescription}
                compact
              />
            )}

            <ul className="flex flex-col gap-2">
              {campaigns.map((campaign) => {
                const isActive = campaign.id === activeCampaignId;
                const isRenaming = renamingId === campaign.id;
                return (
                  <li
                    key={campaign.id}
                    className={[
                      "rounded-2xl border p-3",
                      isActive ? "border-gold/50 bg-gold/[0.06]" : "border-ink-border bg-ink-800/50",
                    ].join(" ")}
                  >
                    {isRenaming ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && commitRename()}
                          placeholder={t.journal.renameCampaignPlaceholder}
                          className="min-w-0 flex-1 rounded-xl border border-ink-border bg-ink-900/70 px-3 py-1.5 text-sm text-parchment focus:border-gold focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={commitRename}
                          className="shrink-0 rounded-xl bg-gold px-3 py-1.5 text-xs font-medium text-ink-950"
                        >
                          {t.common.save}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveCampaignId(isActive ? null : campaign.id)}
                          aria-pressed={isActive}
                          aria-label={`${isActive ? t.journal.unsetActive : t.journal.setActive}: ${campaign.name}`}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-parchment">
                            {campaign.name}
                          </span>
                          {isActive && (
                            <span className="flex shrink-0 items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gold">
                              <IconCheck size={11} />
                              {t.journal.activeLabel}
                            </span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => startRename(campaign)}
                          aria-label={t.journal.renameCampaign}
                          className="-m-1 shrink-0 p-1 text-parchment-dim/60 transition hover:text-gold"
                        >
                          <IconPencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCampaign(campaign)}
                          aria-label={t.journal.deleteCampaign}
                          className="-m-1 shrink-0 p-1 text-parchment-dim/60 transition hover:text-no"
                        >
                          <IconTrash size={14} />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            {showNewCampaignForm ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateCampaign()}
                  placeholder={t.journal.newCampaignPlaceholder}
                  className="min-w-0 flex-1 rounded-xl border border-ink-border bg-ink-900/70 px-3 py-1.5 text-sm text-parchment placeholder:text-parchment-dim/50 focus:border-gold focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCreateCampaign}
                  className="shrink-0 rounded-xl bg-gold px-3 py-1.5 text-xs font-medium text-ink-950"
                >
                  {t.journal.createButton}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowNewCampaignForm(true)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-ink-border py-2 text-sm text-parchment-dim transition hover:border-gold/50 hover:text-gold"
              >
                <IconPlus size={14} />
                {t.journal.newCampaign}
              </button>
            )}

            {campaigns.length > 0 && !activeCampaign && (
              <p className="text-center text-xs text-parchment-dim/70">
                {t.journal.noActiveCampaignNote}
              </p>
            )}
          </section>

          {activeCampaign && (
            <section className="flex flex-col gap-3 rounded-3xl border border-ink-border bg-ink-800/50 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="min-w-0 truncate font-display text-xl text-parchment">
                  {activeCampaign.name}
                </h2>
                <button
                  type="button"
                  onClick={handleExport}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl border border-ink-border px-2.5 py-1.5 text-xs text-parchment-dim transition hover:border-gold/50 hover:text-gold"
                >
                  <IconDownload size={13} />
                  {t.journal.exportButton}
                </button>
              </div>

              <p className="text-xs text-gold/80">
                {interpolate(t.journal.activeCampaignNote, { name: activeCampaign.name })}
              </p>

              {activeEntries.length === 0 ? (
                <EmptyState
                  icon={<IconFeather size={20} />}
                  title={t.journal.noEntriesTitle}
                  description={t.journal.noEntriesDescription}
                  compact
                />
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {activeEntries.map((entry) => (
                    <EntryRow key={entry.id} entry={entry} onDelete={removeEntry} deleteLabel={t.journal.deleteEntry} />
                  ))}
                </ul>
              )}

              <div className="flex flex-col gap-2 rounded-2xl border border-ink-border bg-ink-900/50 p-3">
                <div className="flex flex-wrap gap-1">
                  {COMPOSER_KINDS.map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => setComposerKind(kind)}
                      className={[
                        "rounded-lg px-2 py-1 text-xs transition",
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
                    className="min-w-0 flex-1 rounded-xl border border-ink-border bg-ink-800/70 px-3 py-2 text-sm text-parchment placeholder:text-parchment-dim/50 focus:border-gold focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddEntry}
                    className="shrink-0 rounded-xl bg-gold px-3 py-2 text-xs font-medium text-ink-950"
                  >
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
                    className="min-w-0 flex-1 rounded-xl border border-ink-border bg-ink-900/70 px-3 py-1.5 text-sm text-parchment placeholder:text-parchment-dim/50 focus:border-gold focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddSession}
                    className="shrink-0 rounded-xl border border-ink-border px-3 py-1.5 text-xs text-parchment-dim hover:text-gold"
                  >
                    {t.common.save}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowNewSession(true)}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-ink-border py-1.5 text-xs text-parchment-dim transition hover:border-gold/50 hover:text-gold"
                >
                  <IconPlus size={13} />
                  {t.journal.newSessionButton}
                </button>
              )}
            </section>
          )}
        </>
      )}

      {deletingCampaign && (
        <ConfirmDialog
          title={interpolate(t.journal.deleteCampaignConfirmTitle, { name: deletingCampaign.name })}
          description={t.journal.deleteCampaignConfirmDescription}
          confirmLabel={t.journal.deleteCampaignConfirmButton}
          onConfirm={() => {
            deleteCampaign(deletingCampaign.id);
            setDeletingCampaign(null);
          }}
          onCancel={() => setDeletingCampaign(null)}
        />
      )}
    </div>
  );
}

function EntryRow({
  entry,
  onDelete,
  deleteLabel,
}: {
  entry: JournalEntry;
  onDelete: (id: string) => void;
  deleteLabel: string;
}) {
  if (entry.kind === "session") {
    return (
      <li className="my-1 flex items-center gap-2 text-[11px] uppercase tracking-wide text-parchment-dim/70">
        <span className="h-px flex-1 bg-ink-border" />
        {entry.text}
        <span className="h-px flex-1 bg-ink-border" />
      </li>
    );
  }

  const symbol = SYMBOL[entry.kind];

  return (
    <li className="flex items-start gap-2 rounded-xl border border-ink-border/70 bg-ink-900/40 px-3 py-2">
      {symbol && (
        <span className="shrink-0 pt-0.5 font-display text-xs text-gold">{symbol}</span>
      )}
      <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm text-parchment/90">
        {entry.text}
      </p>
      <button
        type="button"
        onClick={() => onDelete(entry.id)}
        aria-label={deleteLabel}
        className="-m-1 shrink-0 p-1 text-parchment-dim/40 transition hover:text-no"
      >
        <IconTrash size={13} />
      </button>
    </li>
  );
}
