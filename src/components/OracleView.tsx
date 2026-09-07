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
import { EmptyState } from "./StateViews";
import { IconDice } from "./icons/Icons";

export function OracleView() {
  const { addEntry } = useHistoryContext();
  const { t } = useLocaleContext();
  const { oracleId } = useOracleContext();
  const { campaigns, activeCampaignId, addEntry: addJournalEntry } = useJournalContext();
  const [question, setQuestion] = useState("");
  const [likelihood, setLikelihood] = useState<Likelihood>("equilibrado");
  const [lastRoll, setLastRoll] = useState<OracleRoll | null>(null);
  const [animateKey, setAnimateKey] = useState(0);

  const activeCampaign = campaigns.find((c) => c.id === activeCampaignId) ?? null;

  function handleRoll() {
    const roll = rollOracle(question, likelihood);
    setLastRoll(roll);
    setAnimateKey((k) => k + 1);
    addEntry(roll);

    if (activeCampaign) {
      const oracleName = getOracle(oracleId).name;
      if (roll.question) {
        addJournalEntry(activeCampaign.id, "question", roll.question, roll.id);
      }
      const diceText = `${oracleName} — ${t.die.color.blanco} ${roll.white.kept} / ${t.die.color.negro} ${roll.black.kept} -> ${formatAnswer(t, roll)}`;
      addJournalEntry(activeCampaign.id, "roll", diceText, roll.id);
    }
  }

  function handleConsequence(text: string) {
    if (!activeCampaign || !lastRoll) return;
    addJournalEntry(activeCampaign.id, "consequence", text, lastRoll.id);
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 pb-2 pt-8">
      <header className="flex items-center justify-center gap-2.5">
        <h1 className="font-display text-3xl text-parchment">{t.oracle.title}</h1>
        <OracleSwitcher />
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
          {activeCampaign && (
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

function ConsequenceComposer({
  onSave,
  placeholder,
  saveLabel,
}: {
  onSave: (text: string) => void;
  placeholder: string;
  saveLabel: string;
}) {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    if (!text.trim() || saved) return;
    onSave(text.trim());
    setSaved(true);
  }

  if (saved) return null;

  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-ink-border bg-ink-900/50 px-4 py-3.5">
      <span className="shrink-0 font-display text-base text-gold">=&gt;</span>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-base text-parchment placeholder:text-parchment-dim/50 focus:outline-none"
      />
      {text.trim() && (
        <button
          type="button"
          onClick={handleSave}
          className="-m-2 shrink-0 p-2 text-sm font-medium text-gold"
        >
          {saveLabel}
        </button>
      )}
    </div>
  );
}
