import { useLocaleContext } from "../hooks/useLocaleContext";
import { MIN_DICE_FOR_TREND, type DiceStats, type DieStats } from "../lib/diceStats";
import { interpolate } from "../lib/i18n";
import { ColumnChart } from "./ColumnChart";

/** A chart needs a few dice, and more than four are too many to look at. */
const MIN_DICE_FOR_CHART = 5;
const MAX_CHARTS = 4;

/**
 * How the player's dice came up: whether they run high or low, the
 * feats worth telling (runs, extremes, a session's luck) and a small
 * chart per kind of die, with a line at what each face should get.
 */
export function DiceStatsSection({ stats }: { stats: DiceStats }) {
  const { t } = useLocaleContext();
  const s = t.journal.stats;
  const charts = stats.dice.filter((d) => d.count >= MIN_DICE_FOR_CHART).slice(0, MAX_CHARTS);
  const trend = { high: s.diceHigh, low: s.diceLow, normal: s.diceNormal };
  const number = new Intl.NumberFormat(t.dateLocale, { maximumFractionDigits: 1 });
  const sessionName = (title: string | null) => title ?? t.journal.prologueLabel;
  // Only with dice enough to say anything: two of a run are nothing.
  const feats = stats.trend
    ? [
        { name: s.featHighRun, value: String(stats.highRun), note: s.featHighRunNote },
        { name: s.featLowRun, value: String(stats.lowRun), note: s.featLowRunNote },
        { name: s.featTop, value: String(stats.top), note: interpolate(s.featTopNote, { expected: number.format(stats.extremes) }) },
        { name: s.featBottom, value: String(stats.bottom), note: interpolate(s.featBottomNote, { expected: number.format(stats.extremes) }) },
        ...(stats.favourite
          ? [
              {
                name: s.featFavourite,
                value: String(stats.favourite.face),
                note: interpolate(s.featFavouriteNote, { die: `d${stats.favourite.sides}`, count: stats.favourite.count }),
              },
            ]
          : []),
      ]
    : [];
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-medium uppercase tracking-wide text-parchment-dim">{s.diceHeading}</h3>
      <div className="flex flex-col gap-1">
        <p className="text-sm text-parchment">
          {stats.trend ? trend[stats.trend] : interpolate(s.diceFew, { count: MIN_DICE_FOR_TREND })}
        </p>
        <p className="text-xs text-parchment-dim">{s.diceHint}</p>
      </div>
      {feats.length > 0 && (
        <dl className="flex flex-wrap gap-2.5">
          {feats.map((feat) => (
            <div key={feat.name} className="flex grow basis-32 flex-col rounded-2xl border border-ink-border bg-ink-900/50 px-4 py-3">
              <dt className="text-xs text-parchment-dim">{feat.name}</dt>
              <dd className="font-display text-2xl tabular-nums text-parchment">{feat.value}</dd>
              <dd className="text-xs text-parchment-faint">{feat.note}</dd>
            </div>
          ))}
        </dl>
      )}
      {stats.sessions && (
        <ul className="flex flex-col gap-1 text-sm text-parchment">
          <li>{interpolate(s.sessionBest, { session: sessionName(stats.sessions.best.title) })}</li>
          <li>{interpolate(s.sessionWorst, { session: sessionName(stats.sessions.worst.title) })}</li>
        </ul>
      )}
      {charts.length > 0 && (
        <ul className="grid gap-2.5 md:grid-cols-2">
          {charts.map((die) => (
            <DieChart key={die.sides} die={die} />
          ))}
        </ul>
      )}
    </section>
  );
}

function DieChart({ die }: { die: DieStats }) {
  const { t } = useLocaleContext();
  const s = t.journal.stats;
  const decimal = new Intl.NumberFormat(t.dateLocale, { maximumFractionDigits: 1 });
  const face = (b: DieStats["bars"][number]) => (b.from === b.to ? String(b.from).replace("-", "−") : `${b.from}–${b.to}`);
  // What each would get; only where every bar has the same chance.
  const width = (b: DieStats["bars"][number]) => b.to - b.from;
  const even = die.bars.every((b) => width(b) === width(die.bars[0]));
  // With many faces, only the numbers that fit a phone.
  const runs = die.bars.some((b) => b.from !== b.to);
  const labelled = (b: DieStats["bars"][number], i: number) => runs || die.bars.length <= 12 || i === 0 || b.from % 5 === 0;
  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-ink-border bg-ink-900/50 px-4 py-3">
      <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-parchment-dim">
        <span className="text-sm font-semibold text-parchment">
          {die.sides ? `d${die.sides}` : "dF"} <span className="font-normal text-parchment-dim">× {die.count}</span>
        </span>
        <span>
          {interpolate(s.diceAverage, {
            average: decimal.format(die.average).replace("-", "−"),
            expected: decimal.format(die.expected),
          })}
        </span>
      </p>
      <ColumnChart
        bars={die.bars.map((b, i) => ({
          label: labelled(b, i) ? (runs ? String(b.from) : face(b)) : "",
          value: b.count,
          said: interpolate(s.diceFace, { face: face(b), count: b.count }),
        }))}
        line={even ? die.count / die.bars.length : undefined}
      />
    </li>
  );
}
