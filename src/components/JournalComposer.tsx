import { useLayoutEffect, useMemo, useRef, useState, type ComponentType, type Ref, type RefObject } from "react";
import { useDismiss } from "../hooks/useDismiss";
import { useJournalContext } from "../hooks/useJournalContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { interpolate } from "../lib/i18n";
import { COMPOSER_KINDS, type ComposerMode } from "../lib/journalUi";
import { Modal } from "./Modal";
import { DiceTool, OracleTool, TableTool } from "./PlayTools";
import {
  IconAction,
  IconChevronUpDown,
  IconClose,
  IconConsequence,
  IconDice,
  IconNote,
  IconOracle,
  IconSend,
  IconSession,
  IconTable,
} from "./icons/Icons";

type Tool = "oracle" | "table" | "dice";
type IconType = ComponentType<{ size?: number; className?: string }>;

const MODE_ICON: Record<ComposerMode, IconType> = {
  note: IconNote,
  action: IconAction,
  consequence: IconConsequence,
  session: IconSession,
};

/**
 * Composer pinned to the bottom of the journal, on a single row to
 * leave the screen to the journal: tools (oracle, dice, table), the
 * entry kind as a chip inside the field, the text and send.
 *
 * The text can span several lines and the field grows with it (up to
 * about six; then it scrolls inside). With a physical keyboard Enter
 * sends and Shift+Enter adds a line break, as in a chat; on touch
 * Enter adds a line break and the button sends (no Shift at hand).
 *
 * The tools open in a bottom sheet over the content (they don't push
 * the composer or cover the latest entries), with tabs to switch
 * between them, and close after rolling. On desktop they don't appear
 * here: they live in the fixed right-hand panel (see
 * AdventureDetailView).
 *
 * The kind and the linked roll are kept by the parent, because the
 * desktop panel changes them too: after any roll it switches to
 * "Consequence", which is what usually gets written next.
 */
