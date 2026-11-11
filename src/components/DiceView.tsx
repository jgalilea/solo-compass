import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useJournalContext } from "../hooks/useJournalContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { useSavedRollsContext } from "../hooks/useSavedRollsContext";
import { interpolate } from "../lib/i18n";
import { INPUT_CLASS } from "../lib/journalUi";
import { isRollable, savedRollLabel, type SavedRoll } from "../lib/savedRolls";
import { BUILTIN_DICE, type BuiltinDie } from "../lib/dice";
import { loadFavoriteDice, saveFavoriteDice } from "../lib/diceFavorites";
import { DiceTool } from "./PlayTools";
import { RecentRolls } from "./RecentRolls";
import { Toast } from "./Toast";
import { IconCheck, IconDice, IconPencil, IconPlus, IconStar, IconTrash } from "./icons/Icons";

/**
 * The Dice screen: every die at hand, the built-in ones and the
 * player's own (a name and a formula), and where they're made and
 * starred. The favorites, built-in or not, are the dice on the
 * journal's game table. Rolls are logged in the active adventure, like
 * the Tables screen's; with none, they're only rolled.
 */
export function DiceView() {
  const { t } = useLocaleContext();
  const { adventures, activeAdventureId } = useJournalContext();
  const active = adventures.find((a) => a.id === activeAdventureId) ?? null;
  const [logged, setLogged] = useState(0);
  const dismissLogged = useCallback(() => setLogged(0), []);

  // On desktop it fits the screen (tool, latest rolls, my dice): the
  // usual bottom margin alone made it scroll a few pixels.
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8 sm:py-12 lg:pb-4 md:max-w-3xl lg:max-w-7xl 2xl:max-w-[110rem]">
      <header className="text-center">
        <h1 className="font-display text-3xl text-parchment sm:text-4xl">{t.dice.title}</h1>
        <p className="mt-2 text-sm text-parchment-dim">{t.dice.subtitle}</p>
      </header>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start lg:gap-8 2xl:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] 2xl:gap-12">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3 rounded-3xl border border-ink-border bg-ink-800/70 p-5">
            <p className="text-xs text-parchment-dim">
              {active ? interpolate(t.dice.loggingTo, { name: active.name }) : t.dice.noAdventure}
            </p>
            <DiceTool adventureId={active?.id} onRolled={() => setLogged((n) => n + 1)} dice="all" />
          </section>
          {/* As on the Oracle screen: the latest dice rolls, and the full history. */}
          <RecentRolls kind="dados" limit={5} />
        </div>
        <SavedRollsPanel />
      </div>

      {logged > 0 && active && (
        <Toast
          key={logged}
          Icon={IconCheck}
          title={interpolate(t.dice.loggedIn, { name: active.name })}
          closeLabel={t.common.close}
          onDismiss={dismissLogged}
        />
      )}
    </div>
  );
}

/**
 * "My dice": the built-in ones to star, and the player's own, made,
 * renamed, starred and deleted (with Undo).
 */
