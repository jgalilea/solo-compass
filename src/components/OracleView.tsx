import { useState } from "react";
import { rollOracle, type Likelihood, type OracleRoll } from "../lib/oracle";
import { useHistoryContext } from "../hooks/useHistoryContext";
import { LikelihoodPicker } from "./LikelihoodPicker";
import { OracleResultCard } from "./OracleResultCard";
import { EmptyState } from "./StateViews";

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
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="text-center">
        <h1 className="font-display text-3xl text-parchment sm:text-4xl">
          Oráculo Recluse
        </h1>
        <p className="mt-2 text-sm text-parchment-dim">
          Formula una pregunta de sí/no y deja que los dados decidan.
        </p>
      </header>

      <div className="flex flex-col gap-4 rounded-3xl border border-ink-border bg-ink-800/50 p-5 sm:p-6">
        <label className="block">
          <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-parchment-dim">
            Pregunta
          </span>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleRoll();
              }
            }}
            placeholder="¿Consigue Lydia saltar la valla antes de que la alcancen?"
            rows={2}
            className="w-full resize-none rounded-2xl border border-ink-border bg-ink-900/70 px-4 py-3 text-parchment placeholder:text-parchment-dim/50 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
          />
        </label>

        <LikelihoodPicker value={likelihood} onChange={setLikelihood} />

        <button
          type="button"
          onClick={handleRoll}
          className="mt-1 w-full rounded-2xl bg-gold py-3 font-display text-lg font-semibold text-ink-950 shadow-lg shadow-gold/10 transition hover:bg-gold-soft active:scale-[0.99]"
        >
          Lanzar los dados
        </button>
      </div>

      {lastRoll ? (
        <OracleResultCard key={animateKey} roll={lastRoll} animate />
      ) : (
        <EmptyState
          icon="🎲"
          title="Aún no has preguntado nada"
          description="Escribe una pregunta de sí/no, elige la probabilidad y lanza los dados para consultar al oráculo."
        />
      )}
    </div>
  );
}
