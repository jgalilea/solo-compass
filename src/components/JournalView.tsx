import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useJournalContext } from "../hooks/useJournalContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { interpolate, type Dictionary } from "../lib/i18n";
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
  IconChevronRight,
  IconDownload,
  IconFeather,
  IconGripVertical,
  IconPencil,
  IconPlus,
  IconStar,
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
  // Al descargarse, el archivo se queda solo con bytes + extensión —
  // el "charset=utf-8" del blob no viaja con él. Sin un BOM, algunos
  // visores (sobre todo en iOS) adivinan mal la codificación y
  // muestran los acentos/símbolos rotos al abrirlo fuera de la app.
  const blob = new Blob(["﻿" + content], { type: "text/markdown;charset=utf-8" });
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

interface EntryGroup {
  sessionEntry: JournalEntry | null;
  items: JournalEntry[];
}

function groupBySession(sortedEntries: JournalEntry[]): EntryGroup[] {
  const groups: EntryGroup[] = [];
  let current: EntryGroup = { sessionEntry: null, items: [] };
  for (const entry of sortedEntries) {
    if (entry.kind === "session") {
      groups.push(current);
      current = { sessionEntry: entry, items: [] };
    } else {
      current.items.push(entry);
    }
  }
  groups.push(current);
  return groups.filter((g) => g.sessionEntry !== null || g.items.length > 0);
}

const INPUT_CLASS =
  "min-w-0 flex-1 rounded-xl border border-ink-border bg-ink-900/70 px-4 py-3 text-base text-parchment placeholder:text-parchment-dim/50 focus:border-gold focus:outline-none";
const PRIMARY_BUTTON_CLASS =
  "shrink-0 rounded-xl bg-gold px-4 py-3 text-sm font-medium text-ink-950";
