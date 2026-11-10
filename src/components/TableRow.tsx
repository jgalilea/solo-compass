import { useEffect, useRef, useState, type ReactNode } from "react";
import { formatRange, type MeaningTable } from "../lib/tables";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { interpolate } from "../lib/i18n";
import type { Adventure } from "../lib/journal";
import {
  IconDice,
  IconExternalLink,
  IconList,
  IconStar,
} from "./icons/Icons";
import { DialogBody, DialogHeader } from "./Dialog";
import { Modal } from "./Modal";
import { ResultPanel, type LastResult } from "./TableResultPanel";

export function TableRow({
  table,
  last,
  rolling,
  favorite,
  activeAdventure,
  onRoll,
  onToggleFavorite,
  onSaveConsequence,
  menu,
}: {
  table: MeaningTable;
  last: LastResult | null;
  rolling: boolean;
  favorite: boolean;
  activeAdventure: Adventure | null;
  onRoll: () => void;
  onToggleFavorite: () => void;
  onSaveConsequence: (rollId: string, text: string) => void;
  /** Options of the player's own tables (edit, export…). */
  menu: ReactNode;
}) {
  const { t } = useLocaleContext();
  const resultRef = useRef<HTMLDivElement>(null);

  // On phones the result opens below the row: bring it into view.
  useEffect(() => {
    if (last) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [last]);

  return (
    <li
      className={[
        "rounded-2xl border bg-ink-800/50 p-4 transition-colors sm:p-5",
        last ? "border-gold/40" : "border-ink-border",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5">
            <h2 className="min-w-0 break-words font-display text-lg leading-snug text-parchment">{table.name}</h2>
            <button
              type="button"
              onClick={onToggleFavorite}
              aria-pressed={favorite}
              aria-label={favorite ? t.tables.favoriteRemove : t.tables.favoriteAdd}
              className={[
                "-m-1 mt-0 shrink-0 p-1 transition",
                favorite ? "text-gold" : "text-parchment-faint hover:text-gold",
              ].join(" ")}
            >
              <IconStar size={16} filled={favorite} />
            </button>
          </div>
          {table.description && <p className="mt-0.5 text-sm text-parchment-dim">{table.description}</p>}
        </div>
        <button
          type="button"
          onClick={onRoll}
          disabled={rolling}
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-gold/50 bg-gold/10 px-3.5 py-2.5 text-sm font-medium text-gold transition hover:bg-gold/20 active:scale-95 disabled:opacity-60"
        >
          <IconDice size={17} className={rolling ? "animate-spin" : ""} />
          {interpolate(t.tables.rollButton, { dice: table.dice })}
        </button>
      </div>
      {/* Across the card's full width, not under the description: otherwise
          fitting on one line depended on how long the range was. */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
        <GameBadge table={table} />
        <TableEntriesButton table={table} />
        {menu && <div className="ml-auto">{menu}</div>}
      </div>

      {last && (
        <div ref={resultRef} className="mt-4 scroll-mb-24 lg:hidden">
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

export function GameBadge({ table }: { table: MeaningTable }) {
  const className =
    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium uppercase tracking-wide";
  return table.game.url ? (
    <a
      href={table.game.url}
      target="_blank"
      rel="noreferrer"
      className={`${className} border-gold/40 bg-gold/10 text-gold transition hover:bg-gold/20`}
    >
      {table.game.name}
      <IconExternalLink size={11} />
    </a>
  ) : (
    <span className={`${className} border-ink-border text-parchment-dim`}>{table.game.name}</span>
  );
}

export function TableEntriesButton({ table }: { table: MeaningTable }) {
  const { t } = useLocaleContext();
  const [open, setOpen] = useState(false);
  const credit = [
    table.game.author && `${t.tables.authorLabel}: ${table.game.author}`,
    table.game.license && `${t.tables.licenseLabel}: ${table.game.license}`,
  ].filter(Boolean);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={t.tables.viewResultsTitle}
        className="-m-1 flex items-center gap-1 p-1 text-parchment-dim transition hover:text-gold"
      >
        <IconList size={14} />
        {t.tables.viewResultsHint}
        {/* The table's real range: a d66 goes from 11 to 66, not 1 to 66. */}
        <span className="text-parchment-faint">
          · {table.entries[0]?.range[0]}–{table.entries.at(-1)?.range[1]}
        </span>
      </button>

      {open && (
        <Modal
          onClose={() => setOpen(false)}
          label={interpolate(t.tables.allResultsDialogLabel, { name: table.name })}
          size="lg"
        >
          <DialogHeader
            title={table.name}
            subtitle={
              <>
                <p className="text-xs uppercase tracking-wide text-parchment-faint">
                  {table.dice} · {interpolate(t.tables.resultsCountLabel, { count: table.entries.length })}
                </p>
                {credit.length > 0 && <p className="mt-0.5 text-xs">{credit.join(" · ")}</p>}
              </>
            }
            onClose={() => setOpen(false)}
          />
          <DialogBody>
            <ul className="grid gap-1.5 lg:grid-cols-2">
              {table.entries.map((entry) => (
                <li
                  key={`${entry.range[0]}-${entry.range[1]}`}
                  className="flex gap-3 rounded-xl border border-ink-border/70 bg-ink-900/50 px-3 py-2 text-sm"
                >
                  <span className="shrink-0 font-medium tabular-nums text-parchment-dim">{formatRange(entry.range)}</span>
                  <span className="text-parchment/90">{entry.text}</span>
                </li>
              ))}
            </ul>
          </DialogBody>
        </Modal>
      )}
    </>
  );
}
