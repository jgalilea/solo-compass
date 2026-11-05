import { useMemo, useState } from "react";
import { useJournalContext } from "../hooks/useJournalContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { usePlayActions } from "../hooks/usePlayActions";
import type { Likelihood } from "../lib/oracle";
import type { MeaningTable } from "../lib/tables";
import { loadFavoriteTableIds } from "../lib/tableFavorites";
import { useMeaningTables } from "../hooks/useMeaningTables";
import { normalizeForSearch } from "../lib/text";
import { INPUT_CLASS } from "../lib/journalUi";
import { interpolate } from "../lib/i18n";
import { DiceRoller } from "./DiceRoller";
import { LikelihoodPicker } from "./LikelihoodPicker";
import { IconSearch, IconSparkles, IconStar } from "./icons/Icons";

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
  const [likelihood, setLikelihood] = useState<Likelihood>("equilibrado");

  return (
    <form
      data-hotkey="oracle"
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onRolled(askOracle(question, likelihood, adventureId).id);
        setQuestion("");
      }}
    >
      <input
        autoFocus={autoFocus}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        aria-label={t.oracle.questionLabel}
        placeholder={t.oracle.questionPlaceholder}
        enterKeyHint="go"
        className={`${INPUT_CLASS} flex-none bg-ink-900/70`}
      />
      <LikelihoodPicker value={likelihood} onChange={setLikelihood} />
      <button
        type="submit"
        className="w-full rounded-xl bg-gold py-2.5 font-display text-base font-semibold text-ink-950 transition hover:bg-gold-soft active:scale-[0.99]"
      >
        {t.oracle.rollButton}
      </button>
    </form>
  );
}

export function TableTool({ adventureId, onRolled }: ToolProps) {
  const { t } = useLocaleContext();
  const { rollTable, rollInspiration } = usePlayActions();
  const { all } = useMeaningTables();
  const [query, setQuery] = useState("");
  const favorites = useMemo(() => loadFavoriteTableIds(), []);
  // Only the favourites are listed; the rest are reached by searching,
  // so a long list of tables doesn't push everything else out of sight.
  const q = normalizeForSearch(query.trim());
  const visible = q
    ? all.filter((table) => normalizeForSearch(table.name).includes(q))
    : all.filter((table) => favorites.has(table.id));

  function roll(table: MeaningTable) {
    onRolled(rollTable(table, adventureId).id);
  }

  return (
    <div data-hotkey="table" className="@container flex flex-col gap-2">
      {/* Action + theme in one go: the quickest way out of a blank. */}
      <button
        type="button"
        onClick={() => onRolled(rollInspiration(adventureId).id)}
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
          {q ? interpolate(t.tables.noResultsDescription, { query: query.trim() }) : t.tables.toolTableHint}
        </p>
      )}
      {/* Two columns when there's room (the sheet on tablet), one in the narrow panel. */}
      <ul className="grid gap-1.5 @lg:grid-cols-2">
        {visible.map((table) => (
          <li key={table.id}>
            <button
              type="button"
              onClick={() => roll(table)}
              title={table.description}
              className="flex w-full items-center gap-2 rounded-xl border border-ink-border bg-ink-900/40 px-3.5 py-2.5 text-left transition hover:border-gold/50 active:scale-[0.99]"
            >
              {favorites.has(table.id) && <IconStar size={14} filled className="shrink-0 text-gold" />}
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-parchment">{table.name}</span>
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
 * "Roll" entry — so they show up in the journal as one group.
 */
export function DiceTool({ adventureId, onRolled }: ToolProps) {
  const { t } = useLocaleContext();
  const { addEntry } = useJournalContext();
  const [label, setLabel] = useState("");
  const [rolls, setRolls] = useState<string[]>([]);

  function log() {
    if (rolls.length === 0) return;
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
      <DiceRoller onRoll={(r) => setRolls((prev) => [...prev, r])} ariaLabel={t.journal.diceRollerLabel} />
      {rolls.length === 0 ? (
        <p className="text-xs text-parchment-dim/70">{t.journal.diceHint}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <p aria-live="polite" className="text-sm font-medium text-parchment">
            {rolls.join(", ")}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRolls([])}
              className="rounded-xl px-3 py-2 text-sm text-parchment-dim transition hover:text-parchment"
            >
              {t.journal.diceClear}
            </button>
            <button
              type="button"
              onClick={log}
              className="flex-1 rounded-xl bg-gold py-2 text-sm font-semibold text-ink-950 transition hover:bg-gold-soft active:scale-[0.99]"
            >
              {t.journal.diceLog}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