export function JournalComposer({
  ref,
  inputRef,
  adventureId,
  mode,
  onModeChange,
  linkedRollId,
  onLogged,
  onRolled,
}: {
  /** The journal measures it so the newest entry isn't left under the composer. */
  ref?: Ref<HTMLDivElement>;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  adventureId: string;
  mode: ComposerMode;
  onModeChange: (mode: ComposerMode) => void;
  linkedRollId: string | undefined;
  /** Something typed by hand was logged. */
  onLogged: () => void;
  /** A tool was rolled (rollId to link the consequence). */
  onRolled: (rollId?: string) => void;
}) {
  const { t } = useLocaleContext();
  const { entries, addEntry } = useJournalContext();
  const [tool, setTool] = useState<Tool | null>(null);
  const [text, setText] = useState("");
  // Physical keyboard (mouse/trackpad): Enter sends. Checked once; it
  // doesn't change mid-game.
  const [finePointer] = useState(() => window.matchMedia("(pointer: fine)").matches);
  const sendsOnEnter = finePointer || mode === "session";

  // The field grows with the text (empty goes back to one row:
  // otherwise a long placeholder that doesn't fit would grow it too).
  // If the end of the journal was visible right above, it scrolls down
  // by the growth so the composer doesn't cover it.
  useLayoutEffect(() => {
    const el = inputRef.current;
    const root = el?.closest<HTMLElement>("[data-composer]");
    if (!el || !root) return;
    const listEnd = root.previousElementSibling?.getBoundingClientRect().bottom;
    const lastWasVisible = listEnd !== undefined && listEnd <= root.getBoundingClientRect().top + 2;
    el.style.height = "auto";
    el.style.height = text ? `${el.scrollHeight}px` : "";
    const covered = (listEnd ?? 0) - root.getBoundingClientRect().top;
    if (lastWasVisible && covered > 0) window.scrollBy(0, covered);
  }, [text, inputRef]);

  // What a consequence will join (see buildEntryBlocks): the latest
  // entry, unless the session was just opened.
  const lastEntry = useMemo(() => {
    let last: (typeof entries)[number] | undefined;
    for (const e of entries) {
      if (e.adventureId === adventureId && (!last || e.timestamp >= last.timestamp)) last = e;
    }
    return last && last.kind !== "session" ? last : undefined;
  }, [entries, adventureId]);

  // A session title is optional (it falls back to the date); anything
  // else needs some text.
  const canSend = mode === "session" || text.trim() !== "";

  const placeholder =
    mode === "consequence"
      ? t.oracle.consequencePlaceholder
      : mode === "session"
        ? t.journal.newSessionPlaceholder
        : t.journal.addPlaceholder;

  function handleSubmit() {
    if (mode === "session") {
      // A session title is a single line (in Lonelog it goes between "===").
      addEntry(adventureId, "session", text.replace(/\s*\n\s*/g, " ").trim() || new Date().toLocaleDateString());
      onModeChange("note");
    } else {
      if (!canSend) return;
      addEntry(adventureId, mode, text.trim(), mode === "consequence" ? linkedRollId : undefined);
    }
    setText("");
    onLogged();
  }

  const tools: { id: Tool; label: string; title: string; Icon: IconType }[] = [
    { id: "oracle", label: t.journal.toolOracle, title: t.journal.toolOracleTitle, Icon: IconOracle },
    { id: "dice", label: t.journal.toolDice, title: t.journal.toolDiceTitle, Icon: IconDice },
    { id: "table", label: t.journal.toolTable, title: t.journal.toolTableTitle, Icon: IconTable },
  ];
  const openTool = tools.find((x) => x.id === tool);

  function rolled(rollId?: string) {
    setTool(null);
    onRolled(rollId);
  }

  return (
    <div
      ref={ref}
      data-composer
      className="group/composer sticky bottom-[calc(var(--spacing-nav)+env(safe-area-inset-bottom))] z-30 -mx-4 mt-auto border-t border-ink-border bg-ink-900/95 px-3 py-2.5 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border lg:bottom-0 lg:mb-0 lg:rounded-b-none lg:border-b-0 lg:px-3 lg:py-3"
    >
      {mode === "consequence" && (
        <p className="mb-2 flex min-w-0 items-center gap-1.5 px-1 text-xs text-parchment-dim">
          <IconConsequence size={14} className="shrink-0 text-gold" />
          {lastEntry ? (
            <>
              <span className="shrink-0">{t.journal.consequenceJoins}</span>
              <span className="min-w-0 truncate italic text-parchment">«{lastEntry.text}»</span>
            </>
          ) : (
            <span className="min-w-0 truncate">{t.journal.consequenceAlone}</span>
          )}
        </p>
      )}
      <div className="flex items-center gap-1.5">
        {/* While typing on a narrow phone they fold away, to leave the
            width to the text (as in a messaging app). */}
        <div className="flex shrink-0 gap-1 max-sm:group-has-[textarea:focus]/composer:hidden lg:hidden">
          {tools.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTool(id)}
              aria-label={label}
              title={label}
              data-hotkey-open={id}
              className="flex size-10 items-center justify-center rounded-xl border border-gold/40 bg-gold/10 text-gold transition hover:bg-gold/20 active:scale-95"
            >
              <Icon size={19} />
            </button>
          ))}
        </div>

        <form
          className="flex min-w-0 flex-1 items-end gap-1 rounded-xl border border-ink-border bg-ink-800/70 p-1 transition focus-within:border-gold"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <ModePicker mode={mode} onChange={onModeChange} />
          <textarea
            ref={inputRef}
            data-hotkey="write"
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing || !sendsOnEnter) return;
              e.preventDefault();
              handleSubmit();
            }}
            placeholder={placeholder}
            aria-label={placeholder}
            enterKeyHint={sendsOnEnter ? "send" : "enter"}
            className="max-h-40 min-w-0 flex-1 resize-none self-center bg-transparent px-1 py-1.5 text-base text-parchment placeholder:text-parchment-dim/50 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label={t.journal.sendButton}
            title={t.journal.sendButton}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gold text-ink-950 transition hover:bg-gold-soft active:scale-95 disabled:bg-ink-700 disabled:text-parchment-dim/50 disabled:active:scale-100"
          >
            <IconSend size={17} />
          </button>
        </form>
      </div>

      {openTool && (
        <Modal
          sheet
          onClose={() => setTool(null)}
          label={openTool.title}
          className="animate-fade-up flex max-h-[85dvh] w-full max-w-lg flex-col gap-4 overflow-y-auto overscroll-contain rounded-t-3xl border border-b-0 border-ink-border bg-ink-800 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:max-w-xl sm:p-6 md:max-w-3xl sm:pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
        >
          {/* Tabs instead of a title: go from the oracle to a table
              without closing the sheet (on desktop all three are visible). */}
          <div className="flex items-center gap-2">
            <div role="tablist" aria-label={t.journal.playPanelLabel} className="flex min-w-0 flex-1 gap-1 rounded-xl bg-ink-900/60 p-1">
              {tools.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={id === tool}
                  onClick={() => setTool(id)}
                  className={[
                    "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium transition",
                    id === tool ? "bg-gold text-ink-950" : "text-parchment-dim hover:text-parchment",
                  ].join(" ")}
                >
                  {/* On the narrowest phones icon and name don't both fit. */}
                  <Icon size={16} className="shrink-0 max-[380px]:hidden" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setTool(null)}
              aria-label={t.common.close}
              className="shrink-0 p-2 text-parchment-dim transition hover:text-parchment"
            >
              <IconClose size={18} />
            </button>
          </div>
          <h2 className="sr-only">{openTool.title}</h2>
          {tool === "oracle" && <OracleTool adventureId={adventureId} onRolled={rolled} autoFocus />}
          {tool === "dice" && <DiceTool adventureId={adventureId} onRolled={rolled} />}
          {tool === "table" && <TableTool adventureId={adventureId} onRolled={rolled} />}
        </Modal>
      )}
    </div>
  );
}

