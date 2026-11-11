import { useEffect, useMemo, useRef, useState } from "react";
import { useJournalContext } from "../hooks/useJournalContext";
import { useHistoryContext } from "../hooks/useHistoryContext";
import { createDiceRollEntries, type DiceRollEntry } from "../lib/history";
import { loadCardSettings, saveCardSettings, type CardSettings } from "../lib/cardSettings";
import { isCardDraw, showDraws } from "../lib/cards";
import { CardControls } from "./CardControls";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { usePlayActions } from "../hooks/usePlayActions";
import { fitLikelihood, oracleLevels } from "../lib/oracleEngines";
import { useOracleContext } from "../hooks/useOracleContext";
import type { MeaningTable } from "../lib/tables";
import { loadFavoriteTableIds } from "../lib/tableFavorites";
import { gameOfTable } from "../lib/tableGames";
import { useMeaningTables } from "../hooks/useMeaningTables";
import { normalizeForSearch } from "../lib/text";
import { INPUT_CLASS } from "../lib/journalUi";
import { interpolate } from "../lib/i18n";
import { DiceHelp } from "./DiceHelp";
import { rollFormula, withEdge, type Edge } from "../lib/diceNotation";
import { isRollable, rollSaved, savedRollLabel } from "../lib/savedRolls";
import { BUILTIN_DICE, formatDieRoll, formatFudgeRoll, rollDie, rollFudgeSet, type BuiltinDie } from "../lib/dice";
import { loadFavoriteDice } from "../lib/diceFavorites";
import { Link } from "react-router-dom";
import { useSavedRollsContext } from "../hooks/useSavedRollsContext";
import { LikelihoodPicker } from "./LikelihoodPicker";
import { OracleHelp } from "./OracleHelp";
import { OracleSwitcher } from "./OracleSwitcher";
import { TwistCounter } from "./TwistCounter";
import { IconCards, IconCheck, IconClose, IconDice, IconGenerator, IconPlus, IconSearch, IconSparkles, IconStar } from "./icons/Icons";
import { useGeneratorsContext } from "../hooks/useGeneratorsContext";
import { generatorGames, generatorTables } from "../lib/generators";

/**
 * The three tools of an adventure's "game table": oracle, dice and
 * tables. They're the same in the sheet opened from the composer
 * (phone/tablet) and in the fixed right-hand panel (desktop).
 * Everything is logged to `adventureId` (active or not) and reported
 * through `onRolled` so the journal scrolls down to it and the
 * composer switches to "Consequence".
 */

interface ToolProps {
  adventureId: string;
  /** rollId: the history roll the consequence links to. */
  onRolled: (rollId?: string) => void;
}

export function OracleTool({ adventureId, onRolled, autoFocus = false }: ToolProps & { autoFocus?: boolean }) {
  const { t } = useLocaleContext();
  const { askOracle } = usePlayActions();
  const [question, setQuestion] = useState("");
  const { oracleId, likelihood, setLikelihood } = useOracleContext();
  const level = fitLikelihood(oracleId, likelihood);

  return (
    <form
      data-hotkey="oracle"
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onRolled(askOracle(question, level, adventureId).id);
        setQuestion("");
      }}
    >
      {/* Which oracle answers, switchable here too, with its rules and odds. */}
      <div className="flex items-center gap-2.5">
        <OracleSwitcher />
        <TwistCounter adventureId={adventureId} />
        <OracleHelp />
      </div>
      <input
        autoFocus={autoFocus}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        aria-label={t.oracle.questionLabel}
        placeholder={t.oracle.questionPlaceholder}
        enterKeyHint="go"
        className={`${INPUT_CLASS} flex-none bg-ink-900/70`}
      />
      <LikelihoodPicker value={level} onChange={setLikelihood} levels={oracleLevels(oracleId)} />
      <button
        type="submit"
        className="w-full rounded-xl bg-gold py-2.5 text-base font-semibold text-ink-950 transition hover:bg-gold-soft active:scale-[0.99]"
      >
        {t.oracle.rollButton}
      </button>
    </form>
  );
}

