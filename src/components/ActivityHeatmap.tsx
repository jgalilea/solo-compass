import { Fragment } from "react";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { interpolate } from "../lib/i18n";
import { activityLevel, lastYearByMonth } from "../lib/journalStats";

/** From nothing to the busiest day: the gold's strength (brightness, not hue, so it reads in every theme). */
const LEVEL_CLASS = ["bg-ink-700/70", "bg-gold/25", "bg-gold/50", "bg-gold/75", "bg-gold"] as const;

/**
 * The last year as a heat map: one row per month, one square per day
 * of it, brighter the more was written. Rows of days rather than
 * weeks: 31 columns fit a phone's width with squares you can still
 * see, and reading it needs no weekday grid. A summary for screen
 * readers; each square's day and count on hover.
 */
export function ActivityHeatmap({ activity, longestStreak }: { activity: Record<string, number>; longestStreak: number }) {
  const { t } = useLocaleContext();
  const s = t.journal.stats;
  const months = lastYearByMonth(activity, new Date());
  const days = months.flatMap((m) => m.days);
  const max = Math.max(0, ...days.map((d) => d.count));
  const played = days.filter((d) => d.count > 0).length;
  const monthName = new Intl.DateTimeFormat(t.dateLocale, { month: "short" });
  const dayName = new Intl.DateTimeFormat(t.dateLocale, { day: "numeric", month: "short", year: "numeric" });
  const summary = [
    played === 1 ? s.activityDaysOne : interpolate(s.activityDays, { count: played }),
    longestStreak === 1 ? s.streakOne : interpolate(s.streak, { count: longestStreak }),
  ];

  return (
    // As wide as the map at most, so the legend sits under its edge.
    <section className="flex max-w-xl flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-xs font-medium uppercase tracking-wide text-parchment-dim">{s.activityHeading}</h3>
        <p className="text-xs text-parchment-dim">{s.activityHint}</p>
      </div>
      <div
        role="img"
        aria-label={`${s.activityHeading}: ${summary.join(", ")}`}
        className="grid grid-cols-[auto_repeat(31,minmax(0,1fr))] items-center gap-x-[2px] gap-y-[3px]"
      >
        {months.map((month) => (
          <Fragment key={`${month.year}-${month.month}`}>
            {/* col-start-1: every month starts its own row, short ones end early. */}
            <span className="col-start-1 pr-1.5 text-[0.65rem] leading-none text-parchment-dim">
              {monthName.format(new Date(month.year, month.month, 1))}
            </span>
            {month.days.map((day) => (
              <span
                key={day.iso}
                title={
                  day.future
                    ? undefined
                    : interpolate(s.activityDay, {
                        date: dayName.format(new Date(month.year, month.month, day.day)),
                        count: `${day.count} ${s.entries.toLowerCase()}`,
                      })
                }
                className={`aspect-square rounded-[2px] ${day.future ? "border border-ink-border/40" : LEVEL_CLASS[activityLevel(day.count, max)]}`}
              />
            ))}
          </Fragment>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs">
        <p className="text-parchment">{summary.join(" · ")}</p>
        <div className="flex items-center gap-1 text-parchment-dim" aria-hidden>
          {s.activityLess}
          {LEVEL_CLASS.map((cls) => (
            <span key={cls} className={`size-2.5 rounded-[2px] ${cls}`} />
          ))}
          {s.activityMore}
        </div>
      </div>
    </section>
  );
}
