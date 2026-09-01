import { Die } from "./Die";
import type { OracleRoll } from "../lib/oracle";

const ANSWER_STYLES: Record<
  OracleRoll["answer"],
  { label: string; className: string; sizeClass: string }
> = {
  si: { label: "Sí", className: "text-yes", sizeClass: "text-5xl" },
  no: { label: "No", className: "text-no", sizeClass: "text-5xl" },
  contradiccion: {
    label: "Contradicción",
    className: "text-contradiction",
    // Palabra larga: en mayúsculas (Cinzel/Playfair/mono) a text-5xl
    // se sale del ancho de la tarjeta en móvil, así que va más chica.
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
  const answer = ANSWER_STYLES[roll.answer];
  const singleDie = roll.white.rolls.length === 1 && roll.black.rolls.length === 1;

  return (
    <div className="animate-fade-up flex flex-1 flex-col justify-center rounded-3xl border border-ink-border bg-ink-800/70 p-6 shadow-xl shadow-black/20">
      {roll.question && (
        <p className="mb-5 text-center font-display text-lg italic text-parchment/90">
          “{roll.question}”
        </p>
      )}

      <div className="flex items-center justify-center gap-6">
        <DiceGroup group={roll.white} animate={animate} large={singleDie} />
        <span className="text-base text-parchment-dim/60">vs</span>
        <DiceGroup group={roll.black} animate={animate} large={singleDie} />
      </div>

      <div className="mt-5 text-center">
        <div
          className={`break-words font-display font-semibold ${answer.sizeClass} ${answer.className}`}
        >
          {answer.label}
        </div>
        {roll.qualifier && (
          <div
            className={`mt-1 text-lg font-medium ${
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
    <div className="flex gap-2">
      {group.rolls.map((v, i) => (
        <Die
          key={i}
          value={v}
          color={group.color}
          animate={animate}
          faded={group.rolls.length > 1 && v !== group.kept}
          size={large ? "lg" : "md"}
        />
      ))}
    </div>
  );
}
