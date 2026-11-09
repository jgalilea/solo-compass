import { Die } from "./Die";
import { oracleDice, rollOracleId, type OracleRoll } from "../lib/oracle";
import { ROLE_COLOR, oracleTarget, type OracleDiceGroup } from "../lib/oracleEngines";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { interpolate } from "../lib/i18n";

const ANSWER_STYLE: Record<
  OracleRoll["answer"],
  { className: string; sizeClass: string }
> = {
  si: { className: "text-yes", sizeClass: "text-5xl" },
  no: { className: "text-no", sizeClass: "text-5xl" },
  contradiccion: {
    className: "text-contradiction",
    // Long word: uppercase (Cinzel/Playfair/mono) at text-5xl overflows
    // the card's width on phones, so it goes smaller.
    sizeClass: "text-3xl sm:text-4xl",
  },
};

export function OracleResultCard({
  roll,
  animate,
}: {
  roll: OracleRoll;
  animate: boolean;
}) {
  const { t } = useLocaleContext();
  const style = ANSWER_STYLE[roll.answer];
  const oracle = rollOracleId(roll);
  const groups = oracleDice(roll);
  const singleDie = groups.every((g) => g.rolls.length === 1);
  // Two sides compared (Recluse, Loner) read "white vs black"; the
  // others' dice are read each on its own.
  const contest = oracle === "recluse" || oracle === "loner";
  const target = oracleTarget(oracle, roll.likelihood);

  return (
    <div className="animate-fade-up rounded-3xl border border-ink-border bg-ink-800/70 p-6 shadow-xl shadow-black/20">
      {roll.question && (
        <p className="mb-5 text-center font-display text-lg italic text-parchment/90">
          “{roll.question}”
        </p>
      )}

      <div className="flex items-start justify-center gap-6">
        {groups.map((group, i) => (
          <div key={group.role} className="contents">
            {i > 0 && contest && <span className="self-center text-base text-parchment-dim/60">{t.oracle.vs}</span>}
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

      <div className="mt-5 text-center">
        <div
          className={`break-words font-display font-semibold ${style.sizeClass} ${style.className}`}
        >
          {t.answer[roll.answer]}
        </div>
        {roll.qualifier && (
          <div
            className={`mt-1 text-lg font-medium ${
              roll.qualifier === "y" ? "text-yes/90" : "text-no/90"
            }`}
          >
            …{t.qualifier[roll.qualifier]}.
          </div>
        )}
        {roll.answer === "contradiccion" && (
          <p className="mx-auto mt-3 max-w-sm text-sm text-parchment-dim">
            {t.oracle.contradictionExplanation}
          </p>
        )}
        {roll.special === "match" && (
          <p className="mx-auto mt-3 max-w-sm text-sm text-parchment-dim">
            <span className="font-semibold text-contradiction">{t.oracle.matchLabel}.</span> {t.oracle.matchExplanation}
          </p>
        )}
        {roll.twist && !roll.twist.happened && (
          <p className="mx-auto mt-3 max-w-sm text-sm text-parchment-dim">
            {interpolate(t.oracle.doubleExplanation, { count: roll.twist.counter })}
          </p>
        )}
        {roll.twist?.happened && (
          <div className="mx-auto mt-4 max-w-sm rounded-2xl border border-contradiction/40 bg-contradiction/10 px-4 py-3">
            <p className="font-display text-lg font-semibold text-contradiction">{t.oracle.twistLabel}</p>
            {roll.twist.result && <p className="mt-1 text-base text-parchment">{roll.twist.result}</p>}
            <p className="mt-1 text-xs text-parchment-dim">{t.oracle.twistExplanation}</p>
          </div>
        )}
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
    <div className="flex gap-2">
      {group.rolls.map((v, i) => (
        <Die
          key={i}
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