function SavedRollsPanel() {
  const { t } = useLocaleContext();
  const { rolls, load, addRoll, updateRoll, removeRoll, restoreRoll, error } = useSavedRollsContext();
  useEffect(() => load(), [load]);
  // null: no form; "new": a new roll; otherwise the id being edited.
  const [editing, setEditing] = useState<string | null>(null);
  const [deleted, setDeleted] = useState<SavedRoll | null>(null);
  const dismissDeleted = useCallback(() => setDeleted(null), []);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-parchment-dim">
        <IconDice size={15} className="text-gold" />
        {t.dice.savedTitle}
      </h2>
      <p className="text-xs text-parchment-dim">{t.dice.favoritesHint}</p>
      {error && <p className="text-xs text-no">{error}</p>}

      <h3 className="text-[0.7rem] font-medium text-parchment-faint">{t.dice.builtinTitle}</h3>
      <BuiltinFavorites />
      <div className="mt-1 flex items-center gap-2">
        <h3 className="min-w-0 flex-1 text-[0.7rem] font-medium text-parchment-faint">{t.dice.customTitle}</h3>
        {editing !== "new" && (
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-gold transition hover:bg-gold/10"
          >
            <IconPlus size={14} />
            {t.dice.newRoll}
          </button>
        )}
      </div>

      {editing === "new" && (
        <SavedRollForm
          onSave={(draft) => {
            addRoll(draft);
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {rolls.length === 0 && editing !== "new" ? (
        <p className="rounded-2xl border border-dashed border-ink-border p-4 text-sm text-parchment-dim">{t.dice.savedEmpty}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {rolls.map((roll) =>
            editing === roll.id ? (
              <li key={roll.id}>
                <SavedRollForm
                  initial={roll}
                  onSave={(draft) => {
                    updateRoll(roll.id, draft);
                    setEditing(null);
                  }}
                  onCancel={() => setEditing(null)}
                />
              </li>
            ) : (
              <li key={roll.id} className="flex items-center gap-2 rounded-2xl border border-ink-border bg-ink-900/50 px-3 py-2">
                <button
                  type="button"
                  onClick={() => updateRoll(roll.id, { favorite: !roll.favorite })}
                  aria-pressed={roll.favorite}
                  aria-label={interpolate(roll.favorite ? t.dice.favoriteRemove : t.dice.favoriteAdd, { name: savedRollLabel(roll) })}
                  title={roll.favorite ? t.dice.favoriteRemoveHint : t.dice.favoriteAddHint}
                  className={`-m-1 shrink-0 p-1 transition ${roll.favorite ? "text-gold" : "text-parchment-faint hover:text-gold"}`}
                >
                  <IconStar size={16} filled={roll.favorite} />
                </button>
                <span className="min-w-0 flex-1">
                  {roll.name ? (
                    <>
                      <span className="block truncate text-sm font-medium text-parchment">{roll.name}</span>
                      <code className="block truncate font-mono text-xs text-parchment-dim">{roll.formula}</code>
                    </>
                  ) : (
                    <code className="block truncate font-mono text-sm text-parchment">{roll.formula}</code>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => setEditing(roll.id)}
                  aria-label={interpolate(t.dice.edit, { name: savedRollLabel(roll) })}
                  title={interpolate(t.dice.edit, { name: savedRollLabel(roll) })}
                  className="shrink-0 rounded-md p-1.5 text-parchment-dim transition hover:text-gold"
                >
                  <IconPencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    removeRoll(roll.id);
                    setDeleted(roll);
                  }}
                  aria-label={interpolate(t.dice.delete, { name: savedRollLabel(roll) })}
                  title={interpolate(t.dice.delete, { name: savedRollLabel(roll) })}
                  className="shrink-0 rounded-md p-1.5 text-parchment-dim transition hover:text-no"
                >
                  <IconTrash size={15} />
                </button>
              </li>
            ),
          )}
        </ul>
      )}

      {deleted && (
        <Toast
          key={deleted.id}
          Icon={IconTrash}
          title={t.dice.deleted}
          closeLabel={t.common.close}
          action={{ label: t.common.undo, onClick: () => restoreRoll(deleted) }}
          duration={6000}
          onDismiss={dismissDeleted}
        />
      )}
    </section>
  );
}

/** The built-in dice, each a star to put it on the game table or take it off. */
function BuiltinFavorites() {
  const { t } = useLocaleContext();
  const [favorites, setFavorites] = useState(loadFavoriteDice);

  function toggle(die: BuiltinDie) {
    const next = new Set(favorites);
    if (next.has(die)) next.delete(die);
    else next.add(die);
    setFavorites(next);
    saveFavoriteDice(next);
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {BUILTIN_DICE.map((die) => {
        const favorite = favorites.has(die);
        return (
          <button
            key={die}
            type="button"
            onClick={() => toggle(die)}
            aria-pressed={favorite}
            aria-label={interpolate(favorite ? t.dice.favoriteRemove : t.dice.favoriteAdd, { name: die })}
            title={favorite ? t.dice.favoriteRemoveHint : t.dice.favoriteAddHint}
            className={[
              "flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition",
              favorite
                ? "border-gold/50 text-parchment hover:border-gold"
                : "border-ink-border text-parchment-faint hover:border-gold/50 hover:text-parchment",
            ].join(" ")}
          >
            <IconStar size={13} filled={favorite} className={favorite ? "text-gold" : ""} />
            {die}
          </button>
        );
      })}
    </div>
  );
}

function SavedRollForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: SavedRoll;
  onSave: (draft: { name: string; formula: string }) => void;
  onCancel: () => void;
}) {
  const { t } = useLocaleContext();
  const [name, setName] = useState(initial?.name ?? "");
  const [formula, setFormula] = useState(initial?.formula ?? "");
  const readable = isRollable(formula);
  // The text is optional: a die can be just its formula.
  const canSave = readable;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (canSave) onSave({ name, formula });
  }

  return (
    <form
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onCancel();
        }
      }}
      className="flex flex-col gap-2 rounded-2xl border border-gold/40 bg-ink-900/60 p-3"
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t.dice.namePlaceholder}
        aria-label={t.dice.nameLabel}
        className={`${INPUT_CLASS} bg-ink-900/70 py-2`}
      />
      <input
        value={formula}
        onChange={(e) => setFormula(e.target.value)}
        placeholder={t.journal.diceFormulaPlaceholder}
        aria-label={t.journal.diceFormulaLabel}
        aria-invalid={formula.trim() !== "" && !readable}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        className={`${INPUT_CLASS} bg-ink-900/70 py-2 font-mono`}
      />
      {formula.trim() !== "" && !readable && <p className="text-xs text-no">{t.journal.diceFormulaError}</p>}
      <div className="flex justify-end gap-1.5">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-sm text-parchment-dim transition hover:text-parchment"
        >
          {t.common.cancel}
        </button>
        <button
          type="submit"
          disabled={!canSave}
          className="rounded-lg bg-gold px-3 py-1.5 text-sm font-semibold text-ink-950 transition hover:bg-gold-soft disabled:bg-ink-700 disabled:text-parchment-dim/50"
        >
          {t.common.save}
        </button>
      </div>
    </form>
  );
}
