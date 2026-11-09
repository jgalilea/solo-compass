import { useMemo, useState } from "react";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { interpolate } from "../lib/i18n";
import type { CastDescription } from "../lib/journal";
import type { JournalEntry } from "../lib/lonelog";
import {
  buildCast,
  foeIsOut,
  PROGRESS_KINDS,
  threadStatus,
  type CastMember,
} from "../lib/lonelogTags";
import { groupBySession } from "../lib/journalUi";
import { loadFoldedNotebookSections, saveFoldedNotebookSections, type NotebookSection } from "../lib/notebookSections";
import { AddCastForm } from "./AddCastForm";
import { CastItem } from "./CastItem";
import { PinnedNotes } from "./PinnedNotes";
import {
  IconCast,
  IconChevronRight,
  IconDice,
  IconInventory,
  IconPinned,
  IconPlus,
  IconThread,
} from "./icons/Icons";

/**
 * An adventure's notebook: what's kept at hand beside the journal.
 *
 * - Pinned notes: free text edited in place (inventory, clues, to-dos),
 *   with "- [ ]" checkboxes you can tick. Saved on its own as you type.
 * - Characters and places, threads and clocks, and the add-ons' rooms,
 *   foes and inventory: derived from the journal's Lonelog tags ([N:…],
 *   [PC:…], [L:…], [R:…], [F:…], [Thread:…], [Clock:…], [Track:…],
 *   [Timer:…], [Inv:…], [Wealth:…]), each with its current state and
 *   every entry that mentions it. Nothing is stored apart: adding one,
 *   logging a change, ticking a clock or closing a thread writes a tag
 *   entry in the journal.
 * - Each of them can have a description: free text kept beside the
 *   journal like the notes (not a tag, not an entry), by castKey.
 * - Rolling on a list (NPCs, places, open threads) picks one at random
 *   and logs it as a roll, for when the oracle asks "who?" or "which?".
 *
 * Wide desktop (xl): in the left column, under the session index.
 * Elsewhere: a sheet opened from the adventure header.
 */
