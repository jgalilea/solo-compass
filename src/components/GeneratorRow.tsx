import { useEffect, useRef } from "react";
import { useLocaleContext } from "../hooks/useLocaleContext";
import type { Generator } from "../lib/generators";
import { interpolate } from "../lib/i18n";
import type { Adventure } from "../lib/journal";
import type { MeaningTable } from "../lib/tables";
import { IconDice, IconGenerator, IconPencil, IconTrash } from "./icons/Icons";
import { ResultPanel, type LastResult } from "./TableResultPanel";

/**
 * One of the player's generators on the Tables screen: its name, the
 * tables it rolls (in order) and its roll, with the result below it on
 * phones (in the right column on desktop), like a table's row.
 */
export function GeneratorRow({
  generator,
  tables,
  loading,
  last,
  rolling,
  activeAdventure,
  onRoll,
  onEdit,
  onDelete,
  onSaveConsequence,
}: {
  generator: Generator;
  /** Its tables that are loaded, in order. */
  tables: MeaningTable[];
  /** Some of its tables' games are still loading. */
  loading: boolean;
  last: LastResult | null;
  rolling: boolean;
  activeAdventure: Adventure | null;
  onRoll: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSaveConsequence: (rollId: string, text: string) => void;
}) {
  const { t } = useLocaleContext();
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (last) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [last]);
  const missing = !loading && tables.length < generator.tableIds.length;

  return (
    <li
      className={[
        "rounded-2xl border bg-ink-800/50 p-4 transition-colors sm:p-5",
        last ? "border-gold/40" : "border-ink-border",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <IconGenerator size={20} className="mt-0.5 shrink-0 text-gold" />
        <div className="min-w-0 flex-1">
          <h3 className="break-words font-display text-lg leading-snug text-parchment">{generator.name}</h3>
          <p className="mt-0.5 text-sm text-parchment-dim">
            {loading ? t.common.loading : tables.map((table) => table.name).join(" · ")}
          </p>
          {missing && <p className="mt-0.5 text-xs text-no">{t.tables.generatorMissing}</p>}
        </div>
        <button
          type="button"
          onClick={onRoll}
          disabled={rolling || loading || tables.length === 0}
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-gold/50 bg-gold/10 px-3.5 py-2.5 text-sm font-medium text-gold transition hover:bg-gold/20 active:scale-95 disabled:opacity-60"
        >
          <IconDice size={17} className={rolling ? "animate-spin" : ""} />
          {t.tables.generatorRoll}
        </button>
      </div>
      <div className="mt-2 flex justify-end gap-1 text-parchment-dim">
        <button
          type="button"
          onClick={onEdit}
          aria-label={interpolate(t.tables.generatorEdit, { name: generator.name })}
          title={interpolate(t.tables.generatorEdit, { name: generator.name })}
          className="rounded-md p-1.5 transition hover:text-gold"
        >
          <IconPencil size={16} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={interpolate(t.tables.generatorDelete, { name: generator.name })}
          title={interpolate(t.tables.generatorDelete, { name: generator.name })}
          className="rounded-md p-1.5 transition hover:text-no"
        >
          <IconTrash size={16} />
        </button>
      </div>

      {last && (
        <div ref={resultRef} className="mt-3 scroll-mb-24 lg:hidden">
          <ResultPanel
            key={last.rollId}
            last={last}
            activeAdventure={activeAdventure}
            onSaveConsequence={onSaveConsequence}
            inline
          />
        </div>
      )}
    </li>
  );
}