const SECONDARY_BUTTON_CLASS =
  "shrink-0 rounded-xl border border-ink-border px-4 py-3 text-sm text-parchment-dim transition hover:border-gold/50 hover:text-gold";

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
    reorderCampaigns,
    toggleCampaignFavorite,
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

  // Orden de visualización de las campañas (drag and drop). Se
  // sincroniza con `campaigns` pero preserva el orden manual — los
  // ids nuevos (creada/importada) se añaden al principio.
  const [order, setOrder] = useState<string[]>(() => campaigns.map((c) => c.id));
  const orderRef = useRef(order);
  useEffect(() => {
    orderRef.current = order;
  }, [order]);
  useEffect(() => {
    setOrder((prev) => {
      const ids = campaigns.map((c) => c.id);
      const idSet = new Set(ids);
      const kept = prev.filter((id) => idSet.has(id));
      const added = ids.filter((id) => !prev.includes(id));
      const next = [...added, ...kept];
      if (next.length === prev.length && next.every((id, i) => id === prev[i])) return prev;
      return next;
    });
  }, [campaigns]);

  const byId = useMemo(() => new Map(campaigns.map((c) => [c.id, c])), [campaigns]);
  const orderedCampaigns = order
    .map((id) => byId.get(id))
    .filter((c): c is Campaign => !!c);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const rowRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  useEffect(() => {
    if (!draggingId) return;

    function handleMove(e: PointerEvent) {
      const y = e.clientY;
      let targetId: string | null = null;
      for (const [id, el] of rowRefs.current) {
        if (id === draggingId) continue;
        const rect = el.getBoundingClientRect();
        if (y >= rect.top && y <= rect.bottom) {
          targetId = id;
          break;
        }
      }
      if (targetId) {
        const current = orderRef.current;
        const from = current.indexOf(draggingId as string);
        const to = current.indexOf(targetId);
        if (from !== -1 && to !== -1 && from !== to) {
          const next = [...current];
          next.splice(from, 1);
          next.splice(to, 0, draggingId as string);
          orderRef.current = next;
          setOrder(next);
        }
      }
    }

    function handleUp() {
      setDraggingId(null);
      reorderCampaigns(orderRef.current);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [draggingId, reorderCampaigns]);

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

  function handleExport(campaign: Campaign, campaignEntries: JournalEntry[]) {
    const markdown = exportCampaignToMarkdown(t, campaign.name, campaignEntries);
    downloadTextFile(`${sanitizeFilename(campaign.name)}.md`, markdown);
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-7 px-4 py-8 sm:py-12">
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
                  className="-m-2 flex items-center gap-1.5 p-2 text-sm text-parchment-dim transition hover:text-gold"
                >
                  <IconUpload size={16} />
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

            {importError && <p className="text-sm text-no">{importError}</p>}

            {campaigns.length === 0 && !showNewCampaignForm && (
              <EmptyState
                icon={<IconFeather size={24} />}
                title={t.journal.noCampaignsTitle}
                description={t.journal.noCampaignsDescription}
                compact
              />
            )}

            <ul className="flex flex-col gap-2.5">
              {orderedCampaigns.map((campaign) => {
                const isActive = campaign.id === activeCampaignId;
                const isRenaming = renamingId === campaign.id;
                const isDragging = draggingId === campaign.id;
                return (
                  <li
                    key={campaign.id}
                    ref={(el) => {
                      if (el) rowRefs.current.set(campaign.id, el);
                      else rowRefs.current.delete(campaign.id);
                    }}
                    style={isDragging ? { opacity: 0.5 } : undefined}
                    className={[
                      "rounded-2xl border p-4",
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
                          className={INPUT_CLASS}
                        />
                        <button type="button" onClick={commitRename} className={PRIMARY_BUTTON_CLASS}>
                          {t.common.save}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onPointerDown={(e) => {
                            e.preventDefault();
                            setDraggingId(campaign.id);
                          }}
                          aria-label={t.journal.dragHandle}
                          style={{ touchAction: "none" }}
                          className="-m-2 shrink-0 cursor-grab p-2 text-parchment-dim/40 active:cursor-grabbing"
                        >
                          <IconGripVertical size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleCampaignFavorite(campaign.id)}
                          aria-pressed={campaign.favorite}
                          aria-label={
                            campaign.favorite ? t.journal.favoriteRemove : t.journal.favoriteAdd
                          }
                          className={[
                            "-m-2 shrink-0 p-2 transition",
                            campaign.favorite ? "text-gold" : "text-parchment-dim/40 hover:text-gold",
                          ].join(" ")}
                        >
                          <IconStar size={16} filled={campaign.favorite} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveCampaignId(isActive ? null : campaign.id)}
                          aria-pressed={isActive}
                          aria-label={`${isActive ? t.journal.unsetActive : t.journal.setActive}: ${campaign.name}`}
                          className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left"
                        >
                          <span className="min-w-0 flex-1 truncate text-base font-medium text-parchment">
                            {campaign.name}
                          </span>
                          {isActive && (
                            <span className="flex shrink-0 items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-gold">
                              <IconCheck size={12} />
                              {t.journal.activeLabel}
                            </span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => startRename(campaign)}
                          aria-label={t.journal.renameCampaign}
                          className="-m-2 shrink-0 p-2 text-parchment-dim/60 transition hover:text-gold"
                        >
                          <IconPencil size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCampaign(campaign)}
                          aria-label={t.journal.deleteCampaign}
                          className="-m-2 shrink-0 p-2 text-parchment-dim/60 transition hover:text-no"
                        >
                          <IconTrash size={18} />
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
                  className={INPUT_CLASS}
                />
                <button type="button" onClick={handleCreateCampaign} className={PRIMARY_BUTTON_CLASS}>
                  {t.journal.createButton}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowNewCampaignForm(true)}
                className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-ink-border py-3 text-base text-parchment-dim transition hover:border-gold/50 hover:text-gold"
              >
                <IconPlus size={16} />
                {t.journal.newCampaign}
              </button>
            )}

            {campaigns.length > 0 && !activeCampaign && (
              <p className="text-center text-sm text-parchment-dim/70">
                {t.journal.noActiveCampaignNote}
              </p>
            )}
          </section>

          {activeCampaign && (
            <ActiveCampaignPanel
              key={activeCampaign.id}
              campaign={activeCampaign}
              entries={activeEntries}
              onExport={() => handleExport(activeCampaign, activeEntries)}
              onAddEntry={(kind, text) => addEntry(activeCampaign.id, kind, text)}
              onDeleteEntry={removeEntry}
              t={t}
            />
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

/**
 * key={campaign.id} en el sitio de uso: al cambiar de campaña activa,
 * React desmonta y vuelve a montar este componente, así que el estado
 * local (sesiones plegadas, texto del composer) empieza limpio cada
 * vez en vez de arrastrarse de una campaña a otra.
 */
function ActiveCampaignPanel({
  campaign,
  entries,
  onExport,
  onAddEntry,
  onDeleteEntry,
  t,
}: {
  campaign: Campaign;
  entries: JournalEntry[];
  onExport: () => void;
  onAddEntry: (kind: JournalLineKind, text: string) => void;
  onDeleteEntry: (id: string) => void;
  t: Dictionary;
}) {
  const groups = useMemo(() => groupBySession(entries), [entries]);
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

  function handleAddEntry() {
    if (!composerText.trim()) return;
    onAddEntry(composerKind, composerText.trim());
    setComposerText("");
  }

  function handleAddSession() {
    const title = sessionTitle.trim() || new Date().toLocaleDateString();
    onAddEntry("session", title);
    setSessionTitle("");
    setShowNewSession(false);
  }

  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-ink-border bg-ink-800/50 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="min-w-0 truncate font-display text-xl text-parchment">{campaign.name}</h2>
        <button
          type="button"
          onClick={onExport}
          className="flex shrink-0 items-center gap-2 rounded-xl border border-ink-border px-3.5 py-2.5 text-sm text-parchment-dim transition hover:border-gold/50 hover:text-gold"
        >
          <IconDownload size={15} />
          {t.journal.exportButton}
        </button>
      </div>

      <p className="-mt-2 text-sm text-gold/80">
        {interpolate(t.journal.activeCampaignNote, { name: campaign.name })}
      </p>

      {entries.length === 0 ? (
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
                onDeleteEntry={onDeleteEntry}
                deleteLabel={t.journal.deleteEntry}
                toggleLabel={t.journal.toggleSession}
              />
            ) : (
              <Fragment key={`prologue-${i}`}>
                {group.items.map((entry) => (
                  <EntryRow key={entry.id} entry={entry} onDelete={onDeleteEntry} deleteLabel={t.journal.deleteEntry} />
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
    </section>
  );
}

function SessionGroupRow({
  group,
  expanded,
  onToggle,
  onDeleteEntry,
  deleteLabel,
  toggleLabel,
}: {
  group: EntryGroup;
  expanded: boolean;
  onToggle: () => void;
  onDeleteEntry: (id: string) => void;
  deleteLabel: string;
  toggleLabel: string;
}) {
  const session = group.sessionEntry;
  if (!session) return null;

  return (
    <li className="flex flex-col gap-2">
      <div className="flex items-center gap-1 rounded-xl border border-ink-border/70 bg-ink-900/40 px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={toggleLabel}
          className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left"
        >
          <IconChevronRight
            size={16}
            className={`shrink-0 text-parchment-dim transition-transform ${expanded ? "rotate-90" : ""}`}
          />
          <span className="min-w-0 flex-1 truncate text-sm font-medium uppercase tracking-wide text-parchment-dim">
            {session.text}
          </span>
          <span className="shrink-0 text-xs text-parchment-dim/50">{group.items.length}</span>
        </button>
        <button
          type="button"
          onClick={() => onDeleteEntry(session.id)}
          aria-label={deleteLabel}
          className="-m-2 shrink-0 p-2 text-parchment-dim/40 transition hover:text-no"
        >
          <IconTrash size={16} />
        </button>
      </div>
      {expanded && (
        <ul className="flex flex-col gap-2 pl-1">
          {group.items.map((entry) => (
            <EntryRow key={entry.id} entry={entry} onDelete={onDeleteEntry} deleteLabel={deleteLabel} />
          ))}
        </ul>
      )}
    </li>
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
  const symbol = SYMBOL[entry.kind];

  return (
    <li className="flex items-start gap-2.5 rounded-xl border border-ink-border/70 bg-ink-900/40 px-4 py-3">
      {symbol && (
        <span className="shrink-0 pt-0.5 font-display text-sm text-gold">{symbol}</span>
      )}
      <p className="min-w-0 flex-1 whitespace-pre-wrap text-base text-parchment/90">
        {entry.text}
      </p>
      <button
        type="button"
        onClick={() => onDelete(entry.id)}
        aria-label={deleteLabel}
        className="-m-2 shrink-0 p-2 text-parchment-dim/40 transition hover:text-no"
      >
        <IconTrash size={16} />
      </button>
    </li>
  );
}
