import { useMemo } from "react";
import { useHistoryContext } from "../hooks/useHistoryContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { useOracleContext } from "../hooks/useOracleContext";
import { interpolate } from "../lib/i18n";
import { lonerTwistCounterOf } from "../lib/oracleEngines";

/**
 * Loner's Twist Counter beside the oracle's name, only while Loner is
 * the oracle: quiet, as it's just a reminder (the roll that brings the
 * twist says so loudly). The adventure the next roll is for (none: the
 * free rolls' own counter).
 */
export function TwistCounter({ adventureId }: { adventureId: string | null | undefined }) {
  const { oracleId } = useOracleContext();
  const { entries } = useHistoryContext();
  const { t } = useLocaleContext();
  const count = useMemo(() => lonerTwistCounterOf(entries, adventureId), [entries, adventureId]);
  if (oracleId !== "loner") return null;
  return (
    <span title={t.oracle.twistCounterHint} className="whitespace-nowrap text-xs tabular-nums text-parchment-faint">
      <span aria-hidden>{interpolate(t.oracle.doubleShort, { count })}</span>
      <span className="sr-only">{`${t.oracle.twistCounterHint} ${count}/3`}</span>
    </span>
  );
}
