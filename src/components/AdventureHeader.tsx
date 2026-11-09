import { useState } from "react";
import { Link } from "react-router-dom";
import { useJournalContext } from "../hooks/useJournalContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { interpolate } from "../lib/i18n";
import type { Adventure } from "../lib/journal";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS, type EntryGroup } from "../lib/journalUi";
import { canShare } from "../lib/share";
import { ActionMenu } from "./ActionMenu";
import { SessionMenu } from "./SessionNavigation";
import {
  IconArchive,
  IconArchiveRestore,
  IconArrowLeft,
  IconChart,
  IconDownload,
  IconNotebook,
  IconPause,
  IconPencil,
  IconPlay,
  IconSearch,
  IconShare,
  IconStar,
  IconTrash,
  IconWebPage,
} from "./icons/Icons";

/**
 * An adventure's header: back to the list, its name (renamed in
 * place), whether it's the active one, and its buttons: search,
 * notebook and sessions (where they aren't columns) and the menu with
 * everything rarely used.
 */
export function AdventureHeader({
  adventure,
  isActive,
  hasEntries,
  searchOpen,
  onToggleSearch,
  notebookOpen,
  onOpenNotebook,
  groups,
  onJumpToSession,
  onStats,
  onExport,
  onExportHtml,
  onShare,
  onDelete,
}: {
  adventure: Adventure;
  isActive: boolean;
  hasEntries: boolean;
  searchOpen: boolean;
  onToggleSearch: () => void;
  notebookOpen: boolean;
  onOpenNotebook: () => void;
  groups: EntryGroup[];
  onJumpToSession: (index: number) => void;
  onStats: () => void;
  onExport: () => void;
  onExportHtml: () => void;
  onShare: () => void;
  onDelete: () => void;
}) {
  const { t } = useLocaleContext();
  const { renameAdventure, setActiveAdventureId, setAdventureStatus, toggleAdventureFavorite } = useJournalContext();
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const isArchived = adventure.status === "archived";

  function startRename() {
    setRenameValue(adventure.name);
    setRenaming(true);
  }

  function commitRename() {
    if (renameValue.trim()) renameAdventure(adventure.id, renameValue);
    setRenaming(false);
  }

  return (
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
          {/* A long name wraps (up to three lines on phones, two above)
              rather than being cut by the buttons beside it. */}
          <h1 className="line-clamp-3 min-w-0 font-display text-lg leading-snug break-words text-parchment sm:line-clamp-2 sm:text-2xl sm:leading-tight lg:text-3xl">
            {adventure.favorite && <IconStar size={16} filled className="mr-1.5 inline align-baseline text-gold" />}
            {adventure.name}
          </h1>
          {/* On phones both are just their mark, to leave the name room:
              the gold dot (active) or the play icon (set active). */}
          {isActive ? (
            <span
              role="img"
              aria-label={t.journal.activeLabel}
              title={interpolate(t.journal.activeAdventureNote, { name: adventure.name })}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 p-2 text-xs font-medium text-gold sm:px-2.5 sm:py-1"
            >
              <span className="size-1.5 rounded-full bg-gold" />
              <span aria-hidden className="hidden sm:inline">
                {t.journal.activeLabel}
              </span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setActiveAdventureId(adventure.id)}
              aria-label={t.journal.setActive}
              title={t.journal.activateHint}
              className="flex shrink-0 items-center gap-1 rounded-full border border-ink-border p-1.5 text-xs font-medium text-parchment-dim transition hover:border-gold/50 hover:text-gold sm:px-2.5 sm:py-1"
            >
              <IconPlay size={13} />
              <span className="hidden sm:inline">{t.journal.setActive}</span>
            </button>
          )}
          {isArchived && (
            <span className="shrink-0 rounded-full border border-ink-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-parchment-dim">
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
                "-m-1 shrink-0 rounded-full p-1.5 transition",
                searchOpen ? "bg-ink-700 text-parchment" : "text-parchment-dim hover:text-gold",
              ].join(" ")}
            >
              <IconSearch size={21} />
            </button>
          )}
          <button
            type="button"
            onClick={onOpenNotebook}
            aria-label={t.notebook.openLabel}
            title={t.notebook.openLabel}
            aria-expanded={notebookOpen}
            className={[
              "-m-1 shrink-0 rounded-full p-1.5 transition xl:hidden",
              notebookOpen ? "bg-ink-700 text-parchment" : "text-parchment-dim hover:text-gold",
            ].join(" ")}
          >
            <IconNotebook size={21} />
          </button>
          {/* With a single session there's nowhere to jump to. */}
          {groups.length > 1 && <SessionMenu groups={groups} onJump={onJumpToSession} className="xl:hidden" />}
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
              { label: t.journal.statsButton, Icon: IconChart, onSelect: onStats },
              { label: t.journal.exportButton, Icon: IconDownload, onSelect: onExport },
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
  );
}
