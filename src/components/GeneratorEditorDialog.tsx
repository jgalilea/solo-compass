import { useId, useMemo, useState, type ReactNode } from "react";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { useMeaningTables } from "../hooks/useMeaningTables";
import { MIN_GENERATOR_TABLES, type GeneratorDraft } from "../lib/generators";
import { interpolate } from "../lib/i18n";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "../lib/journalUi";
import type { MeaningTable } from "../lib/tables";
import { normalizeForSearch } from "../lib/text";
import { IconArrowDown, IconArrowUp, IconClose, IconPlus, IconSearch } from "./icons/Icons";
import { DialogBody, DialogFooter, DialogHeader } from "./Dialog";
import { Modal } from "./Modal";

const LABEL_CLASS = "text-xs font-medium uppercase tracking-wide text-parchment-dim";
// Enough to pick from without drawing hundreds of rows: the search narrows it.
const SHOWN = 30;

/**
 * Create or edit a generator: a name and its tables, picked with a
 * search over every table (built-in and the player's), in the order
 * they'll be rolled and written.
 */
export function GeneratorEditorDialog({
  initial,
  editing,
  onSave,
  onClose,
}: {
  initial?: GeneratorDraft;
  editing: boolean;
  onSave: (draft: GeneratorDraft) => void;
  onClose: () => void;
}) {
  const { t } = useLocaleContext();
  const titleId = useId();
  const formId = useId();
  const searchId = useId();
  const [name, setName] = useState(initial?.name ?? "");
  const [tableIds, setTableIds] = useState<string[]>(initial?.tableIds ?? []);
  const [query, setQuery] = useState("");
  const [tried, setTried] = useState(false);
  const { all } = useMeaningTables("all");
  const byId = useMemo(() => new Map(all.map((table) => [table.id, table])), [all]);
  const chosen = tableIds.map((id) => byId.get(id)).filter((table) => table !== undefined);

  const q = normalizeForSearch(query.trim());
  const matches = all.filter(
    (table) =>
      !tableIds.includes(table.id) &&
      (!q ||
        normalizeForSearch(table.name).includes(q) ||
        normalizeForSearch(table.game.name).includes(q) ||
        (!!table.theme && normalizeForSearch(t.tables.themes[table.theme]).includes(q))),
  );

  const nameMissing = !name.trim();
  const tooFew = chosen.length < MIN_GENERATOR_TABLES;

  function move(index: number, by: -1 | 1) {
    setTableIds((prev) => {
      const next = [...prev];
      [next[index], next[index + by]] = [next[index + by], next[index]];
      return next;
    });
  }

  function submit() {
    setTried(true);
    if (nameMissing || tooFew) return;
    onSave({ name: name.trim(), tableIds: chosen.map((table) => table.id) });
  }

  return (
    <Modal onClose={onClose} labelledBy={titleId} size="lg">
      <DialogHeader id={titleId} title={editing ? t.tables.generatorEditTitle : t.tables.generatorNewTitle} onClose={onClose} />
      <DialogBody>
        <form
          id={formId}
          className="flex flex-col gap-4"
          onSubmit={(ev) => {
            ev.preventDefault();
            submit();
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className={LABEL_CLASS}>{t.tables.generatorNameLabel}</span>
            <input
              autoFocus={!editing}
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              placeholder={t.tables.generatorNamePlaceholder}
              aria-invalid={tried && nameMissing}
              className={`${INPUT_CLASS} flex-none py-2.5`}
            />
            {tried && nameMissing && <span className="text-xs text-no">{t.tables.generatorNameError}</span>}
          </label>

          <div className="flex flex-col gap-1.5">
            <span className={LABEL_CLASS}>{t.tables.generatorTablesLabel}</span>
            {chosen.length > 0 && (
              <ol className="flex flex-col gap-1.5">
                {chosen.map((table, i) => (
                  <li
                    key={table.id}
                    className="flex items-center gap-2 rounded-xl border border-ink-border bg-ink-900/50 py-1.5 pl-3 pr-1.5 text-sm"
                  >
                    <span className="w-4 shrink-0 text-xs tabular-nums text-parchment-faint">{i + 1}</span>
                    <TableName table={table} />
                    <span className="flex shrink-0">
                      <RowButton
                        label={interpolate(t.tables.generatorMoveUp, { name: table.name })}
                        disabled={i === 0}
                        onClick={() => move(i, -1)}
                      >
                        <IconArrowUp size={15} />
                      </RowButton>
                      <RowButton
                        label={interpolate(t.tables.generatorMoveDown, { name: table.name })}
                        disabled={i === chosen.length - 1}
                        onClick={() => move(i, 1)}
                      >
                        <IconArrowDown size={15} />
                      </RowButton>
                      <RowButton
                        label={interpolate(t.tables.generatorRemoveTable, { name: table.name })}
                        onClick={() => setTableIds((prev) => prev.filter((id) => id !== table.id))}
                        danger
                      >
                        <IconClose size={15} />
                      </RowButton>
                    </span>
                  </li>
                ))}
              </ol>
            )}
            {tried && tooFew && <span className="text-xs text-no">{t.tables.generatorTablesError}</span>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={searchId} className={LABEL_CLASS}>
              {t.tables.generatorSearchLabel}
            </label>
            <div className="relative flex">
              <IconSearch size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-parchment-faint" />
              <input
                id={searchId}
                type="search"
                value={query}
                onChange={(ev) => setQuery(ev.target.value)}
                placeholder={t.tables.generatorSearchPlaceholder}
                className={`${INPUT_CLASS} w-full flex-none py-2.5 pl-9`}
              />
            </div>
            {all.length === 0 ? (
              <p className="px-1 text-xs text-parchment-faint">{t.common.loading}</p>
            ) : (
              <ul className="grid max-h-72 gap-1 overflow-y-auto overscroll-contain rounded-xl border border-ink-border/70 p-1 md:grid-cols-2">
                {matches.slice(0, SHOWN).map((table) => (
                  <li key={table.id} className="min-w-0">
                    <button
                      type="button"
                      onClick={() => setTableIds((prev) => [...prev, table.id])}
                      aria-label={interpolate(t.tables.generatorAddTable, { name: table.name })}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-ink-800 hover:text-gold"
                    >
                      <IconPlus size={14} className="shrink-0 text-gold" />
                      <TableName table={table} />
                    </button>
                  </li>
                ))}
                {matches.length > SHOWN && (
                  <li className="px-2.5 py-2 text-xs text-parchment-faint md:col-span-2">
                    {interpolate(t.tables.generatorMore, { count: matches.length - SHOWN })}
                  </li>
                )}
              </ul>
            )}
          </div>

        </form>
      </DialogBody>
      <DialogFooter>
        <button type="button" onClick={onClose} className={SECONDARY_BUTTON_CLASS}>
          {t.common.cancel}
        </button>
        <button type="submit" form={formId} className={PRIMARY_BUTTON_CLASS}>
          {t.common.save}
        </button>
      </DialogFooter>
    </Modal>
  );
}

/** "Action · Ironsworn d100": names repeat across games. */
function TableName({ table }: { table: MeaningTable }) {
  return (
    <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
      <span className="truncate text-parchment">{table.name}</span>
      <span className="shrink-0 text-xs text-parchment-faint">
        {[table.game.tag, table.dice].filter(Boolean).join(" · ")}
      </span>
    </span>
  );
}

function RowButton({
  label,
  onClick,
  disabled = false,
  danger = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={[
        "rounded-md p-1.5 text-parchment-dim transition disabled:opacity-30",
        danger ? "hover:text-no" : "hover:text-gold disabled:hover:text-parchment-dim",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
