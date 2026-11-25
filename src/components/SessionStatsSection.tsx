import { useLocaleContext } from "../hooks/useLocaleContext";
import { interpolate } from "../lib/i18n";
import type { AdventureStats } from "../lib/journalStats";
import { ColumnChart } from "./ColumnChart";
import { StatsSection } from "./StatsSection";

/** More sessions than these don't fit a phone: the latest. */
const MAX_SESSIONS = 20;

/** The campaign's rhythm: how many entries each session had. */
export function SessionStatsSection({ sessions }: { sessions: AdventureStats["perSession"] }) {
  const { t } = useLocaleContext();
  const s = t.journal.stats;
  const number = new Intl.NumberFormat(t.dateLocale, { maximumFractionDigits: 0 });
  const name = (title: string | null) => title ?? t.journal.prologueLabel;
  // What comes before the first session isn't one: it's drawn, not averaged.
  const real = sessions.filter((x) => x.title !== null);
  const longest = real.reduce((a, b) => (b.words > a.words ? b : a));
  const average = (key: "entries" | "words") => number.format(real.reduce((sum, x) => sum + x[key], 0) / real.length);
  const shown = sessions.slice(-MAX_SESSIONS);
  const firstReal = sessions.length - real.length;
  const offset = sessions.length - shown.length;
  return (
    <StatsSection id="sessionStats" title={s.sessionsHeading}>
      <div className="flex flex-col gap-1 text-sm text-parchment">
        <p>{interpolate(s.sessionsAverage, { entries: average("entries"), words: average("words") })}</p>
        <p>{interpolate(s.sessionsLongest, { session: name(longest.title), words: number.format(longest.words) })}</p>
      </div>
      <div className="rounded-2xl border border-ink-border bg-ink-900/50 px-4 py-3">
        <ColumnChart
          yLabel={offset > 0 ? interpolate(s.sessionsChartLast, { count: MAX_SESSIONS }) : s.sessionsChart}
          xLabel={s.sessionsChartX}
          bars={shown.map((x, i) => {
            const n = offset + i - firstReal + 1;
            return {
              label: n < 1 ? "" : shown.length <= 12 || n === 1 || n % 5 === 0 ? String(n) : "",
              value: x.entries,
              said: interpolate(s.sessionsBar, { session: name(x.title), entries: x.entries, words: number.format(x.words) }),
            };
          })}
        />
      </div>
    </StatsSection>
  );
}
