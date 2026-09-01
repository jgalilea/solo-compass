import { Die } from "./Die";
import { LIKELIHOOD_LABELS, type OracleRoll } from "../lib/oracle";

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

  return (
    <div className="animate-fade-up rounded-3xl border border-ink-border bg-ink-800/70 p-6 shadow-xl shadow-black/20 sm:p-8">
      {roll.question && (
        <p className="mb-5 text-center font-display text-lg italic text-parchment/90 sm:text-xl">
          “{roll.question}”
        </p>
      )}

      <div className="flex items-center justify-center gap-8">
        <DiceColumn label="Blanco" group={roll.white} animate={animate} />
        <div className="text-2xl text-parchment-dim/60">vs</div>
        <DiceColumn label="Negro" group={roll.black} animate={animate} />
      </div>

      <div className="mt-6 text-center">
        <div className={`font-display text-4xl font-semibold sm:text-5xl ${answer.className}`}>
          {answer.label}
        </div>
        {roll.qualifier && (
          <div
            className={`mt-1 text-lg font-medium sm:text-xl ${
              roll.qualifier === "y" ? "text-yes/90" : "text-no/90"
            }`}
          >
            {roll.qualifier === "y" ? "…y encima más." : "…pero con matices."}
          </div>
        )}
        {roll.answer === "contradiccion" && (
          <p className="mx-auto mt-3 max-w-sm text-sm text-parchment-dim">
            Alguna premisa de la pregunta es errónea. Revisa qué estás dando
            por sentado y replantea la pregunta.
          </p>
        )}
      </div>

      <p className="mt-5 text-center text-xs uppercase tracking-wide text-parchment-dim/70">
        {LIKELIHOOD_LABELS[roll.likelihood]}
      </p>
    </div>
  );
}

function DiceColumn({
  label,
  group,
  animate,
}: {
  label: string;
  group: OracleRoll["white"];
  animate: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[11px] uppercase tracking-wide text-parchment-dim/70">
        {label}
      </span>
      <div className="flex gap-1.5">
        {group.rolls.map((v, i) => (
          <Die
            key={i}
            value={v}
            color={group.color}
            animate={animate}
            faded={group.rolls.length > 1 && v !== group.kept}
            size={group.rolls.length > 1 ? "sm" : "lg"}
          />
        ))}
      </div>
    </div>
  );
}
