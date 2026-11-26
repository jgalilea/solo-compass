import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useJournalContext } from "../hooks/useJournalContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import type { Adventure } from "../lib/journal";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS, type EntryGroup } from "../lib/journalUi";
import { canShare } from "../lib/share";
import { openGuide } from "../lib/guide";
import { settingsOpen } from "../lib/settingsOpen";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { ActionMenu } from "./ActionMenu";
import { SessionMenu } from "./SessionNavigation";
import {
  IconArchive,
  IconArchiveRestore,
  IconArrowLeft,
  IconChart,
  IconDownload,
  IconPause,
  IconPencil,
  IconPlay,
  IconSearch,
  IconSettings,
  IconShare,
  IconStar,
  IconTrash,
  IconWebPage,
  IconHelp,
  IconCopy,
  IconHistory,
  IconNotebook,
} from "./icons/Icons";

/**
 * An adventure's bar, pinned at the top: back to the list, its name
 * (renamed in place), whether it's the active one, and its buttons:
 * search, sessions and the notebook (where they aren't a column: the
 * notebook opens as a sheet, always in reach however long the journal)
 * and the menu with everything rarely used. On phone and tablet it takes the place of the
 * app's header (Layout).
 */
export function AdventureHeader({
  adventure,
  isActive,
  hasEntries,
  searchOpen,
  onToggleSearch,
  groups,
  onJumpToSession,
  onJumpToEntry,
  notebookOpen,
  onOpenNotebook,
  onStats,
  onExport,
  onCopy,
  onExportHtml,
  onShare,
  onDelete,
}: {
  adventure: Adventure;
  isActive: boolean;
  hasEntries: boolean;
  searchOpen: boolean;
  onToggleSearch: () => void;
  groups: EntryGroup[];
  onJumpToSession: (index: number) => void;
  onJumpToEntry: (id: string) => void;
  notebookOpen: boolean;
  onOpenNotebook: () => void;
  onStats: () => void;
  onExport: () => void;
  /** The whole adventure as Lonelog, to the clipboard. */
  onCopy: () => void;
  onExportHtml: () => void;
  onShare: () => void;
  onDelete: () => void;
}) {
  const { t } = useLocaleContext();
  const navigate = useNavigate();
  const { renameAdventure, setActiveAdventureId, setAdventureStatus, toggleAdventureFavorite } = useJournalContext();
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const isArchived = adventure.status === "archived";
  // Phone and tablet: the app's header, with Settings, isn't here.
  const noHeader = !useMediaQuery("(min-width: 64rem)");

  function startRename() {
    setRenameValue(adventure.name);
    setRenaming(true);
  }

  function commitRename() {
    if (renameValue.trim()) renameAdventure(adventure.id, renameValue);
    setRenaming(false);
  }

  return (
    <div className="sticky top-(--pin-adventure) z-30 -mx-4 bg-ink-950 px-4 max-lg:border-b max-lg:border-ink-border/70 sm:mx-0 sm:px-0">
      <div className="relative flex h-adventure items-center gap-0.5 sm:gap-1.5">
        <Link
          to="/diario"
          aria-label={t.journal.backToList}
          title={t.journal.backToList}
          className="-ml-2.5 -mr-1.5 flex size-10 shrink-0 items-center justify-center rounded-full text-parchment-dim transition hover:text-gold"
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
              className={`${INPUT_CLASS} py-1.5`}
            />
            <button type="button" onClick={commitRename} className={`${PRIMARY_BUTTON_CLASS} py-2`}>
              {t.common.save}
            </button>
          </div>
        ) : (
          <>
            {/* Up to two lines beside the buttons: whole, for all but the longest names. */}
            <h1 className="line-clamp-2 min-w-0 font-display text-lg leading-[1.05] break-words text-parchment max-[26rem]:text-base sm:text-xl xl:text-2xl">
              {adventure.favorite && <IconStar size={15} filled className="mr-1.5 inline align-baseline text-gold" />}
              {adventure.name}
            </h1>
            {/* The gold dot (active) or the play icon (set active), only
                the icon on a narrow phone, to leave the name its room (the
                menu says it in words too). */}
            {isActive ? (
              <span
                role="img"
                aria-label={t.journal.activeLabel}
                title={t.journal.activeAdventureNote}
                className="flex shrink-0 items-center gap-1.5 rounded-full border-gold/40 px-1 py-1 text-xs font-medium text-gold sm:border sm:bg-gold/10 sm:px-2.5"
              >
                <span className="size-1.5 rounded-full bg-gold" />
                <span aria-hidden className="max-sm:hidden">{t.journal.activeLabel}</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setActiveAdventureId(adventure.id)}
                aria-label={t.journal.setActive}
                title={t.journal.activateHint}
                className="flex h-9 shrink-0 items-center justify-center gap-1 rounded-full border border-ink-border px-3 text-xs font-medium text-parchment-dim transition hover:border-gold/50 hover:text-gold max-[26rem]:w-9 max-[26rem]:px-0"
              >
                <IconPlay size={14} />
                <span aria-hidden className="max-[26rem]:hidden">{t.journal.setActive}</span>
              </button>
            )}
            {isArchived && (
              <span className="shrink-0 rounded-full border border-ink-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-parchment-dim max-sm:hidden">
                {t.journal.statusArchived}
              </span>
            )}
            <div className="ml-auto" />
            {hasEntries && (
              <button
                type="button"
                onClick={onToggleSearch}
                aria-label={t.journal.searchInJournal}
                title={t.journal.searchInJournal}
                aria-expanded={searchOpen}
                className={[
                  "flex size-10 shrink-0 items-center justify-center rounded-full transition",
                  searchOpen ? "bg-ink-700 text-parchment" : "text-parchment-dim hover:text-gold",
                ].join(" ")}
              >
                <IconSearch size={21} />
              </button>
            )}
            {/* With a single session there's nowhere to jump to. */}
            {(groups.length > 1 || groups.some((g) => g.items.some((e) => e.kind === "scene"))) && (
              <SessionMenu groups={groups} onJump={onJumpToSession} onJumpToEntry={onJumpToEntry} className="xl:hidden" />
            )}
            <button
              type="button"
              onClick={onOpenNotebook}
              aria-label={t.notebook.openLabel}
              title={t.notebook.openLabel}
              aria-expanded={notebookOpen}
              className="flex size-10 shrink-0 items-center justify-center rounded-full text-parchment-dim transition hover:text-gold xl:hidden"
            >
              <IconNotebook size={21} />
            </button>
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
                isActive
                  ? { label: t.journal.unsetActive, Icon: IconPause, onSelect: () => setActiveAdventureId(null) }
                  : { label: t.journal.setActive, Icon: IconPlay, onSelect: () => setActiveAdventureId(adventure.id) },
                { label: t.journal.renameAdventure, Icon: IconPencil, onSelect: startRename },
                { label: t.journal.statsButton, Icon: IconChart, onSelect: onStats },
                { label: t.history.showRolls, Icon: IconHistory, onSelect: () => navigate(`/historial?aventura=${adventure.id}`) },
                { label: t.guide.title, Icon: IconHelp, onSelect: openGuide },
                ...(noHeader ? [{ label: t.settings.triggerLabel, Icon: IconSettings, onSelect: settingsOpen.open }] : []),
                { label: t.journal.exportButton, Icon: IconDownload, onSelect: onExport },
                { label: t.journal.copyLonelog, Icon: IconCopy, onSelect: onCopy },
                { label: t.journal.exportHtmlButton, Icon: IconWebPage, onSelect: onExportHtml },
                ...(canShare() ? [{ label: t.journal.shareButton, Icon: IconShare, onSelect: onShare }] : []),
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
                { label: t.journal.deleteAdventure, Icon: IconTrash, onSelect: onDelete, danger: true },
              ]}
            />
          </>
        )}
      </div>
    </div>
  );
}
