import { Die } from "./Die";
import type { OracleRoll } from "../lib/oracle";

const ANSWER_STYLES: Record<OracleRoll["answer"], { label: string; className: string }> = {
  si: { label: "Sí", className: "text-yes" },
  no: { label: "No", className: "text-no" },
  contradiccion: { label: "Contradicción", className: "text-contradiction" },
};

export function OracleResultCard({
  roll,
  animate,
}: {
  roll: OracleRoll;
  animate: boolean;
}) {
  const answer = ANSWER_STYLES[roll.answer];
  const singleDie = roll.white.rolls.length === 1 && roll.black.rolls.length === 1;

  return (
    <div className="animate-fade-up rounded-3xl border border-ink-border bg-ink-800/70 p-4 shadow-xl shadow-black/20 sm:p-5">
      {roll.question && (
        <p className="mb-3 text-center font-display text-base italic text-parchment/90 sm:text-lg">
          “{roll.question}”
        </p>
      )}

      <div className="flex items-center justify-center gap-4">
        <DiceGroup group={roll.white} animate={animate} large={singleDie} />
        <span className="text-sm text-parchment-dim/60">vs</span>
        <DiceGroup group={roll.black} animate={animate} large={singleDie} />
      </div>

      <div className="mt-3 text-center">
        <div className={`font-display text-3xl font-semibold sm:text-4xl ${answer.className}`}>
          {answer.label}
        </div>
        {roll.qualifier && (
          <div
            className={`text-sm font-medium sm:text-base ${
              roll.qualifier === "y" ? "text-yes/90" : "text-no/90"
            }`}
          >
            {roll.qualifier === "y" ? "…y encima más." : "…pero con matices."}
          </div>
        )}
        {roll.answer === "contradiccion" && (
          <p className="mx-auto mt-2 max-w-sm text-xs text-parchment-dim">
            Alguna premisa de la pregunta es errónea. Revisa qué estás dando
            por sentado y replantea la pregunta.
          </p>
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
  group: OracleRoll["white"];
  animate: boolean;
  large: boolean;
}) {
  return (
    <div className="flex gap-1.5">
      {group.rolls.map((v, i) => (
        <Die
          key={i}
          value={v}
          color={group.color}
          animate={animate}
          faded={group.rolls.length > 1 && v !== group.kept}
          size={large ? "md" : "sm"}
        />
      ))}
    </div>
  );
}
