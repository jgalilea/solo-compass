import type { ReactNode } from "react";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { interpolate } from "../lib/i18n";
import type { OracleRoll } from "../lib/oracle";
import type { OracleId } from "../lib/oracleEngines";

const ANSWER_STYLE: Record<OracleRoll["answer"], { className: string; sizeClass: string }> = {
  si: { className: "text-yes", sizeClass: "text-5xl" },
  no: { className: "text-no", sizeClass: "text-5xl" },
  // Long word: uppercase (Cinzel/Playfair/mono) at text-5xl overflows
  // the card's width on phones, so it goes smaller.
  contradiccion: { className: "text-contradiction", sizeClass: "text-3xl sm:text-4xl" },
};

type Verdict = Pick<OracleRoll, "answer" | "qualifier" | "special" | "twist">;

/** The answer, its "and"/"but" and whatever it needs explained. */
export function OracleVerdict({ roll }: { roll: Verdict }) {
  const { t } = useLocaleContext();
  const style = ANSWER_STYLE[roll.answer];
  return (
    <div className="text-center">
      <div className={`break-words font-display font-semibold ${style.sizeClass} ${style.className}`}>{t.answer[roll.answer]}</div>
      {roll.qualifier && (
        <div className={`mt-1 text-lg font-medium ${roll.qualifier === "y" ? "text-yes" : "text-no"}`}>
          …{t.qualifier[roll.qualifier]}.
        </div>
      )}
      {roll.answer === "contradiccion" && (
        <p className="mx-auto mt-3 max-w-sm text-sm text-parchment-dim">{t.oracle.contradictionExplanation}</p>
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
  );
}

// The tallest answers of each oracle (the theme, the language and the
// width decide which of them it is). Not Loner's twist, one double in
// three: too much room to leave empty the rest of the time.
const YES_BUT: Verdict = { answer: "si", qualifier: "pero" };
const TALLEST: Record<OracleId, Verdict[]> = {
  recluse: [YES_BUT, { answer: "contradiccion", qualifier: null }],
  loner: [{ ...YES_BUT, twist: { counter: 1, happened: false } }],
  ironsworn: [{ answer: "si", qualifier: null, special: "match" }],
  opse: [YES_BUT],
};

/**
 * Room for any of an oracle's answers, so the card is as high whatever
 * comes up (and before the first): the tallest ones are laid out unseen
 * behind what's shown.
 */
export function OracleVerdictSpace({ oracle, children }: { oracle: OracleId; children: ReactNode }) {
  return (
    <div className="grid w-full">
      {TALLEST[oracle].map((roll, i) => (
        <div key={i} aria-hidden className="invisible col-start-1 row-start-1">
          <OracleVerdict roll={roll} />
        </div>
      ))}
      <div className="col-start-1 row-start-1 self-center">{children}</div>
    </div>
  );
}
