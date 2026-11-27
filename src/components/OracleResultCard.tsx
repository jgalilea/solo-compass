import { Die } from "./Die";
import { oracleDice, rollOracleId, type OracleRoll } from "../lib/oracle";
import { ROLE_COLOR, oracleTarget, type OracleDiceGroup } from "../lib/oracleEngines";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { OracleVerdict, OracleVerdictSpace } from "./OracleVerdict";

const CARD_STYLE: Record<OracleRoll["answer"], { cardClass: string; glowClass: string }> = {
  si: { cardClass: "border-yes/40 shadow-yes/10", glowClass: "from-yes/10" },
  no: { cardClass: "border-no/40 shadow-no/10", glowClass: "from-no/10" },
  contradiccion: {
    cardClass: "border-contradiction/40 shadow-contradiction/10",
    glowClass: "from-contradiction/10",
  },
};

export function OracleResultCard({ roll, animate }: { roll: OracleRoll; animate: boolean }) {
  const { t } = useLocaleContext();
  const style = CARD_STYLE[roll.answer];
  const oracle = rollOracleId(roll);
  const groups = oracleDice(roll);
  const singleDie = groups.every((g) => g.rolls.length === 1);
  // Two sides compared (Recluse, Loner) read "white vs black"; the
  // others' dice are read each on its own.
  const contest = oracle === "recluse" || oracle === "loner";
  const target = oracleTarget(oracle, roll.likelihood);

  return (
    <div
      className={`relative isolate animate-fade-up overflow-hidden rounded-3xl border bg-ink-800/70 p-6 shadow-xl ${style.cardClass}`}
    >
      {/* The answer's colour washes the card from the top: the verdict
          is felt before it's read (the word below still says it). */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 -z-10 h-32 bg-linear-to-b to-transparent ${style.glowClass}`}
      />
      {roll.question && (
        <p className="mb-5 text-center text-lg italic text-parchment/90">“{roll.question}”</p>
      )}

      <div className="flex items-start justify-center gap-6">
        {groups.map((group, i) => (
          <div key={group.role} className="contents">
            {i > 0 && contest && (
              <span className="self-center text-base text-parchment-faint">{t.oracle.vs}</span>
            )}
            <div className="flex flex-col items-center gap-1.5">
              <DiceGroup group={group} animate={animate} large={singleDie} />
              {oracle !== "recluse" && (
                <span className="text-xs text-parchment-dim">
                  {t.oracleDice[group.role]}
                  {i === 0 && target !== undefined && ` · ${target}+`}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <OracleVerdictSpace oracle={oracle}>
          <OracleVerdict roll={roll} />
        </OracleVerdictSpace>
      </div>
    </div>
  );
}

function DiceGroup({
  group,
  animate,
  large,
}: {
  group: OracleDiceGroup;
  animate: boolean;
  large: boolean;
}) {
  const { t } = useLocaleContext();
  return (
    <div className="flex min-h-18 items-center gap-2">
      {group.rolls.map((v, i) => (
        <Die
          key={i}
          sides={group.sides}
          value={v}
          color={ROLE_COLOR[group.role]}
          name={t.oracleDice[group.role]}
          animate={animate}
          faded={group.rolls.length > 1 && v !== group.kept}
          size={large ? "lg" : "md"}
        />
      ))}
    </div>
  );
}
