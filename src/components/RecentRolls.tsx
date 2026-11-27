import { Link } from "react-router-dom";
import { cardPurpose } from "../lib/cards";
import { useHistoryContext } from "../hooks/useHistoryContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { formatAnswer } from "../lib/i18n/answerText";
import { readRolledDice, rollAgain } from "../lib/diceNotation";
import { rolledTotal, rolledWhat, tableDice } from "../lib/rolledDice";
import { tableRollDie, type TableRollEntry } from "../lib/history";
import { interpolate } from "../lib/i18n";
import { Die } from "./Die";
import { RolledDice, TableDiceRow } from "./RolledDice";
import { oracleDice } from "../lib/oracle";
import { ROLE_COLOR } from "../lib/oracleEngines";
import { PlayingCard } from "./PlayingCard";
import { IconChevronRight, IconDice, IconRepeat, IconTable } from "./icons/Icons";

const ANSWER_COLOR: Record<string, string> = {
  si: "text-yes",
  no: "text-no",
  contradiccion: "text-contradiction",
};

/**
 * A screen's latest rolls (with or without an active adventure): the
 * oracle's, the tables' or the dice and cards, with access to the
 * history filtered to them. It replaces the bar's "History" tab: the
 * log stays one tap away without taking a slot in the main navigation.
 */
export function RecentRolls({
  limit = 3,
  wideLimit = limit,
  kind,
  className = "",
  onRepeat,
}: {
  limit?: number;
  /** On a wide screen (2xl), where they have room of their own. */
  wideLimit?: number;
  kind: "oraculo" | "tabla" | "dados";
  className?: string;
  /** The dice screen: rolls the same dice again (a card can't be). */
  onRepeat?: (text: string) => void;
}) {
  const { status, entries } = useHistoryContext();
  const { t } = useLocaleContext();

  const recent = entries.filter((e) => e.kind === kind).slice(0, Math.max(limit, wideLimit));
  if (status !== "ready" || recent.length === 0) return null;

  return (
    <section className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-medium uppercase tracking-wide text-parchment-dim">
          {t.oracle.recentHeading}
        </h2>
        <Link
          to={`/historial?tipo=${kind}`}
          className="-m-2 flex items-center gap-1 p-2 text-sm text-parchment-dim transition hover:text-gold"
        >
          {t.oracle.viewAllHistory}
          <IconChevronRight size={14} />
        </Link>
      </div>
      <ul className="flex flex-col divide-y divide-ink-border/60 rounded-2xl border border-ink-border bg-ink-900/40">
        {recent.map((entry, i) => (
          <li
            key={entry.id}
            className={`${i < limit ? "flex" : "hidden 2xl:flex"} items-center gap-3 px-4 py-2.5 text-sm`}
          >
            {entry.kind === "oraculo" ? (
              <>
                <span className="-mx-1.5 -my-1 flex shrink-0 gap-1">
                  {oracleDice(entry).flatMap((group) =>
                    group.rolls.map((value, i) => (
                      <Die
                        key={`${group.role}${i}`}
                        sides={group.sides}
                        value={value}
                        color={ROLE_COLOR[group.role]}
                        name={t.oracleDice[group.role]}
                        size="xs"
                        faded={group.rolls.length > 1 && value !== group.kept}
                      />
                    )),
                  )}
                </span>
                {/* Up to two lines: a long answer ("Contradicción") leaves
                    a phone's row little room for one. */}
                <span className="line-clamp-2 min-w-0 flex-1 break-words italic text-parchment/85">
                  {entry.question && `“${entry.question}”`}
                </span>
                <span className={`shrink-0 font-semibold ${ANSWER_COLOR[entry.answer]}`}>
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
                  <OwnRoll
                    what={cardPurpose(entry.text)}
                    result={entry.text.slice(entry.text.lastIndexOf(" -> ") + 4)}
                  />
                </>
              ) : (
                <DiceRow text={entry.text} />
              )
            ) : (
              <>
                <TableDice entry={entry} />
                <span className="min-w-0 text-parchment-dim">
                  {entry.tableName}
                  {/* A lone die already says it. */}
                  {!(tableRollDie(entry) ?? "d66").match(/^d(?!66$)/) && (
                    <span className="whitespace-nowrap tabular-nums text-parchment-faint">
                      {" "}
                      · {entry.total}
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate text-right text-parchment/85">
                  {entry.resultText}
                </span>
              </>
            )}
            {onRepeat && entry.kind === "dados" && (
              <RepeatButton text={entry.text} onRepeat={entry.card ? undefined : onRepeat} />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function RepeatButton({ text, onRepeat }: { text: string; onRepeat?: (text: string) => void }) {
  const { t } = useLocaleContext();
  // A card, or a roll the dice don't read: only its place, so the results stay in line.
  if (!onRepeat || !rollAgain(text, () => 0)) return <span className="w-4 shrink-0" />;
  const label = interpolate(t.dice.repeat, { roll: rolledWhat(text) });
  return (
    <button
      type="button"
      onClick={() => onRepeat(text)}
      aria-label={label}
      title={label}
      className="-m-2.5 shrink-0 rounded-lg p-2.5 text-parchment-dim transition hover:text-gold active:scale-95"
    >
      <IconRepeat size={16} />
    </button>
  );
}

/** A table roll's dice, or the table's icon if it isn't known which. */
function TableDice({ entry }: { entry: TableRollEntry }) {
  const die = tableRollDie(entry);
  const dice = die && tableDice(die, entry.total);
  if (!dice) return <IconTable size={16} className="shrink-0 text-parchment-faint" />;
  return (
    <span className="-mx-1.5 -my-1 flex shrink-0">
      <TableDiceRow groups={[dice]} />
    </span>
  );
}

/** What was rolled, then its result, like a table roll. */
function OwnRoll({ what, result }: { what: string; result: string }) {
  return (
    <>
      <span className="min-w-0 shrink truncate text-parchment-dim">{what}</span>
      <span className="min-w-0 flex-1 truncate text-right font-medium text-parchment/85">
        {result}
      </span>
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
      <OwnRoll what={text.split(" -> ")[0]!} result={arrow < 0 ? "" : text.slice(arrow + 4)} />
    </>
  );
}
