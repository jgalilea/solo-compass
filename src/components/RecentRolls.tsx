import { Link } from "react-router-dom";
import { cardPurpose } from "../lib/cards";
import { useHistoryContext } from "../hooks/useHistoryContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { formatAnswer } from "../lib/i18n/answerText";
import { readRolledDice } from "../lib/diceNotation";
import { rolledTotal, rolledWhat } from "../lib/rolledDice";
import { RolledDice } from "./RolledDice";
import { PlayingCard } from "./PlayingCard";
import { IconChevronRight, IconDice, IconOracle, IconTable } from "./icons/Icons";

const ANSWER_COLOR: Record<string, string> = {
  si: "text-yes",
  no: "text-no",
  contradiccion: "text-contradiction",
};

/**
 * The latest rolls (with or without an active adventure) with access to
 * the full history. It replaces the bar's "History" tab: the log stays
 * one tap away without taking a slot in the main navigation. On the
 * Tables and Dice screens, only their own rolls (`kind`), and the
 * history opens filtered to them.
 */
export function RecentRolls({
  limit = 3,
  exclude = [],
  kind,
  className = "",
}: {
  limit?: number;
  /** Rolls already shown large (the latest result), not repeated here. */
  exclude?: string[];
  kind?: "tabla" | "dados";
  className?: string;
}) {
  const { status, entries } = useHistoryContext();
  const { t } = useLocaleContext();

  const recent = entries.filter((e) => !exclude.includes(e.id) && (!kind || e.kind === kind)).slice(0, limit);
  if (status !== "ready" || recent.length === 0) return null;

  return (
    <section className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-medium uppercase tracking-wide text-parchment-dim">
          {t.oracle.recentHeading}
        </h2>
        <Link
          to={kind ? `/historial?tipo=${kind}` : "/historial"}
          className="-m-2 flex items-center gap-1 p-2 text-sm text-parchment-dim transition hover:text-gold"
        >
          {t.oracle.viewAllHistory}
          <IconChevronRight size={14} />
        </Link>
      </div>
      <ul className="flex flex-col divide-y divide-ink-border/60 rounded-2xl border border-ink-border bg-ink-900/40">
        {recent.map((entry) => (
          <li key={entry.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
            {entry.kind === "oraculo" ? (
              <>
                <IconOracle size={16} className="shrink-0 text-parchment-faint" />
                {/* Up to two lines: a long answer ("Contradicción") leaves
                    a phone's row little room for one. */}
                <span className="line-clamp-2 min-w-0 flex-1 break-words italic text-parchment/85">
                  {entry.question ? `“${entry.question}”` : t.history.kindOracle}
                </span>
                <span
                  className={`shrink-0 font-semibold ${ANSWER_COLOR[entry.answer]}`}
                >
                  {formatAnswer(t, entry)}
                </span>
              </>
            ) : entry.kind === "dados" ? (
              entry.card ? (
                <>
                  {/* Taller than the line, without making the row taller;
                      the text keeps in step with the rows with an icon. */}
                  <span className="-mx-[3px] -my-1.5 flex shrink-0">
                    <PlayingCard id={entry.card.id} small />
                  </span>
                  <OwnRoll what={cardPurpose(entry.text)} result={entry.text.slice(entry.text.lastIndexOf(" -> ") + 4)} />
                </>
              ) : (
                <DiceRow text={entry.text} />
              )
            ) : (
              <>
                <IconTable size={16} className="shrink-0 text-parchment-faint" />
                <span className="shrink-0 text-parchment-dim">{entry.tableName}</span>
                <span className="min-w-0 flex-1 truncate text-right text-parchment/85">
                  {entry.resultText}
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** What was rolled, then its result, like a table roll. */
function OwnRoll({ what, result }: { what: string; result: string }) {
  return (
    <>
      <span className="min-w-0 shrink truncate text-parchment-dim">{what}</span>
      <span className="min-w-0 flex-1 truncate text-right font-medium text-parchment/85">{result}</span>
    </>
  );
}

/** The player's dice: drawn (the first ones) with their total or, if they can't be, as written. */
function DiceRow({ text }: { text: string }) {
  const dice = readRolledDice(text);
  if (dice) {
    return (
      <>
        <span className="-mx-1.5 -my-1 flex shrink-0">
          <RolledDice dice={dice} size="xs" />
        </span>
        <OwnRoll what={rolledWhat(text)} result={rolledTotal(text)} />
      </>
    );
  }
  const arrow = text.lastIndexOf(" -> ");
  return (
    <>
      <IconDice size={16} className="shrink-0 text-parchment-faint" />
      <OwnRoll what={text.split(" -> ")[0]} result={arrow < 0 ? "" : text.slice(arrow + 4)} />
    </>
  );
}
