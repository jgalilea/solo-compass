import { useId, useMemo } from "react";
import { useHistoryContext } from "../hooks/useHistoryContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { interpolate } from "../lib/i18n";
import { computeAdventureStats } from "../lib/journalStats";
import type { JournalEntry } from "../lib/lonelog";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { IconChart } from "./icons/Icons";
import { DialogBody, DialogHeader } from "./Dialog";
import { Modal } from "./Modal";

/**
 * A bit of fun about an adventure: how much was played and written,
 * and what the oracle and the tables said. Everything is derived from
 * the journal (and the history, for rolls made in the app).
 */
export function AdventureStatsDialog({
  name,
  entries,
  onClose,
}: {
  name: string;
  entries: JournalEntry[];
  onClose: () => void;
}) {
  const { t } = useLocaleContext();
  const s = t.journal.stats;
  const { entries: history } = useHistoryContext();
  const titleId = useId();
  const stats = useMemo(
    () => computeAdventureStats(entries, new Map(history.map((h) => [h.id, h]))),
    [entries, history],
  );
  const number = new Intl.NumberFormat(t.dateLocale);
  const date = new Intl.DateTimeFormat(t.dateLocale, { day: "numeric", month: "long", year: "numeric" });

  const { oracle } = stats;
  const yesTenths = oracle.total ? Math.round((oracle.si / oracle.total) * 10) : 0;
  const mood = yesTenths >= 6 ? s.moodKind : yesTenths <= 4 ? s.moodStubborn : s.moodFair;
  const longDay = (iso: string) => date.format(new Date(`${iso}T12:00`));
  const firstDay = stats.first !== null ? longDay(stats.first) : null;
  const lastDay = stats.last !== null ? longDay(stats.last) : null;

  return (
    <Modal
      onClose={onClose}
      labelledBy={titleId}
      size="lg"
    >
      <DialogHeader id={titleId} title={s.title} subtitle={<p className="truncate">{name}</p>} Icon={IconChart} onClose={onClose} />
      <DialogBody className="flex flex-col gap-5">
        {stats.entries === 0 ? (
          <p className="text-sm text-parchment-dim">{s.empty}</p>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
              {(
                [
                  [s.sessions, stats.sessions],
                  [s.entries, stats.entries],
                  [s.words, stats.words],
                  [s.daysPlayed, stats.daysPlayed],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-ink-border bg-ink-900/50 px-4 py-3">
                  <dt className="text-xs text-parchment-dim">{label}</dt>
                  <dd className="font-display text-2xl tabular-nums text-parchment">{number.format(value)}</dd>
                </div>
              ))}
            </dl>
            {firstDay && lastDay && (
              <p className="-mt-2 text-xs text-parchment-dim">
                {firstDay === lastDay
                  ? interpolate(s.singleDate, { date: firstDay })
                  : interpolate(s.dateRange, { first: firstDay, last: lastDay })}
              </p>
            )}

            {/* Only what was written in the app: an imported journal has no days of its own. */}
            {Object.keys(stats.activity).length > 0 && (
              <ActivityHeatmap activity={stats.activity} longestStreak={stats.longestStreak} />
            )}

            <section className="flex flex-col gap-3">
              <h3 className="text-xs font-medium uppercase tracking-wide text-parchment-dim">{s.oracleHeading}</h3>
              {oracle.total === 0 ? (
                <p className="text-sm text-parchment-dim">{s.noOracle}</p>
              ) : (
                <>
                  <p className="text-sm text-parchment">{interpolate(mood, { pct: yesTenths })}</p>
                  {/* Colour plus the count beside each one: some themes are nearly monochrome. */}
                  <div className="flex h-2.5 overflow-hidden rounded-full bg-ink-900" aria-hidden>
                    <span className="bg-yes" style={{ width: `${(oracle.si / oracle.total) * 100}%` }} />
                    <span className="bg-no" style={{ width: `${(oracle.no / oracle.total) * 100}%` }} />
                    <span className="bg-contradiction" style={{ width: `${(oracle.contradiccion / oracle.total) * 100}%` }} />
                  </div>
                  <ul className="grid grid-cols-3 gap-2 text-center text-xs">
                    {(
                      [
                        [s.yes, oracle.si, "text-yes"],
                        [s.no, oracle.no, "text-no"],
                        [s.contradiction, oracle.contradiccion, "text-contradiction"],
                      ] as const
                    ).map(([label, value, color]) => (
                      <li key={label} className="rounded-xl border border-ink-border/70 px-2 py-2">
                        <span className={`block text-lg font-semibold tabular-nums ${color}`}>{number.format(value)}</span>
                        <span className="text-parchment-dim">{label}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-parchment-dim">
                    {s.questions}: {number.format(stats.questions)} ·{" "}
                    {interpolate(s.qualifiers, { and: oracle.and, but: oracle.but })}
                  </p>
                </>
              )}
            </section>

            {(stats.tableRolls > 0 || stats.diceRolls > 0) && (
              <section className="flex flex-col gap-2">
                <h3 className="text-xs font-medium uppercase tracking-wide text-parchment-dim">{s.rollsHeading}</h3>
                <p className="text-sm text-parchment">
                  {s.tableRolls}: {number.format(stats.tableRolls)} · {s.diceRolls}: {number.format(stats.diceRolls)}
                </p>
                {/* A "favourite" needs at least two rolls to mean anything. */}
                {stats.topTable && stats.topTable.count > 1 && (
                  <p className="text-sm text-parchment-dim">
                    {interpolate(s.topTable, { name: stats.topTable.name, count: stats.topTable.count })}
                  </p>
                )}
              </section>
            )}
          </>
        )}
      </DialogBody>
    </Modal>
  );
}