/**
 * Chip with the entry kind's icon; opens upwards the list of kinds,
 * each with a line explaining it (it replaces the tabs and the fixed
 * hint that took up two rows of the composer).
 */
function ModePicker({ mode, onChange }: { mode: ComposerMode; onChange: (mode: ComposerMode) => void }) {
  const { t } = useLocaleContext();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useDismiss(open, rootRef, () => setOpen(false));

  const kinds: { mode: ComposerMode; label: string; hint: string }[] = COMPOSER_KINDS.map((k) => ({
    mode: k,
    label: { note: t.journal.kindNote, action: t.journal.kindAction, consequence: t.journal.kindConsequence }[k],
    hint: {
      note: t.journal.composerHintNote,
      action: t.journal.composerHintAction,
      consequence: t.journal.composerHintConsequence,
    }[k],
  }));
  const session = { mode: "session" as const, label: t.journal.newSessionButton, hint: t.journal.composerHintSession };
  const current = [...kinds, session].find((o) => o.mode === mode)!;
  const CurrentIcon = MODE_ICON[mode];

  function pick(next: ComposerMode) {
    onChange(next);
    setOpen(false);
  }

  return (
    // No "relative": the menu is positioned against the whole composer
    // (which is sticky), so on phones it takes its width instead of
    // overflowing to the right from the button's position.
    <div ref={rootRef} className="shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={interpolate(t.journal.kindMenuLabel, { kind: current.label })}
        title={current.label}
        aria-haspopup="menu"
        aria-expanded={open}
        // With a border and an arrow so it reads as a dropdown: without
        // them it looked like a label and "New session" went unnoticed.
        className={[
          "flex h-9 items-center gap-1 rounded-lg border pl-2 pr-1.5 text-sm transition",
          open
            ? "border-gold/60 bg-ink-700 text-parchment"
            : "border-ink-border bg-ink-900/50 text-gold hover:border-gold/50 hover:bg-ink-700/60",
        ].join(" ")}
      >
        <CurrentIcon size={18} />
        {/* The name only fits from tablet up; on phones the icon is enough. */}
        <span className="ml-0.5 hidden font-medium sm:inline">{current.label}</span>
        <IconChevronUpDown size={14} className="text-parchment-dim" />
      </button>

      {open && (
        <div
          role="menu"
          className="animate-fade-up absolute inset-x-3 bottom-full z-40 mb-2 overflow-hidden rounded-2xl border border-ink-border bg-ink-800 py-1.5 shadow-2xl sm:right-auto sm:w-80"
        >
          {kinds.map((o) => {
            const Icon = MODE_ICON[o.mode];
            const selected = o.mode === mode;
            return (
              <button
                key={o.mode}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => pick(o.mode)}
                className={[
                  "flex w-full items-start gap-3 px-4 py-2.5 text-left transition hover:bg-ink-700",
                  selected ? "bg-gold/10" : "",
                ].join(" ")}
              >
                <Icon size={18} className={`mt-0.5 shrink-0 ${selected ? "text-gold" : "text-parchment-dim"}`} />
                <span className="min-w-0">
                  <span className={`block text-sm font-medium ${selected ? "text-gold" : "text-parchment"}`}>
                    {o.label}
                  </span>
                  <span className="block text-xs text-parchment-dim">{o.hint}</span>
                </span>
              </button>
            );
          })}
          {/* Not one more kind of entry but a chapter break: set apart
              below a divider and drawn as an action. */}
          <div role="separator" className="mx-4 my-1.5 border-t border-ink-border" />
          <button
            type="button"
            role="menuitemradio"
            aria-checked={mode === "session"}
            onClick={() => pick("session")}
            className={[
              "flex w-full items-start gap-3 px-4 py-2.5 text-left transition hover:bg-ink-700",
              mode === "session" ? "bg-gold/10" : "",
            ].join(" ")}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-gold/40 bg-gold/10 text-gold">
              <IconSession size={16} />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-sm font-semibold text-gold">{session.label}</span>
              <span className="block text-xs text-parchment-dim">{session.hint}</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
