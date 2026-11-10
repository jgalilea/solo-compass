import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType, type Ref, type RefObject } from "react";
import { useDismiss } from "../hooks/useDismiss";
import { useJournalContext } from "../hooks/useJournalContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { useOracleContext } from "../hooks/useOracleContext";
import { usePlayActions } from "../hooks/usePlayActions";
import { interpolate } from "../lib/i18n";
import { COMPOSER_KINDS, composerShortcut, type ComposerMode } from "../lib/journalUi";
import type { JournalEntry } from "../lib/lonelog";
import { formatDialogue, formatExcerpt, formatScene, nextSceneId, type Speaker } from "../lib/lonelogLines";
import { buildCast, formatTag, type CastMember } from "../lib/lonelogTags";
import { normalizeForSearch } from "../lib/text";
import { fitLikelihood } from "../lib/oracleEngines";
import { getOracle } from "../lib/oracles";
import { SCENE_CHECK_LIKELIHOOD, loadSceneCheck, saveSceneCheck, sceneVerdict, type SceneVerdict } from "../lib/sceneCheck";
import { useTagAutocomplete } from "../hooks/useTagAutocomplete";
import { DialogBody, DialogHeader } from "./Dialog";
import { Modal } from "./Modal";
import { TagSuggestions } from "./TagSuggestions";
import { DiceTool, OracleTool, TableTool } from "./PlayTools";
import {
  IconAction,
  IconChevronUpDown,
  IconConsequence,
  IconDialogue,
  IconDice,
  IconExcerpt,
  IconInsertBelow,
  IconNote,
  IconOracle,
  IconPlus,
  IconSend,
  IconScene,
  IconSearch,
  IconSession,
  IconTable,
} from "./icons/Icons";

type Tool = "oracle" | "table" | "dice";
type IconType = ComponentType<{ size?: number; className?: string }>;

const MODE_ICON: Record<ComposerMode, IconType> = {
  note: IconNote,
  action: IconAction,
  consequence: IconConsequence,
  dialogue: IconDialogue,
  excerpt: IconExcerpt,
  session: IconSession,
  scene: IconScene,
};

/** The selector's order, which Alt+Shift+1…7 follow. */
const MODE_ORDER: ComposerMode[] = ["note", "action", "dialogue", "consequence", "excerpt", "session", "scene"];

/** "Alt+Shift+3" for a mode, as the legend writes it. */
function modeShortcut(mode: ComposerMode, alt: string, shift: string): string {
  return `${alt}+${shift}+${MODE_ORDER.indexOf(mode) + 1}`;
}

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
 * Lonelog typed at the start ("@ ", "=> ", "N (Odile): ", "\\---",
 * "=== ") switches to that entry type (composerShortcut).
 *
 * A question typed as a note or an action (it ends in "?") can be put
 * to the oracle instead, optionally: a button beside "send" (or
 * Ctrl+Enter) logs it with the selected oracle's answer, at even odds.
 * Sending it as usual keeps it a plain entry.
 *
 * With a keyboard, Alt+Shift+1…7 pick the entry type (MODE_ORDER):
 * plain Alt with a number or a letter belongs to the browser (tabs,
 * menus, the address bar).
 *
 * Typing "[" suggests the adventure's characters and places (and
 * offers to name a new one), so Lonelog tags can be written without
 * knowing their syntax: arrows to move, Enter or Tab to pick, Esc to
 * close, or a tap.
 *
 * The kind and the linked roll are kept by the parent, because the
 * desktop panel changes them too: after any roll it switches to
 * "Consequence", which is what usually gets written next.
 *
 * While writing below an entry (insertAfter) a line above the field
 * says where, with a way back to the end.
 *
 * A dialogue line: who speaks is picked above the field (your
 * character or one of the adventure's NPCs, the latest named first, or
 * anyone else by name) and only the words are typed; it's logged as a
 * note in Lonelog's dialogue form (`N (Odile): "…"`). In-world text
 * (a letter, an inscription) is typed as is and logged as a narrative
 * block (`\\---` … `---\\`).
 *
 * A new scene can be tested with the selected oracle, if the player
 * turns it on (a switch above the field, remembered per device): the
 * scene is logged, then the oracle's answer to "Does the scene go as I
 * expected?", and the consequence that follows asks what it means.
 */