export function TableTool({ adventureId, onRolled }: ToolProps) {
  const { t } = useLocaleContext();
  const { rollTable, rollInspiration, rollGenerator } = usePlayActions();
  const { generators, load: loadGenerators } = useGeneratorsContext();
  useEffect(() => loadGenerators(), [loadGenerators]);
  const [query, setQuery] = useState("");
  const favorites = useMemo(() => loadFavoriteTableIds(), []);
  // Only the favourites are listed; the rest are reached by searching,
  // so a long list of tables doesn't push everything else out of sight.
  // Likewise, only the favourites' games are loaded until you search.
  const q = normalizeForSearch(query.trim());
  const favoriteGames = useMemo(
    () => [
      "solo-compass" as const,
      ...[...favorites].map(gameOfTable).filter((id) => id !== undefined),
      // What the player's generators roll on.
      ...generatorGames(generators),
    ],
    [favorites, generators],
  );
  const { all, blocks, inspiration } = useMeaningTables(q ? "all" : favoriteGames);
  const loading = blocks.some((b) => b.status === "loading");
  const visible = q
    ? all.filter(
        (table) =>
          normalizeForSearch(table.name).includes(q) ||
          normalizeForSearch(table.game.name).includes(q) ||
          (!!table.theme && normalizeForSearch(t.tables.themes[table.theme]).includes(q)),
      )
    : all.filter((table) => favorites.has(table.id));

  function roll(table: MeaningTable) {
    onRolled(rollTable(table, adventureId, all).id);
  }

  return (
    <div data-hotkey="table" className="@container flex flex-col gap-2">
      {/* Action + theme in one go: the quickest way out of a blank. */}
      <button
        type="button"
        onClick={() => inspiration && onRolled(rollInspiration(inspiration, adventureId).id)}
        disabled={!inspiration}
        title={t.tables.inspirationDescription}
        className="flex w-full items-center gap-2 rounded-xl border border-gold/50 bg-gold/10 px-3.5 py-2.5 text-left transition hover:bg-gold/20 active:scale-[0.99]"
      >
        <IconSparkles size={16} className="shrink-0 text-gold" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-gold">{t.tables.inspirationTitle}</span>
      </button>
      {/* The player's generators: several tables, one entry. */}
      {generators.length > 0 && (
        <ul className="grid gap-1.5 @lg:grid-cols-2">
          {generators.map((generator) => {
            const tables = generatorTables(generator, all);
            return (
              <li key={generator.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => onRolled(rollGenerator(generator.name, tables, adventureId, all).id)}
                  disabled={tables.length === 0}
                  title={tables.map((table) => table.name).join(" · ")}
                  className="flex w-full items-center gap-2 rounded-xl border border-gold/40 bg-ink-900/40 px-3.5 py-2.5 text-left transition hover:border-gold/70 active:scale-[0.99] disabled:opacity-60"
                >
                  <IconGenerator size={16} className="shrink-0 text-gold" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-parchment">{generator.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <label className="relative flex">
        <IconSearch size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-parchment-faint" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.tables.searchPlaceholder}
          aria-label={t.tables.searchLabel}
          className={`${INPUT_CLASS} bg-ink-900/70 py-2 pl-9 text-sm`}
        />
      </label>
      {visible.length === 0 && (
        <p className="px-1 text-xs text-parchment-faint">
          {loading
            ? t.common.loading
            : q
              ? interpolate(t.tables.noResultsDescription, { query: query.trim() })
              : t.tables.toolTableHint}
        </p>
      )}
      {/* Two columns when there's room (the sheet on tablet), one in the narrow panel. */}
      <ul className="grid gap-1.5 @lg:grid-cols-2">
        {visible.map((table) => (
          // min-w-0: a long name truncates instead of widening the column.
          <li key={table.id} className="min-w-0">
            <button
              type="button"
              onClick={() => roll(table)}
              title={table.description}
              className="flex w-full items-center gap-2 rounded-xl border border-ink-border bg-ink-900/40 px-3.5 py-2.5 text-left transition hover:border-gold/50 active:scale-[0.99]"
            >
              {favorites.has(table.id) && <IconStar size={14} filled className="shrink-0 text-gold" />}
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-parchment">{table.name}</span>
              {/* Two games can share a table name (Action). */}
              {table.game.tag && <span className="shrink-0 text-xs text-parchment-faint">{table.game.tag}</span>}
              <span className="shrink-0 rounded-md border border-gold/40 px-1.5 py-0.5 text-xs font-medium text-gold">
                {table.dice}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Rolls from your own system: they accumulate ("d20 -> 14, d6 -> 3")
 * with an optional text in front, and are logged together as a single
 * "Roll" entry — so they show up in the journal as one group. Besides
 * the single dice and a typed formula ("2d6+3", "4d6kh3", "5d6>=5";
 * see rollFormula). Advantage/disadvantage is a switch for the next
 * roll, whichever it is: rolled twice, keeping the higher or lower.
 *
 * The dice are the built-in ones and the player's own (a name and a
 * formula, savedRolls.ts): on the game table only the favorites (the
 * ones most used), on the Dice screen all of them (`dice="all"`). A
 * formula typed here can be kept as a favorite die of one's own.
 * Every roll is kept in the history too (to star it there); with no
 * adventure (the Dice screen with none active) that's all it does.
 * A switch turns it into a deck of cards (CardControls): the same tray,
 * a card drawn instead of a die rolled.
 */
export function DiceTool({
  adventureId,
  onRolled,
  dice = "favorites",
}: Omit<ToolProps, "adventureId"> & { adventureId?: string; dice?: "favorites" | "all" }) {
  const { t } = useLocaleContext();
  const { addEntry } = useJournalContext();
  const { rolls: savedRolls, load: loadSavedRolls, addRoll } = useSavedRollsContext();
  const { addEntry: addHistoryEntry } = useHistoryContext();
  useEffect(() => loadSavedRolls(), [loadSavedRolls]);
  const [favoriteDice] = useState(loadFavoriteDice);
  const builtins = dice === "all" ? BUILTIN_DICE : BUILTIN_DICE.filter((d) => favoriteDice.has(d));
  const own = dice === "all" ? savedRolls : savedRolls.filter((r) => r.favorite);
  const [label, setLabel] = useState("");
  const [tray, setTray] = useState<TrayItem[]>([]);
  const rolls = tray.map((item) => item.text);
  const [formula, setFormula] = useState("");
  const [formulaError, setFormulaError] = useState(false);
  const [edge, setEdge] = useState<Edge | null>(null);
  const formulaRef = useRef<HTMLInputElement>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [cards, setCards] = useState(loadCardSettings);
  function changeCards(next: CardSettings) {
    setCards(next);
    saveCardSettings(next);
  }
  // A formula the dice can read, not saved yet: it can become a saved roll.
  const canSave =
    !justSaved && isRollable(formula) && !savedRolls.some((r) => r.formula === formula.trim() && r.name === label.trim());

  // The tray is a preview: nothing is kept until it's logged (journal
  // and history) or, with no adventure, saved to the history. A card in
  // it is out of the deck meanwhile; taken off, it's back.
  function add(roll: string, card?: DiceRollEntry["card"]) {
    setTray((prev) => [...prev, { text: roll, card }]);
    setEdge(null);
  }

  function removeFromTray(items: TrayItem[]) {
    const gone = new Set(items);
    setTray((prev) => prev.filter((item) => !gone.has(item)));
  }

  function rollTyped() {
    const roll = rollFormula(edge ? withEdge(formula, edge) : formula);
    setFormulaError(!roll);
    if (roll) add(roll);
  }

  function log() {
    if (rolls.length === 0) return;
    const text = (roll: string) => [label.trim(), roll].filter(Boolean).join(" ");
    for (const entry of createDiceRollEntries(tray.map((item) => ({ text: text(item.text), card: item.card })), adventureId)) {
      addHistoryEntry(entry);
    }
    setTray([]);
    setLabel("");
    if (!adventureId) return;
    addEntry(adventureId, "roll", text(rolls.join(", ")));
    onRolled();
  }

  return (
    <div data-hotkey="dice" className="flex flex-col gap-3">
      <div role="group" aria-label={t.dice.toolLabel} className="grid grid-cols-2 gap-1 rounded-xl border border-ink-border bg-ink-900/60 p-1">
        {(
          [
            ["dice", t.dice.toolDice, IconDice],
            ["cards", t.dice.toolCards, IconCards],
          ] as const
        ).map(([id, name, Icon]) => (
          <button
            key={id}
            type="button"
            aria-pressed={cards.tool === id}
            onClick={() => changeCards({ ...cards, tool: id })}
            className={[
              "flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-sm transition",
              cards.tool === id ? "bg-gold font-medium text-ink-950" : "text-parchment-dim hover:text-parchment",
            ].join(" ")}
          >
            <Icon size={16} />
            {name}
          </button>
        ))}
      </div>
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder={t.journal.diceLabelPlaceholder}
        className={`${INPUT_CLASS} flex-none bg-ink-900/70 text-sm`}
      />
      {cards.tool === "cards" ? (
        <CardControls
          adventureId={adventureId}
          settings={cards}
          inTray={tray.flatMap((item) => (item.card ? [item.card] : []))}
          onChange={changeCards}
          onDraw={add}
        />
      ) : (
        <>
        <div role="group" aria-label={t.journal.diceRollerLabel} className="flex flex-wrap gap-1.5">
          {builtins.map((die) => (
            <button
              key={die}
              type="button"
              onClick={() => add(rollBuiltin(die, edge ?? undefined))}
              className="rounded-lg border border-ink-border px-2.5 py-1.5 text-xs font-medium text-parchment-dim transition hover:border-gold/50 hover:text-gold active:scale-95"
            >
              {die}
            </button>
          ))}
          {/* The player's own dice: their name, in the accent colour. */}
          {own.map((roll) => (
            <button
              key={roll.id}
              type="button"
              onClick={() => add(rollSaved(roll, edge ?? undefined)!)}
              title={roll.formula}
              className="rounded-lg border border-gold/40 bg-gold/10 px-2.5 py-1.5 text-xs font-medium text-gold transition hover:bg-gold/20 active:scale-95"
            >
              {savedRollLabel(roll)}
            </button>
          ))}
          {builtins.length + own.length === 0 && (
            <p className="text-xs text-parchment-dim">
              {t.dice.noFavorites}{" "}
              <Link to="/dados" className="font-medium text-gold underline decoration-dotted hover:text-gold-soft">
                {t.dice.title}
              </Link>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ["advantage", t.journal.diceAdvantage],
              ["disadvantage", t.journal.diceDisadvantage],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={edge === id}
              onClick={() => setEdge((current) => (current === id ? null : id))}
              className={[
                "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition active:scale-95",
                edge === id
                  ? "border-gold bg-gold text-ink-950"
                  : "border-ink-border text-parchment-dim hover:border-gold/50 hover:text-gold",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
          <span className="ml-auto flex">
            <DiceHelp />
          </span>
        </div>
        {edge && (
          <p aria-live="polite" className="-mt-1 text-xs text-gold">
            {edge === "advantage" ? t.journal.diceAdvantageHint : t.journal.diceDisadvantageHint}
          </p>
        )}
        <form
          className="flex gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            rollTyped();
          }}
        >
          <div className="relative flex min-w-0 flex-1">
            <input
              ref={formulaRef}
              value={formula}
              onChange={(e) => {
                setFormula(e.target.value);
                setFormulaError(false);
              }}
              placeholder={t.journal.diceFormulaPlaceholder}
              aria-label={t.journal.diceFormulaLabel}
              aria-invalid={formulaError}
              enterKeyHint="go"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className={`${INPUT_CLASS} min-w-0 flex-1 bg-ink-900/70 py-1.5 pr-9 text-sm`}
            />
            {formula && (
              <button
                type="button"
                onClick={() => {
                  setFormula("");
                  setFormulaError(false);
                  formulaRef.current?.focus();
                }}
                aria-label={t.journal.diceFormulaClear}
                title={t.journal.diceFormulaClear}
                className="absolute inset-y-0 right-1.5 my-auto flex size-7 items-center justify-center rounded-md text-parchment-dim transition hover:text-parchment"
              >
                <IconClose size={15} />
              </button>
            )}
          </div>
          {canSave && (
            <button
              type="button"
              onClick={() => {
                addRoll({ name: label.trim(), formula }, true);
                setJustSaved(true);
                window.setTimeout(() => setJustSaved(false), 1500);
              }}
              aria-label={t.dice.saveFormula}
              title={t.dice.saveFormulaHint}
              className="flex shrink-0 items-center rounded-lg border border-ink-border px-3 text-parchment-dim transition hover:border-gold/50 hover:text-gold active:scale-95"
            >
              <IconStar size={16} />
            </button>
          )}
          {justSaved && (
            <span role="status" className="flex shrink-0 items-center px-1 text-gold" title={t.dice.saved}>
              <IconCheck size={16} />
            </span>
          )}
          {/* Adds to the tray like a die button, so it looks like one. */}
          <button
            type="submit"
            disabled={!formula.trim()}
            aria-label={t.journal.diceFormulaRoll}
            title={t.journal.diceFormulaRoll}
            className="flex shrink-0 items-center rounded-lg border border-ink-border px-3 text-parchment-dim transition hover:border-gold/50 hover:text-gold active:scale-95 disabled:text-parchment-dim/40 disabled:hover:border-ink-border"
          >
            <IconPlus size={16} />
          </button>
        </form>
        {formulaError && (
          <p role="alert" className="text-xs text-no">
            {t.journal.diceFormulaError}
          </p>
        )}
        </>
      )}
      {/* The tray: every roll waits here until it's logged as one entry.
          It and its buttons are always there, a row of chips high, so
          rolling or clearing doesn't push what's below up and down. */}
      <div
        aria-live="polite"
        aria-label={t.journal.diceTrayLabel}
        className={[
          "flex min-h-12 items-center rounded-xl border p-2",
          rolls.length === 0 ? "border-dashed border-ink-border" : "border-ink-border bg-ink-900/50",
        ].join(" ")}
      >
        {rolls.length === 0 ? (
          <p className="px-1 text-xs text-parchment-faint">
            {cards.tool === "cards"
              ? adventureId
                ? t.dice.cardsHint
                : t.dice.cardsTrayHint
              : adventureId
                ? t.journal.diceHint
                : t.dice.trayHint}
          </p>
        ) : (
          <ul className="flex w-full flex-wrap gap-1.5">
            {tray.map((item, i) => (
              <li
                key={i}
                className="flex items-center gap-1 rounded-lg border border-ink-border bg-ink-800 py-1 pl-2.5 pr-1 text-sm text-parchment"
              >
                <span className="break-all">{trayText(item.text)}</span>
                <button
                  type="button"
                  onClick={() => removeFromTray([item])}
                  aria-label={interpolate(t.journal.diceRemove, { roll: trayText(item.text) })}
                  title={interpolate(t.journal.diceRemove, { roll: trayText(item.text) })}
                  className="shrink-0 rounded-md p-0.5 text-parchment-dim transition hover:text-no"
                >
                  <IconClose size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => removeFromTray(tray)}
          disabled={rolls.length === 0}
          className="rounded-xl px-3 py-2 text-sm text-parchment-dim transition hover:text-parchment disabled:opacity-40 disabled:hover:text-parchment-dim"
        >
          {t.journal.diceClear}
        </button>
        {/* With no adventure there's no journal: they go to the history only. */}
        <button
          type="button"
          onClick={log}
          disabled={rolls.length === 0}
          className="flex-1 rounded-xl bg-gold py-2 text-sm font-semibold text-ink-950 transition hover:bg-gold-soft active:scale-[0.99] disabled:bg-ink-800 disabled:font-medium disabled:text-parchment-faint disabled:active:scale-100"
        >
          {!adventureId
            ? t.dice.saveToHistory
            : rolls.length === 1
              ? t.journal.diceLog
              : interpolate(t.journal.diceLogMany, { count: rolls.length })}
        </button>
      </div>
    </div>
  );
}

/** A roll waiting in the tray (a card keeps which, so it's out of the deck meanwhile). */
interface TrayItem {
  text: string;
  card?: DiceRollEntry["card"];
}

/** A roll in the tray: a card as "Q♠ Reina de picas", dice as written. */
function trayText(roll: string): string {
  return isCardDraw(roll) ? showDraws(roll).replace(" -> ", " ") : roll;
}

/** A built-in die's roll as the journal writes it ("d6 -> 4", "4dF -> +1 (+ 0 + −)"). */
function rollBuiltin(die: BuiltinDie, edge?: Edge): string {
  if (edge) return rollFormula(withEdge(die, edge))!;
  if (die === "4dF") return formatFudgeRoll(rollFudgeSet());
  const sides = die === "d%" ? 100 : Number(die.slice(1));
  return formatDieRoll(sides, rollDie(sides));
}
