import { BlankDie } from "./Die";
import type { Likelihood } from "../lib/oracle";
import { ROLE_COLOR, oracleDicePlan, type OracleId } from "../lib/oracleEngines";
import { useLocaleContext } from "../hooks/useLocaleContext";

/**
 * Before the first question: the dice the selected oracle will throw at
 * the likelihood picked, waiting, laid out like the result that replaces
 * them (`OracleResultCard`), so picking another likelihood or oracle
 * already shows what changes.
 */
export function OracleWaiting({ oracleId, likelihood }: { oracleId: OracleId; likelihood: Likelihood }) {
  const { t } = useLocaleContext();
  const groups = oracleDicePlan(oracleId, likelihood);
  const singleDie = groups.every((g) => g.count === 1);
  const contest = oracleId === "recluse" || oracleId === "loner";

  return (
    <div className="flex flex-col items-center gap-5 rounded-3xl border border-dashed border-ink-border bg-ink-900/40 p-6 text-center">
      <div className="flex items-start justify-center gap-6">
        {groups.map((group, i) => (
          <div key={group.role} className="contents">
            {i > 0 && contest && <span className="self-center text-base text-parchment-faint">{t.oracle.vs}</span>}
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex gap-2">
                {Array.from({ length: group.count }, (_, n) => (
                  <BlankDie key={n} color={ROLE_COLOR[group.role]} size={singleDie ? "lg" : "md"} />
                ))}
              </div>
              {oracleId !== "recluse" && <span className="text-xs text-parchment-faint">{t.oracleDice[group.role]}</span>}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col items-center gap-2">
        <p className="font-display text-base text-parchment">{t.oracle.emptyTitle}</p>
        <p className="max-w-sm text-sm text-parchment-dim">{t.oracle.emptyDescription}</p>
      </div>
    </div>
  );
}
