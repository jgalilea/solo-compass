import { useState } from "react";
import { rollOracle, type Likelihood, type OracleRoll } from "../lib/oracle";
import { useHistoryContext } from "../hooks/useHistoryContext";
import { LikelihoodPicker } from "./LikelihoodPicker";
import { OracleResultCard } from "./OracleResultCard";
import { EmptyState } from "./StateViews";
import { IconDice } from "./icons/Icons";

export function OracleView() {
  const { addEntry } = useHistoryContext();
  const [question, setQuestion] = useState("");
  const [likelihood, setLikelihood] = useState<Likelihood>("equilibrado");
  const [lastRoll, setLastRoll] = useState<OracleRoll | null>(null);
  const [animateKey, setAnimateKey] = useState(0);

  function handleRoll() {
    const roll = rollOracle(question, likelihood);
    setLastRoll(roll);
    setAnimateKey((k) => k + 1);
    addEntry(roll);
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-2.5 px-4 py-2 sm:gap-5 sm:py-6">
      <header className="flex items-center justify-center gap-2">
        <h1 className="font-display text-xl text-parchment sm:text-3xl">
          Oráculo
        </h1>
        <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gold">
          Recluse
        </span>
      </header>

      <div className="flex flex-col gap-2.5 rounded-3xl border border-ink-border bg-ink-800/50 p-3.5 sm:p-5">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              handleRoll();
            }
          }}
          aria-label="Pregunta para el oráculo"
          placeholder="¿Consigue Lydia saltar la valla antes de que la alcancen?"
          rows={2}
          className="w-full resize-none rounded-2xl border border-ink-border bg-ink-900/70 px-4 py-2.5 text-parchment placeholder:text-parchment-dim/50 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
        />

        <LikelihoodPicker value={likelihood} onChange={setLikelihood} />

        <button
          type="button"
          onClick={handleRoll}
          className="w-full rounded-2xl bg-gold py-2.5 font-display text-lg font-semibold text-ink-950 shadow-lg shadow-gold/10 transition hover:bg-gold-soft active:scale-[0.99]"
        >
          Lanzar los dados
        </button>
      </div>

      {lastRoll ? (
        <OracleResultCard key={animateKey} roll={lastRoll} animate />
      ) : (
        <EmptyState
          icon={<IconDice size={24} />}
          title="Aún no has preguntado nada"
          compact
        />
      )}
    </div>
  );
}