export function JournalComposer({
  ref,
  inputRef,
  insertRef,
  adventureId,
  mode,
  onModeChange,
  linkedRollId,
  insertAfter,
  onInsertDone,
  onLogged,
  onRolled,
}: {
  /** The journal measures it so the newest entry isn't left under the composer. */
  ref?: Ref<HTMLDivElement>;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  /** Filled in here: adds text after what's being written (a mention from the notebook). */
  insertRef?: RefObject<((text: string) => void) | null>;
  adventureId: string;
  mode: ComposerMode;
  onModeChange: (mode: ComposerMode) => void;
  linkedRollId: string | undefined;
  /** "Write below": the entry new ones go after, if not the end. */
  insertAfter?: JournalEntry;
  onInsertDone?: () => void;
  /** Something typed by hand was logged. */
  onLogged: () => void;
  /** A tool was rolled (rollId to link the consequence). */
  onRolled: (rollId?: string) => void;
}) {
  const { t } = useLocaleContext();
  const { entries, addEntry } = useJournalContext();
  const { askOracle } = usePlayActions();
  const { oracleId } = useOracleContext();
  const [sceneCheck, setSceneCheck] = useState(loadSceneCheck);
  // The last scene test, so its consequence asks what the answer means.
  const [verdict, setVerdict] = useState<{ rollId: string; verdict: SceneVerdict } | null>(null);
  const [tool, setTool] = useState<Tool | null>(null);
  const [text, setText] = useState("");
  const [speaker, setSpeaker] = useState<Speaker>({ pc: true });
  // Physical keyboard (mouse/trackpad): Enter sends. Checked once; it
  // doesn't change mid-game.
  const [finePointer] = useState(() => window.matchMedia("(pointer: fine)").matches);
  // Session and scene titles are one line: Enter sends them anywhere.
  const marker = mode === "session" || mode === "scene";
  const sendsOnEnter = finePointer || marker;

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

  useEffect(() => {
    if (!insertRef) return;
    insertRef.current = (snippet) => {
      setText((prev) => (prev && !/\s$/.test(prev) ? `${prev} ${snippet} ` : `${prev}${snippet} `));
      // A mention belongs in an entry, not in a session title.
      if (mode === "session") onModeChange("note");
      window.setTimeout(() => {
        const el = inputRef.current;
        el?.focus();
        el?.setSelectionRange(el.value.length, el.value.length);
      }, 0);
    };
    return () => {
      insertRef.current = null;
    };
  }, [insertRef, inputRef, mode, onModeChange]);

  // What a consequence will join (see buildEntryBlocks): the latest
  // entry, unless the session was just opened.
  const latestEntry = useMemo(() => {
    let last: (typeof entries)[number] | undefined;
    for (const e of entries) {
      if (e.adventureId === adventureId && (!last || e.timestamp >= last.timestamp)) last = e;
    }
    return last;
  }, [entries, adventureId]);
  const previous = insertAfter ?? latestEntry;
  const lastEntry = previous && previous.kind !== "session" && previous.kind !== "scene" ? previous : undefined;

  const cast = useMemo(() => buildCast(entries.filter((e) => e.adventureId === adventureId)), [entries, adventureId]);
  // A session title is a single plain line: no tags there.
  const tags = useTagAutocomplete({ text, setText, inputRef, cast, enabled: mode !== "session" });

  // A session title is optional (it falls back to the date), and so is
  // a scene's context (it's numbered anyway); anything else needs text,
  // and a dialogue line someone who says it.
  const canSend = marker || (text.trim() !== "" && (mode !== "dialogue" || speaker.pc || speaker.name.trim() !== ""));
  const pc = cast.find((c) => c.kind === "pc");
  const isQuestion = (mode === "note" || mode === "action") && text.trim().endsWith("?");

  function askFromComposer() {
    const roll = askOracle(text.trim(), fitLikelihood(oracleId, "equilibrado"), adventureId);
    setText("");
    onRolled(roll.id);
  }

  // Alt+Shift+1…7: the entry type, from anywhere on the adventure.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey) return;
      const next = MODE_ORDER[Number(e.code.match(/^Digit([1-7])$/)?.[1] ?? 0) - 1];
      if (!next) return;
      e.preventDefault();
      onModeChange(next);
      inputRef.current?.focus();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onModeChange, inputRef]);

  const placeholder =
    mode === "consequence"
      ? verdict && verdict.rollId === linkedRollId
        ? t.journal.sceneVerdict[verdict.verdict]
        : t.oracle.consequencePlaceholder
      : mode === "dialogue"
        ? speaker.pc
          ? pc
            ? interpolate(t.journal.dialoguePlaceholder, { name: pc.name })
            : t.journal.dialoguePlaceholderPc
          : interpolate(t.journal.dialoguePlaceholder, { name: speaker.name.trim() || "…" })
        : mode === "excerpt"
          ? t.journal.excerptPlaceholder
          : mode === "session"
          ? t.journal.newSessionPlaceholder
          : mode === "scene"
            ? interpolate(t.journal.newScenePlaceholder, { id: nextSceneId(entries.filter((e) => e.adventureId === adventureId)) })
            : t.journal.addPlaceholder;

  function handleSubmit() {
    if (mode === "session") {
      // A session title is a single line (in Lonelog it goes between "===").
      addEntry(adventureId, "session", text.replace(/\s*\n\s*/g, " ").trim() || new Date().toLocaleDateString());
      onModeChange("note");
    } else if (mode === "scene") {
      // Numbered after the adventure's latest scene: "S4 *Tavern, night*".
      const id = nextSceneId(entries.filter((e) => e.adventureId === adventureId));
      addEntry(adventureId, "scene", formatScene(id, text));
      if (sceneCheck) {
        const roll = askOracle(t.journal.sceneCheckQuestion, fitLikelihood(oracleId, SCENE_CHECK_LIKELIHOOD), adventureId);
        setVerdict({ rollId: roll.id, verdict: sceneVerdict(roll) });
        setText("");
        onRolled(roll.id);
        return;
      }
      onModeChange("note");
    } else if (mode === "dialogue") {
      if (!canSend) return;
      addEntry(adventureId, "note", formatDialogue(speaker, text));
    } else if (mode === "excerpt") {
      if (!canSend) return;
      addEntry(adventureId, "note", formatExcerpt(text));
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
      <TagSuggestions state={tags.suggestions} placement="above" />
      {insertAfter ? (
        <p className="mb-2 flex min-w-0 items-center gap-1.5 px-1 text-xs text-parchment-dim">
          <IconInsertBelow size={14} className="shrink-0 text-gold" />
          <span className="shrink-0">{t.journal.insertingAfter}</span>
          <span className="min-w-0 flex-1 truncate italic text-parchment">«{insertAfter.text}»</span>
          <button
            type="button"
            onClick={onInsertDone}
            className="-my-1 shrink-0 rounded-md px-1.5 py-1 font-medium text-gold transition hover:bg-gold/10"
          >
            {t.journal.insertDone}
          </button>
        </p>
      ) : mode === "scene" ? (
        <div className="mb-2 px-1">
          {/* Optional, and says so: off until the player turns it on. */}
          <button
            type="button"
            role="switch"
            aria-checked={sceneCheck}
            onClick={() => {
              setSceneCheck(!sceneCheck);
              saveSceneCheck(!sceneCheck);
            }}
            className="flex items-center gap-2 text-left text-xs text-parchment-dim transition hover:text-parchment"
          >
            <span
              className={[
                "relative h-4 w-7 shrink-0 rounded-full border transition",
                sceneCheck ? "border-gold bg-gold" : "border-ink-border bg-ink-900",
              ].join(" ")}
            >
              <span
                className={[
                  "absolute top-1/2 size-3 -translate-y-1/2 rounded-full transition-all",
                  sceneCheck ? "left-3 bg-ink-950" : "left-0.5 bg-parchment-dim",
                ].join(" ")}
              />
            </span>
            <IconOracle size={14} className={sceneCheck ? "shrink-0 text-gold" : "shrink-0"} />
            <span>
              <span className={sceneCheck ? "font-medium text-parchment" : ""}>{t.journal.sceneCheckLabel}</span>{" "}
              <span className="text-parchment-dim/70">({t.journal.sceneCheckOptional})</span>
            </span>
          </button>
          {sceneCheck && (
            <p className="mt-1.5 text-xs text-parchment-dim">
              {interpolate(t.journal.sceneCheckHint, { oracle: getOracle(oracleId).name })}
            </p>
          )}
        </div>
      ) : mode === "consequence" && (
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
      {mode === "dialogue" && (
        <SpeakerPicker
          speaker={speaker}
          onChange={setSpeaker}
          cast={cast}
          pc={pc}
          onDone={() => inputRef.current?.focus()}
          onAddToNotebook={(name) => {
            addEntry(adventureId, "note", formatTag("npc", name));
            onLogged();
          }}
        />
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
            onChange={(e) => {
              // Lonelog typed at the start picks the entry type (and the
              // symbol goes: the type writes it back on export).
              const shortcut = mode === "session" || mode === "scene" ? null : composerShortcut(e.target.value);
              if (shortcut) {
                onModeChange(shortcut.mode);
                if (shortcut.speaker) setSpeaker(shortcut.speaker);
                setText(shortcut.text);
                return;
              }
              setText(e.target.value);
              tags.onChange(e.target);
            }}
            {...tags.inputProps}
            onKeyDown={(e) => {
              if (tags.onKeyDown(e)) return;
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && isQuestion) {
                e.preventDefault();
                askFromComposer();
                return;
              }
              if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing || !sendsOnEnter) return;
              e.preventDefault();
              handleSubmit();
            }}
            placeholder={placeholder}
            aria-label={placeholder}
            enterKeyHint={sendsOnEnter ? "send" : "enter"}
            className="max-h-40 min-w-0 flex-1 resize-none self-center bg-transparent px-1 py-1.5 text-base text-parchment placeholder:text-parchment-dim/50 focus:outline-none"
          />
          {isQuestion && (
            <button
              type="button"
              onClick={askFromComposer}
              aria-label={t.journal.askFromComposer}
              title={`${t.journal.askFromComposer} (${t.shortcuts.ctrlKey}+${t.shortcuts.enterKey})`}
              className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-gold/50 text-gold transition hover:bg-gold/10 active:scale-95"
            >
              <IconOracle size={18} />
            </button>
          )}
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
          size="lg"
        >
          {/* Tabs instead of a title: go from the oracle to a table
              without closing the sheet (on desktop all three are visible). */}
          <DialogHeader title={openTool.title} onClose={() => setTool(null)}>
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
          </DialogHeader>
          <DialogBody>
            {tool === "oracle" && <OracleTool adventureId={adventureId} onRolled={rolled} autoFocus />}
            {tool === "dice" && <DiceTool adventureId={adventureId} onRolled={rolled} />}
            {tool === "table" && <TableTool adventureId={adventureId} onRolled={rolled} />}
          </DialogBody>
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
  // Dialogue right after the action: what your character does, then says.
  kinds.splice(2, 0, { mode: "dialogue", label: t.journal.kindDialogue, hint: t.journal.composerHintDialogue });
  // In-world text goes last: it's the rarest.
  kinds.push({ mode: "excerpt", label: t.journal.kindExcerpt, hint: t.journal.composerHintExcerpt });
  const markers = [
    { mode: "session" as const, label: t.journal.newSessionButton, hint: t.journal.composerHintSession },
    { mode: "scene" as const, label: t.journal.newSceneButton, hint: t.journal.composerHintScene },
  ];
  const current = [...kinds, ...markers].find((o) => o.mode === mode)!;
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
          className="animate-fade-up absolute inset-x-3 bottom-full z-40 mb-2 max-h-[calc(100dvh-12rem)] overflow-y-auto overscroll-contain rounded-2xl border border-ink-border bg-ink-800 py-1.5 shadow-2xl sm:right-auto sm:w-96"
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
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-medium ${selected ? "text-gold" : "text-parchment"}`}>
                    {o.label}
                  </span>
                  <span className="block text-xs text-parchment-dim">{o.hint}</span>
                </span>
                <ShortcutHint mode={o.mode} />
              </button>
            );
          })}
          {/* Not more kinds of entry but breaks (a chapter, a scene):
              set apart below a divider and drawn as actions. */}
          <div role="separator" className="mx-4 my-1.5 border-t border-ink-border" />
          {markers.map((o) => {
            const Icon = MODE_ICON[o.mode];
            return (
              <button
                key={o.mode}
                type="button"
                role="menuitemradio"
                aria-checked={mode === o.mode}
                onClick={() => pick(o.mode)}
                className={[
                  "flex w-full items-start gap-3 px-4 py-2.5 text-left transition hover:bg-ink-700",
                  mode === o.mode ? "bg-gold/10" : "",
                ].join(" ")}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-gold/40 bg-gold/10 text-gold">
                  <Icon size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-gold">{o.label}</span>
                  <span className="block text-xs text-parchment-dim">{o.hint}</span>
                </span>
                <ShortcutHint mode={o.mode} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** How many NPCs get a chip of their own; the rest are found by name. */
const SPEAKER_CHIPS = 4;

/** The entry type's shortcut, only where there's a keyboard. */
function ShortcutHint({ mode }: { mode: ComposerMode }) {
  const { t } = useLocaleContext();
  return (
    <kbd className="mt-0.5 hidden shrink-0 font-sans text-[0.65rem] text-parchment-dim/60 any-pointer-fine:block">
      {modeShortcut(mode, t.shortcuts.altKey, t.shortcuts.shiftKey)}
    </kbd>
  );
}

/**
 * Who says the dialogue line: your character and the NPCs named most
 * recently (the ones in the scene, usually) as chips; anyone else is
 * found by name in "Other", which searches every NPC in the notebook
 * and takes a new name as typed. A long cast never makes the row
 * longer than one or two lines.
 */
function SpeakerPicker({
  speaker,
  onChange,
  cast,
  pc,
  onDone,
  onAddToNotebook,
}: {
  speaker: Speaker;
  onChange: (speaker: Speaker) => void;
  cast: CastMember[];
  pc: CastMember | undefined;
  /** Picked from the search with the keyboard: on to the words. */
  onDone: () => void;
  /** A name typed by hand becomes an NPC of the notebook. */
  onAddToNotebook: (name: string) => void;
}) {
  const { t } = useLocaleContext();
  const npcs = useMemo(() => cast.filter((c) => c.kind === "npc").sort((a, b) => b.lastSeen - a.lastSeen), [cast]);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  // Not useDismiss: the arrows belong to the search here, not to the chips.
  useEffect(() => {
    if (!searching) return;
    function handlePointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setSearching(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [searching]);

  // The recent ones, plus whoever was picked from the search.
  const chips = npcs.slice(0, SPEAKER_CHIPS);
  const picked = !speaker.pc ? npcs.find((c) => c.name === speaker.name) : undefined;
  if (picked && !chips.includes(picked)) chips.push(picked);
  // A name typed by hand, not in the notebook: its own chip, selected.
  const typed = !speaker.pc && !picked && speaker.name.trim() ? speaker.name.trim() : null;

  const matches = query.trim()
    ? npcs.filter((c) => normalizeForSearch(c.name).includes(normalizeForSearch(query.trim())))
    : npcs;

  function pick(next: Speaker) {
    onChange(next);
    setSearching(false);
    setQuery("");
  }

  // Enter: the highlighted match, or the name as typed.
  function accept() {
    const match = matches[active];
    if (match) pick({ pc: false, name: match.name });
    else if (query.trim()) pick({ pc: false, name: query.trim() });
    else return;
    onDone();
  }

  const chip = (selected: boolean) =>
    [
      "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition",
      selected ? "border-gold bg-gold text-ink-950" : "border-ink-border text-parchment-dim hover:border-gold/50 hover:text-gold",
    ].join(" ");

  return (
    <div ref={rootRef} className="relative mb-2 flex items-start gap-1.5 px-1">
      <span id="dialogue-speaker" className="shrink-0 py-1 text-xs text-parchment-dim">
        {t.journal.dialogueSpeaker}
      </span>
      <div role="radiogroup" aria-labelledby="dialogue-speaker" className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
        <button type="button" role="radio" aria-checked={speaker.pc} onClick={() => pick({ pc: true })} className={chip(speaker.pc)}>
          {pc?.name ?? t.journal.dialoguePc}
        </button>
        {chips.map((npc) => {
          const selected = !speaker.pc && speaker.name === npc.name;
          return (
            <button
              key={npc.key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => pick({ pc: false, name: npc.name })}
              className={chip(selected)}
            >
              {npc.name}
            </button>
          );
        })}
        {typed && !searching && (
          <>
            <button type="button" role="radio" aria-checked onClick={() => setSearching(true)} className={chip(true)}>
              {typed}
            </button>
            {/* Not in the notebook yet: one tap names them there. */}
            <button
              type="button"
              onClick={() => onAddToNotebook(typed)}
              title={interpolate(t.journal.dialogueAddToNotebookTitle, { name: typed })}
              className="flex shrink-0 items-center gap-1 rounded-full px-1.5 py-1 text-xs font-medium text-gold transition hover:text-gold-soft"
            >
              <IconPlus size={12} />
              {t.journal.dialogueAddToNotebook}
            </button>
          </>
        )}
        {searching ? (
          <input
            autoFocus
            role="combobox"
            aria-expanded={matches.length > 0}
            aria-controls="dialogue-speaker-list"
            aria-activedescendant={matches[active] ? `dialogue-speaker-${active}` : undefined}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                const step = e.key === "ArrowDown" ? 1 : -1;
                setActive((i) => (matches.length ? (i + step + matches.length) % matches.length : 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                accept();
              } else if (e.key === "Escape") {
                e.stopPropagation();
                setSearching(false);
              }
            }}
            placeholder={t.journal.dialogueOtherName}
            aria-label={t.journal.dialogueOtherName}
            className="h-7 w-40 shrink-0 rounded-full border border-gold bg-ink-900/70 px-3 text-base text-parchment placeholder:text-parchment-dim/50 focus:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setSearching(true);
              setActive(0);
            }}
            aria-haspopup="listbox"
            className={`${chip(false)} flex items-center gap-1`}
          >
            <IconSearch size={12} />
            {t.journal.dialogueOther}
          </button>
        )}
      </div>
      {searching && matches.length > 0 && (
        <ul
          id="dialogue-speaker-list"
          role="listbox"
          aria-label={t.journal.dialogueOtherName}
          className="animate-fade-up absolute inset-x-0 bottom-full z-40 mb-2 max-h-60 overflow-y-auto overscroll-contain rounded-2xl border border-ink-border bg-ink-800 py-1.5 shadow-2xl sm:right-auto sm:w-72"
        >
          {matches.map((npc, i) => (
            <li
              key={npc.key}
              id={`dialogue-speaker-${i}`}
              role="option"
              aria-selected={i === active}
              // Before the input loses focus, so the pick isn't lost.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick({ pc: false, name: npc.name })}
              className={[
                "flex cursor-pointer flex-col px-4 py-1.5 text-sm transition hover:bg-ink-700",
                i === active ? "bg-ink-700" : "",
              ].join(" ")}
            >
              <span className="truncate text-parchment">{npc.name}</span>
              {npc.tags.length > 0 && <span className="truncate text-xs text-parchment-dim">{npc.tags.join(" · ")}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
