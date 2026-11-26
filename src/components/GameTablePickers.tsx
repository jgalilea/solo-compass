import { useEffect, useMemo, useState } from "react";
import { useJournalContext } from "../hooks/useJournalContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { useMeaningTables } from "../hooks/useMeaningTables";
import { useSavedRollsContext } from "../hooks/useSavedRollsContext";
import { BUILTIN_DICE, BUILTIN_DIE_SIDES } from "../lib/dice";
import { loadFavoriteDice } from "../lib/diceFavorites";
import { gameTableDice, gameTableIds, pickedIds, togglePicked } from "../lib/gameTablePicks";
import { interpolate } from "../lib/i18n";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "../lib/journalUi";
import { savedRollLabel } from "../lib/savedRolls";
import { loadFavoriteTableIds } from "../lib/tableFavorites";
import { gameOfTable, type GameId } from "../lib/tableGames";
import type { MeaningTable } from "../lib/tables";
import { normalizeForSearch } from "../lib/text";
import { DialogBody, DialogFooter, DialogHeader } from "./Dialog";
import { DieOutline } from "./Die";
import { IconCheck, IconClose, IconDice, IconPlus, IconSearch, IconTable } from "./icons/Icons";
import { Modal } from "./Modal";

/** Search results shown at once: past these, narrowing the search is quicker than scrolling. */
const SHOWN = 30;

/**
 * The dice on an adventure's game table, picked for it: the built-in
 * ones and the player's own, each a switch. Until one is changed they're
 * the favourites (and the dialog says so); the first change makes them
 * the adventure's own, "Back to my favorites" undoes that.
 */
export function GameDicePicker({ adventureId, onClose }: { adventureId: string; onClose: () => void }) {
  const { t } = useLocaleContext();
  const { adventures, setAdventurePick } = useJournalContext();
  const { rolls: savedRolls, load } = useSavedRollsContext();
  useEffect(() => load(), [load]);
  const [favorites] = useState(loadFavoriteDice);
  const adventure = adventures.find((a) => a.id === adventureId);
  const { builtins, own } = gameTableDice(adventure?.gameDice, favorites, savedRolls);
  const on = new Set<string>([...builtins, ...own.map((r) => r.id)]);
  const following = pickedIds(adventure?.gameDice) === null;
  const toggle = (id: string) => setAdventurePick(adventureId, "gameDice", togglePicked(on, id));

  return (
    <Modal onClose={onClose} label={t.gameTable.diceTitle} size="lg">
      <DialogHeader title={t.gameTable.diceTitle} Icon={IconDice} onClose={onClose} />
      <DialogBody>
        <PickerNote name={adventure?.name ?? ""} following={following} />
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-parchment-dim">{t.gameTable.builtin}</h3>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
            {BUILTIN_DICE.map((die) => (
              <button
                key={die}
                type="button"
                aria-pressed={on.has(die)}
                onClick={() => toggle(die)}
                className={[
                  "relative flex h-16 flex-col items-center justify-center gap-0.5 rounded-xl border text-sm font-medium transition active:scale-95",
                  on.has(die) ? "border-gold bg-gold/15 text-gold" : "border-ink-border text-parchment-dim hover:border-gold/50 hover:text-parchment",
                ].join(" ")}
              >
                {on.has(die) && <IconCheck size={13} className="absolute right-1.5 top-1.5" />}
                <DieOutline sides={BUILTIN_DIE_SIDES[die]} />
                {die}
              </button>
            ))}
          </div>
        </section>
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-parchment-dim">{t.gameTable.own}</h3>
          {savedRolls.length === 0 ? (
            <p className="text-sm text-parchment-dim">{t.gameTable.noOwn}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {savedRolls.map((roll) => (
                <button
                  key={roll.id}
                  type="button"
                  aria-pressed={on.has(roll.id)}
                  onClick={() => toggle(roll.id)}
                  title={roll.formula}
                  className={[
                    "flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition active:scale-95 pointer-coarse:h-11",
                    on.has(roll.id) ? "border-gold bg-gold/15 text-gold" : "border-ink-border text-parchment-dim hover:border-gold/50 hover:text-parchment",
                  ].join(" ")}
                >
                  {on.has(roll.id) && <IconCheck size={14} className="shrink-0" />}
                  {savedRollLabel(roll)}
                </button>
              ))}
            </div>
          )}
        </section>
      </DialogBody>
      <PickerFooter following={following} onReset={() => setAdventurePick(adventureId, "gameDice", null)} onClose={onClose} />
    </Modal>
  );
}

/**
 * The tables on an adventure's game table, picked for it: the ones on it,
 * each with its ×, and a search over every table to add more (the same
 * shape as the generator's editor). Favourites until one is changed.
 */
