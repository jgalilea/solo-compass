import { useState } from "react";
import { rollOracle, type Likelihood, type OracleRoll } from "../lib/oracle";
import { useHistoryContext } from "../hooks/useHistoryContext";
import { LikelihoodPicker } from "./LikelihoodPicker";
import { OracleResultCard } from "./OracleResultCard";
import { EmptyState } from "./StateViews";
import { IconDice, IconExternalLink } from "./icons/Icons";

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
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 pb-2 pt-8">
      <header className="flex items-center justify-center gap-2.5">
        <h1 className="font-display text-3xl text-parchment">Oráculo</h1>
        <a
          href="https://gravenutterance.itch.io/recluse"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-gold transition hover:bg-gold/20"
          title="Ver Recluse, de Graven Utterance (CC BY 4.0)"
        >
          Recluse
          <IconExternalLink size={11} />
        </a>
      </header>

      <div className="flex flex-col gap-4 rounded-3xl border border-ink-border bg-ink-800/50 p-5">
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
          className="w-full resize-none rounded-2xl border border-ink-border bg-ink-900/70 px-4 py-3 text-parchment placeholder:text-parchment-dim/50 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
        />

        <LikelihoodPicker value={likelihood} onChange={setLikelihood} />

        <button
          type="button"
          onClick={handleRoll}
          className="w-full rounded-2xl bg-gold py-3 font-display text-lg font-semibold text-ink-950 shadow-lg shadow-gold/10 transition hover:bg-gold-soft active:scale-[0.99]"
        >
          Lanzar los dados
        </button>
      </div>

      {lastRoll ? (
        <OracleResultCard key={animateKey} roll={lastRoll} animate />
      ) : (
        <div className="flex flex-1 flex-col justify-center">
          <EmptyState
            icon={<IconDice size={32} />}
            title="Aún no has preguntado nada"
            description="Escribe una pregunta y lanza los dados."
          />
        </div>
      )}
    </div>
  );
}
