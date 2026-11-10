import { useEffect, useMemo, useRef, useState } from "react";
import { useJournalContext } from "../hooks/useJournalContext";
import { useHistoryContext } from "../hooks/useHistoryContext";
import { createDiceRollEntry } from "../lib/history";
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
import { IconCheck, IconClose, IconPlus, IconSearch, IconSparkles, IconStar } from "./icons/Icons";

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
  const { rollTable, rollInspiration } = usePlayActions();
  const [query, setQuery] = useState("");
  const favorites = useMemo(() => loadFavoriteTableIds(), []);
  // Only the favourites are listed; the rest are reached by searching,
  // so a long list of tables doesn't push everything else out of sight.
  // Likewise, only the favourites' games are loaded until you search.
  const q = normalizeForSearch(query.trim());
  const favoriteGames = useMemo(
    () => ["solo-compass" as const, ...[...favorites].map(gameOfTable).filter((id) => id !== undefined)],
    [favorites],
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
      <label className="relative flex">
        <IconSearch size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-parchment-dim/60" />
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
        <p className="px-1 text-xs text-parchment-dim/70">
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
              {table.game.tag && <span className="shrink-0 text-xs text-parchment-dim/70">{table.game.tag}</span>}
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
  const [rolls, setRolls] = useState<string[]>([]);
  const [formula, setFormula] = useState("");
  const [formulaError, setFormulaError] = useState(false);
  const [edge, setEdge] = useState<Edge | null>(null);
  const formulaRef = useRef<HTMLInputElement>(null);
  const [justSaved, setJustSaved] = useState(false);
  // A formula the dice can read, not saved yet: it can become a saved roll.
  const canSave =
    !justSaved && isRollable(formula) && !savedRolls.some((r) => r.formula === formula.trim() && r.name === label.trim());

  // Every roll goes to the history as it's made, like the oracle's and
  // the tables' (and can be starred there); the tray only gathers what
  // goes into the journal.
  function add(roll: string) {
    setRolls((prev) => [...prev, roll]);
    setEdge(null);
    addHistoryEntry(createDiceRollEntry([label.trim(), roll].filter(Boolean).join(" "), adventureId));
  }

  function rollTyped() {
    const roll = rollFormula(edge ? withEdge(formula, edge) : formula);
    setFormulaError(!roll);
    if (roll) add(roll);
  }

  function log() {
    if (rolls.length === 0 || !adventureId) return;
    addEntry(adventureId, "roll", [label.trim(), rolls.join(", ")].filter(Boolean).join(" "));
    setRolls([]);
    setLabel("");
    onRolled();
  }

  return (
    <div data-hotkey="dice" className="flex flex-col gap-3">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder={t.journal.diceLabelPlaceholder}
        className={`${INPUT_CLASS} flex-none bg-ink-900/70 text-sm`}
      />
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
      {/* The tray: every roll waits here until it's logged as one entry. */}
      <div
        aria-live="polite"
        aria-label={t.journal.diceTrayLabel}
        className={[
          "rounded-xl border p-2",
          rolls.length === 0 ? "border-dashed border-ink-border" : "border-ink-border bg-ink-900/50",
        ].join(" ")}
      >
        {rolls.length === 0 ? (
          <p className="px-1 py-0.5 text-xs text-parchment-dim/70">{adventureId ? t.journal.diceHint : t.dice.trayHint}</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {rolls.map((roll, i) => (
              <li
                key={i}
                className="flex items-center gap-1 rounded-lg border border-ink-border bg-ink-800 py-1 pl-2.5 pr-1 text-sm text-parchment"
              >
                <span className="break-all">{roll}</span>
                <button
                  type="button"
                  onClick={() => setRolls((prev) => prev.filter((_, j) => j !== i))}
                  aria-label={interpolate(t.journal.diceRemove, { roll })}
                  title={interpolate(t.journal.diceRemove, { roll })}
                  className="shrink-0 rounded-md p-0.5 text-parchment-dim transition hover:text-no"
                >
                  <IconClose size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {rolls.length > 0 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRolls([])}
            className="rounded-xl px-3 py-2 text-sm text-parchment-dim transition hover:text-parchment"
          >
            {t.journal.diceClear}
          </button>
          {/* With no adventure there's nowhere to log them (the Dice
              screen says so above). */}
          {adventureId && (
            <button
              type="button"
              onClick={log}
              className="flex-1 rounded-xl bg-gold py-2 text-sm font-semibold text-ink-950 transition hover:bg-gold-soft active:scale-[0.99]"
            >
              {rolls.length === 1 ? t.journal.diceLog : interpolate(t.journal.diceLogMany, { count: rolls.length })}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** A built-in die's roll as the journal writes it ("d6 -> 4", "4dF -> +1 (+ 0 + −)"). */
function rollBuiltin(die: BuiltinDie, edge?: Edge): string {
  if (edge) return rollFormula(withEdge(die, edge))!;
  if (die === "4dF") return formatFudgeRoll(rollFudgeSet());
  const sides = die === "d%" ? 100 : Number(die.slice(1));
  return formatDieRoll(sides, rollDie(sides));
}