export function AdventureNotebook({
  notes,
  onNotesChange,
  descriptions,
  onDescriptionChange,
  entries,
  focusKey,
  focusTick,
  onJump,
  onMention,
  onLog,
  onRoll,
}: {
  notes: string;
  onNotesChange: (notes: string) => void;
  descriptions: Record<string, CastDescription>;
  onDescriptionChange: (key: string, text: string) => void;
  /** The adventure's entries, in journal order. */
  entries: JournalEntry[];
  /** Element to open and scroll to (a chip was tapped in the journal). */
  focusKey: string | null;
  /** Changes on every tap, so tapping the same chip again scrolls again. */
  focusTick: number;
  onJump: (entryId: string) => void;
  /** Insert this text in the composer. */
  onMention: (text: string) => void;
  /** Log this text as a journal note. */
  onLog: (text: string) => void;
  /** Log this text as a roll (a list was rolled on). */
  onRoll: (text: string) => void;
}) {
  const { t } = useLocaleContext();
  const cast = useMemo(() => buildCast(entries), [entries]);
  // The session each entry is in, to say where every mention is.
  const sessionOf = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const group of groupBySession(entries)) {
      for (const entry of group.items) map.set(entry.id, group.sessionEntry?.text ?? null);
    }
    return map;
  }, [entries]);
  const [adding, setAdding] = useState<"cast" | "threads" | "inventory" | null>(null);
  const [folded, setFolded] = useState(loadFoldedNotebookSections);

  const lists: Record<NotebookSection, CastMember[]> = {
    characters: cast.filter((c) => c.kind === "pc" || c.kind === "npc"),
    places: cast.filter((c) => c.kind === "place"),
    rooms: cast.filter((c) => c.kind === "room"),
    // Still fighting first: the dead and the fled are history.
    foes: [...cast.filter((c) => c.kind === "foe" && !foeIsOut(c)), ...cast.filter((c) => c.kind === "foe" && foeIsOut(c))],
    // Open ones first: the closed are history.
    threads: [
      ...cast.filter((c) => c.kind === "thread" && threadStatus(c) === "open"),
      ...cast.filter((c) => c.kind === "thread" && threadStatus(c) !== "open"),
    ],
    progress: cast.filter((c) => PROGRESS_KINDS.has(c.kind)),
    items: cast.filter((c) => c.kind === "item"),
    wealth: cast.filter((c) => c.kind === "wealth"),
  };
  // What "roll on the list" picks from: NPCs (not the PC), places, open threads.
  const rollable: Record<NotebookSection, CastMember[]> = {
    characters: lists.characters.filter((c) => c.kind === "npc"),
    places: lists.places,
    rooms: [],
    foes: [],
    threads: lists.threads.filter((c) => threadStatus(c) === "open"),
    progress: [],
    items: [],
    wealth: [],
  };
  const titles: Record<NotebookSection, string> = {
    characters: t.notebook.groupCharacters,
    places: t.notebook.groupPlaces,
    rooms: t.notebook.groupRooms,
    foes: t.notebook.groupFoes,
    threads: t.notebook.groupThreads,
    progress: t.notebook.groupProgress,
    items: t.notebook.groupItems,
    wealth: t.notebook.groupWealth,
  };

  // A chip tapped in the journal unfolds the list its element is in.
  const [seenTick, setSeenTick] = useState(focusTick);
  if (seenTick !== focusTick) {
    setSeenTick(focusTick);
    const section = (Object.keys(lists) as NotebookSection[]).find((id) => lists[id].some((c) => c.key === focusKey));
    if (section && folded.has(section)) {
      const next = new Set(folded);
      next.delete(section);
      setFolded(next);
    }
  }

  function toggleSection(id: NotebookSection) {
    const next = new Set(folded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFolded(next);
    saveFoldedNotebookSections(next);
  }

  function rollOn(id: NotebookSection) {
    const members = rollable[id];
    if (members.length === 0) return;
    const roll = Math.floor(Math.random() * members.length) + 1;
    onRoll(`${titles[id]} d${members.length} -> ${members[roll - 1].name}`);
  }

  function group(id: NotebookSection) {
    const members = lists[id];
    if (members.length === 0) return null;
    const isFolded = folded.has(id);
    return (
      <div key={id} className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <h3 className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => toggleSection(id)}
              aria-expanded={!isFolded}
              className="flex w-full items-center gap-1.5 rounded-md px-1 py-0.5 text-left text-[0.7rem] font-medium text-parchment-dim/70 transition hover:text-parchment"
            >
              <IconChevronRight size={12} className={`shrink-0 transition-transform ${isFolded ? "" : "rotate-90"}`} />
              <span className="flex-1">{titles[id]}</span>
              <span className="text-parchment-dim/50">{members.length}</span>
            </button>
          </h3>
          {rollable[id].length > 1 && (
            <button
              type="button"
              onClick={() => rollOn(id)}
              aria-label={interpolate(t.notebook.rollList, { list: titles[id] })}
              title={interpolate(t.notebook.rollList, { list: titles[id] })}
              className="shrink-0 rounded-md p-1 text-parchment-dim/70 transition hover:text-gold"
            >
              <IconDice size={14} />
            </button>
          )}
        </div>
        {!isFolded && (
          <ul className="flex flex-col gap-1">
            {members.map((member) => (
              <CastItem
                key={member.key}
                member={member}
                entries={entries}
                sessionOf={sessionOf}
                focused={member.key === focusKey}
                focusTick={focusTick}
                onJump={onJump}
                onMention={onMention}
                onLog={onLog}
                description={descriptions[member.key]?.text ?? ""}
                onDescriptionChange={(text) => onDescriptionChange(member.key, text)}
              />
            ))}
          </ul>
        )}
      </div>
    );
  }

  function addButton(section: "cast" | "threads" | "inventory", label: string) {
    return adding === section ? (
      <AddCastForm
        kinds={
          section === "cast"
            ? ["npc", "pc", "place", "room", "foe"]
            : section === "threads"
              ? ["thread", "clock", "track", "timer"]
              : ["item", "wealth"]
        }
        onAdd={(text) => {
          onLog(text);
          setAdding(null);
        }}
        onCancel={() => setAdding(null)}
      />
    ) : (
      <button
        type="button"
        onClick={() => setAdding(section)}
        className="flex items-center gap-1.5 self-start rounded-lg px-1 py-1 text-xs font-medium text-gold transition hover:text-gold-soft"
      >
        <IconPlus size={14} />
        {label}
      </button>
    );
  }

  const hasCast = lists.characters.length + lists.places.length + lists.rooms.length + lists.foes.length > 0;
  const hasInventory = lists.items.length + lists.wealth.length > 0;
  const hasThreads = lists.threads.length + lists.progress.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-parchment-dim">
          <IconPinned size={15} className="text-gold" />
          {t.notebook.notesTitle}
        </h2>
        <PinnedNotes notes={notes} onChange={onNotesChange} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-parchment-dim">
          <IconCast size={15} className="text-gold" />
          {t.notebook.castTitle}
        </h2>
        {!hasCast && <p className="text-xs text-parchment-dim/80">{t.notebook.castEmpty}</p>}
        {group("characters")}
        {group("places")}
        {group("rooms")}
        {group("foes")}
        {addButton("cast", t.notebook.addButton)}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-parchment-dim">
          <IconThread size={15} className="text-gold" />
          {t.notebook.threadsTitle}
        </h2>
        {!hasThreads && <p className="text-xs text-parchment-dim/80">{t.notebook.threadsEmpty}</p>}
        {group("threads")}
        {group("progress")}
        {addButton("threads", t.notebook.addThreadButton)}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-parchment-dim">
          <IconInventory size={15} className="text-gold" />
          {t.notebook.inventoryTitle}
        </h2>
        {!hasInventory && <p className="text-xs text-parchment-dim/80">{t.notebook.inventoryEmpty}</p>}
        {group("items")}
        {group("wealth")}
        {addButton("inventory", t.notebook.addInventoryButton)}
      </section>
    </div>
  );
}