export function GameTablesPicker({ adventureId, onClose }: { adventureId: string; onClose: () => void }) {
  const { t } = useLocaleContext();
  const { adventures, setAdventurePick } = useJournalContext();
  const [favorites] = useState(loadFavoriteTableIds);
  const adventure = adventures.find((a) => a.id === adventureId);
  const on = gameTableIds(adventure?.gameTables, favorites);
  const following = pickedIds(adventure?.gameTables) === null;
  const [query, setQuery] = useState("");
  const q = normalizeForSearch(query.trim());
  // Only the games of what's on it, until there's something to search for.
  const onKey = [...on].join(" ");
  const games = useMemo(
    () => [...new Set(onKey.split(" ").map(gameOfTable).filter((id): id is GameId => id !== undefined))],
    [onKey],
  );
  const { all, blocks } = useMeaningTables(q ? "all" : games);
  const loading = blocks.some((b) => b.status === "loading");
  const chosen = all.filter((table) => on.has(table.id));
  const matches = q
    ? all.filter(
        (table) =>
          !on.has(table.id) &&
          (normalizeForSearch(table.name).includes(q) ||
            normalizeForSearch(table.game.name).includes(q) ||
            (!!table.theme && normalizeForSearch(t.tables.themes[table.theme]).includes(q))),
      )
    : [];
  const toggle = (id: string) => setAdventurePick(adventureId, "gameTables", togglePicked(on, id));

  return (
    <Modal onClose={onClose} label={t.gameTable.tablesTitle} size="lg">
      <DialogHeader title={t.gameTable.tablesTitle} Icon={IconTable} onClose={onClose} />
      <DialogBody>
        <PickerNote name={adventure?.name ?? ""} following={following} />
        <section className="flex flex-col gap-1.5">
          <h3 className="text-xs font-medium uppercase tracking-wide text-parchment-dim">
            {interpolate(t.gameTable.onTable, { count: on.size })}
          </h3>
          {on.size === 0 ? (
            <p className="text-sm text-parchment-dim">{t.gameTable.noneOnTable}</p>
          ) : chosen.length === 0 && loading ? (
            <p className="text-sm text-parchment-faint">{t.common.loading}</p>
          ) : (
            <ul className="grid gap-1.5 md:grid-cols-2">
              {chosen.map((table) => (
                <li key={table.id} className="flex min-w-0 items-center gap-2 rounded-xl border border-ink-border bg-ink-900/50 py-1.5 pl-3 pr-1.5 text-sm">
                  <TableName table={table} />
                  <button
                    type="button"
                    onClick={() => toggle(table.id)}
                    aria-label={interpolate(t.gameTable.remove, { name: table.name })}
                    title={interpolate(t.gameTable.remove, { name: table.name })}
                    className="shrink-0 rounded-md p-1.5 text-parchment-dim transition hover:text-no pointer-coarse:p-2.5"
                  >
                    <IconClose size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="flex flex-col gap-1.5">
          <h3 className="text-xs font-medium uppercase tracking-wide text-parchment-dim">{t.gameTable.searchLabel}</h3>
          <div className="relative flex">
            <IconSearch size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-parchment-faint" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.gameTable.searchPlaceholder}
              aria-label={t.gameTable.searchLabel}
              className={`${INPUT_CLASS} w-full flex-none py-2.5 pl-9`}
            />
          </div>
          {q &&
            (matches.length === 0 ? (
              <p className="px-1 text-xs text-parchment-faint">
                {loading ? t.common.loading : interpolate(t.tables.noResultsDescription, { query: query.trim() })}
              </p>
            ) : (
              <ul className="grid gap-1 rounded-xl border border-ink-border/70 p-1 md:grid-cols-2">
                {matches.slice(0, SHOWN).map((table) => (
                  <li key={table.id} className="min-w-0">
                    <button
                      type="button"
                      onClick={() => toggle(table.id)}
                      aria-label={interpolate(t.gameTable.add, { name: table.name })}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-ink-800 hover:text-gold pointer-coarse:py-3"
                    >
                      <IconPlus size={14} className="shrink-0 text-gold" />
                      <TableName table={table} />
                    </button>
                  </li>
                ))}
                {matches.length > SHOWN && (
                  <li className="px-2.5 py-2 text-xs text-parchment-faint md:col-span-2">
                    {interpolate(t.gameTable.more, { count: matches.length - SHOWN })}
                  </li>
                )}
              </ul>
            ))}
        </section>
      </DialogBody>
      <PickerFooter following={following} onReset={() => setAdventurePick(adventureId, "gameTables", null)} onClose={onClose} />
    </Modal>
  );
}

/** Whose game table this is, and whether it still goes with the favourites. */
function PickerNote({ name, following }: { name: string; following: boolean }) {
  const { t } = useLocaleContext();
  return (
    <p className="text-sm text-parchment-dim">
      {interpolate(t.gameTable.note, { name })} {following && <span className="text-parchment">{t.gameTable.following}</span>}
    </p>
  );
}

function PickerFooter({ following, onReset, onClose }: { following: boolean; onReset: () => void; onClose: () => void }) {
  const { t } = useLocaleContext();
  return (
    <DialogFooter>
      {!following && (
        <button type="button" onClick={onReset} className={SECONDARY_BUTTON_CLASS}>
          {t.gameTable.reset}
        </button>
      )}
      <button type="button" onClick={onClose} className={PRIMARY_BUTTON_CLASS}>
        {t.gameTable.done}
      </button>
    </DialogFooter>
  );
}

function TableName({ table }: { table: MeaningTable }) {
  return (
    <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
      <span className="truncate text-parchment">{table.name}</span>
      <span className="shrink-0 text-xs text-parchment-faint">{[table.game.tag, table.dice].filter(Boolean).join(" · ")}</span>
    </span>
  );
}
