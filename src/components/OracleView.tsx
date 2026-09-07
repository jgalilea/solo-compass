import { useState } from "react";
import { rollOracle, type Likelihood, type OracleRoll } from "../lib/oracle";
import { useHistoryContext } from "../hooks/useHistoryContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { useOracleContext } from "../hooks/useOracleContext";
import { useJournalContext } from "../hooks/useJournalContext";
import { getOracle } from "../lib/oracles";
import { formatAnswer } from "../lib/i18n/answerText";
import { LikelihoodPicker } from "./LikelihoodPicker";
import { OracleResultCard } from "./OracleResultCard";
import { OracleSwitcher } from "./OracleSwitcher";
import { ActivateAdventureNudge } from "./ActivateAdventureNudge";
import { ConsequenceComposer } from "./ConsequenceComposer";
import { EmptyState } from "./StateViews";
import { IconDice } from "./icons/Icons";

export function OracleView() {
  const { addEntry } = useHistoryContext();
  const { t } = useLocaleContext();
  const { oracleId } = useOracleContext();
  const { adventures, activeAdventureId, addEntry: addJournalEntry } = useJournalContext();
  const [question, setQuestion] = useState("");
  const [likelihood, setLikelihood] = useState<Likelihood>("equilibrado");
  const [lastRoll, setLastRoll] = useState<OracleRoll | null>(null);
  const [animateKey, setAnimateKey] = useState(0);

  const activeAdventure = adventures.find((c) => c.id === activeAdventureId) ?? null;

  function handleRoll() {
    const roll = rollOracle(question, likelihood);
    setLastRoll(roll);
    setAnimateKey((k) => k + 1);
    addEntry(roll);

    if (activeAdventure) {
      const oracleName = getOracle(oracleId).name;
      if (roll.question) {
        addJournalEntry(activeAdventure.id, "question", roll.question, roll.id);
      }
      const diceText = `${oracleName} — ${t.die.color.blanco} ${roll.white.kept} / ${t.die.color.negro} ${roll.black.kept} -> ${formatAnswer(t, roll)}`;
      addJournalEntry(activeAdventure.id, "roll", diceText, roll.id);
    }
  }

  function handleConsequence(text: string) {
    if (!activeAdventure || !lastRoll) return;
    addJournalEntry(activeAdventure.id, "consequence", text, lastRoll.id);
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 pb-2 pt-8">
      <header className="flex items-center justify-center gap-2.5">
        <h1 className="font-display text-3xl text-parchment">{t.oracle.title}</h1>
        <OracleSwitcher />
      </header>

      <ActivateAdventureNudge />

      <div className="flex flex-col gap-4 rounded-3xl border border-ink-border bg-ink-800/50 p-5">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              handleRoll();
            }
          }}
          aria-label={t.oracle.questionLabel}
          placeholder={t.oracle.questionPlaceholder}
          rows={2}
          className="w-full resize-none rounded-2xl border border-ink-border bg-ink-900/70 px-4 py-3 text-parchment placeholder:text-parchment-dim/50 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
        />

        <LikelihoodPicker value={likelihood} onChange={setLikelihood} />

        <button
          type="button"
          onClick={handleRoll}
          className="w-full rounded-2xl bg-gold py-3 font-display text-lg font-semibold text-ink-950 shadow-lg shadow-gold/10 transition hover:bg-gold-soft active:scale-[0.99]"
        >
          {t.oracle.rollButton}
        </button>
      </div>

      {lastRoll ? (
        <div className="flex flex-1 flex-col justify-center gap-3">
          <OracleResultCard key={animateKey} roll={lastRoll} animate />
          {activeAdventure && (
            <ConsequenceComposer
              key={`${animateKey}-consequence`}
              onSave={handleConsequence}
              placeholder={t.oracle.consequencePlaceholder}
              saveLabel={t.common.save}
            />
          )}
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-center">
          <EmptyState
            icon={<IconDice size={32} />}
            title={t.oracle.emptyTitle}
            description={t.oracle.emptyDescription}
          />
        </div>
      )}
    </div>
  );
}
