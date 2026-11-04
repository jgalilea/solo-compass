import { useMemo, useState } from "react";
import { useJournalContext } from "../hooks/useJournalContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { usePlayActions } from "../hooks/usePlayActions";
import type { Likelihood } from "../lib/oracle";
import { getMeaningTables, type MeaningTable } from "../lib/tables";
import { loadFavoriteTableIds } from "../lib/tableFavorites";
import { INPUT_CLASS } from "../lib/journalUi";
import { DiceRoller } from "./DiceRoller";
import { LikelihoodPicker } from "./LikelihoodPicker";
import { IconSearch, IconStar } from "./icons/Icons";

/**
 * Las tres herramientas de la "mesa de juego" de una aventura: oráculo,
 * tablas y dados. Son las mismas en la hoja que se abre desde el
 * composer (móvil/tablet) y en el panel fijo de la derecha (escritorio).
 * Todo se apunta en `adventureId` (sea o no la activa) y avisa con
 * `onRolled` para que el diario baje hasta ello y el composer pase a
 * "Consecuencia".
 */

interface ToolProps {
  adventureId: string;
  /** rollId: la tirada del historial a la que enlazar la consecuencia. */
  onRolled: (rollId?: string) => void;
}

export function OracleTool({ adventureId, onRolled, autoFocus = false }: ToolProps & { autoFocus?: boolean }) {
  const { t } = useLocaleContext();
  const { askOracle } = usePlayActions();
  const [question, setQuestion] = useState("");
  const [likelihood, setLikelihood] = useState<Likelihood>("equilibrado");

  return (
    <form
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
  const { rollTable } = usePlayActions();
  const [query, setQuery] = useState("");
  const tables = useMemo(() => {
    const favorites = loadFavoriteTableIds();
    const all = getMeaningTables(t);
    // Favoritas primero, igual que en la pantalla de Tablas.
    return [...all.filter((x) => favorites.has(x.id)), ...all.filter((x) => !favorites.has(x.id))].map(
      (table) => ({ table, favorite: favorites.has(table.id) }),
    );
  }, [t]);
  const q = query.trim().toLowerCase();
  const visible = q ? tables.filter(({ table }) => table.name.toLowerCase().includes(q)) : tables;

  function roll(table: MeaningTable) {
    onRolled(rollTable(table, adventureId).id);
  }

  return (
    <div className="@container flex flex-col gap-2">
      {/* Con pocas tablas el buscador sobra; aparece cuando ya cuesta encontrarlas. */}
      {tables.length > 6 && (
        <label className="relative">
          <IconSearch size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-parchment-dim/60" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.tables.searchPlaceholder}
            className={`${INPUT_CLASS} bg-ink-900/70 py-2 pl-9 text-sm`}
          />
        </label>
      )}
      {/* En dos columnas cuando hay sitio (la hoja en tablet), una en el panel estrecho. */}
      <ul className="grid gap-1.5 @lg:grid-cols-2">
        {visible.map(({ table, favorite }) => (
          <li key={table.id}>
            <button
              type="button"
              onClick={() => roll(table)}
              title={table.description}
              className="flex w-full items-center gap-2 rounded-xl border border-ink-border bg-ink-900/40 px-3.5 py-2.5 text-left transition hover:border-gold/50 active:scale-[0.99]"
            >
              {favorite && <IconStar size={14} filled className="shrink-0 text-gold" />}
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
 * Tiradas de tu propio sistema: se van acumulando ("d20 -> 14, d6 -> 3")
 * con un texto opcional delante, y se apuntan juntas en una sola
 * entrada de tipo "Tirada" — así se ven en el diario como un grupo.
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
    <div className="flex flex-col gap-3">
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
