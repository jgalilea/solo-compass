import { useRef, useState } from "react";
import { useDismiss } from "../hooks/useDismiss";
import { useLocaleContext } from "../hooks/useLocaleContext";
import type { EntryGroup } from "../lib/journalUi";
import { parseScene } from "../lib/lonelogLines";
import { tagsToPlainText } from "../lib/lonelogTags";
import { interpolate } from "../lib/i18n";
import { loadFoldedNotebookSections, toggleFoldedNotebookSection } from "../lib/notebookSections";
import { titleIfCut } from "../lib/truncation";
import { FoldingHeading } from "./FoldingHeading";
import { IconChevronRight, IconSession } from "./icons/Icons";

interface IndexProps {
  groups: EntryGroup[];
  /** To a session, by its place in `groups`. */
  onJump: (index: number) => void;
  /** To a scene, by its entry id. */
  onJumpToEntry: (id: string) => void;
}

/**
 * Session index (wide desktop): jumps to each session, and to its
 * scenes. The whole index folds away, like the notebook's blocks.
 */
export function SessionIndex({ groups, onJump, onJumpToEntry }: IndexProps) {
  const { t } = useLocaleContext();
  const [folded, setFolded] = useState(() => loadFoldedNotebookSections().has("sessionsBlock"));
  return (
    <nav aria-label={t.journal.sessionsHeading} className="flex flex-col gap-2">
      <div className="px-3">
        <FoldingHeading
          Icon={IconSession}
          title={t.journal.sessionsHeading}
          folded={folded}
          onToggle={() => setFolded(toggleFoldedNotebookSection("sessionsBlock").has("sessionsBlock"))}
          count={groups.length}
        />
      </div>
      {!folded && <SessionList groups={groups} onJump={onJump} onJumpToEntry={onJumpToEntry} />}
    </nav>
  );
}

/**
 * The same index where there's no room for a column (phone, tablet and
 * narrow desktop): a button in the header that drops it down.
 */
export function SessionMenu({ groups, onJump, onJumpToEntry, className }: IndexProps & { className: string }) {
  const { t } = useLocaleContext();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useDismiss(open, rootRef, () => setOpen(false));

  return (
    // No "relative" on phones: the dropdown takes the header's width
    // instead of overflowing to the left from the button.
    // flex: as a block, its line height pushed the button 2px out of
    // line with the search and notebook buttons beside it.
    <div ref={rootRef} className={`${className} flex shrink-0 sm:relative`}>
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
            onJumpToEntry={(id) => {
              setOpen(false);
              onJumpToEntry(id);
            }}
          />
        </nav>
      )}
    </div>
  );
}

/**
 * Each session with its scenes below. Only the current one (the last)
 * shows its scenes at first; the chevron shows or hides any other's.
 */
function SessionList({ groups, onJump, onJumpToEntry }: IndexProps) {
  const { t } = useLocaleContext();
  const last = groups.length - 1;
  // What the player opened or closed by hand, by session; the rest
  // follow the default (open only the last).
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  return (
    <ul className="flex flex-col gap-0.5">
      {groups.map((g, i) => {
        const scenes = g.items.filter((e) => e.kind === "scene");
        const key = g.sessionEntry?.id ?? `prologue-${i}`;
        const open = toggled[key] ?? i === last;
        const title = g.sessionEntry?.text ?? t.journal.prologueLabel;
        return (
          <li key={key}>
            <div className="flex items-center">
              {scenes.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setToggled((prev) => ({ ...prev, [key]: !open }))}
                  aria-expanded={open}
                  aria-label={interpolate(open ? t.journal.hideScenes : t.journal.showScenes, { session: title })}
                  title={interpolate(open ? t.journal.hideScenes : t.journal.showScenes, { session: title })}
                  className="shrink-0 rounded-md p-1 text-parchment-dim/60 transition hover:text-gold"
                >
                  <IconChevronRight size={12} className={`transition-transform ${open ? "rotate-90" : ""}`} />
                </button>
              ) : (
                <span aria-hidden className="w-5 shrink-0" />
              )}
              <button
                type="button"
                onClick={() => onJump(i)}
                aria-current={i === last ? "true" : undefined}
                className={[
                  "flex min-w-0 flex-1 items-center gap-2 rounded-lg py-1.5 pl-1 pr-3 text-left text-sm transition hover:bg-ink-700/60",
                  i === last ? "font-medium text-gold" : "text-parchment-dim hover:text-parchment",
                ].join(" ")}
              >
                <span onMouseEnter={titleIfCut(title)} className="min-w-0 flex-1 truncate">
                  {title}
                </span>
                <span className="shrink-0 text-xs text-parchment-dim/50">{g.items.length}</span>
              </button>
            </div>
            {open && scenes.length > 0 && (
              // Its scenes (Lonelog §5.3), one level in.
              <ul className="ml-7 flex flex-col border-l border-ink-border pl-1">
                {scenes.map((scene) => {
                  const { id, context } = parseScene(scene.text);
                  return (
                    <li key={scene.id}>
                      <button
                        type="button"
                        onClick={() => onJumpToEntry(scene.id)}
                        className="flex w-full items-baseline gap-2 rounded-lg px-2 py-1 text-left text-xs text-parchment-dim transition hover:bg-ink-700/60 hover:text-parchment"
                      >
                        <span className="shrink-0 font-semibold tabular-nums text-gold/80">{id}</span>
                        <span onMouseEnter={titleIfCut(tagsToPlainText(context))} className="min-w-0 flex-1 truncate">
                          {tagsToPlainText(context)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
