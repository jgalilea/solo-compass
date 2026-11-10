import { useEffect, useRef, useState } from "react";
import type { Likelihood, OracleRoll } from "../lib/oracle";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { useJournalContext } from "../hooks/useJournalContext";
import { useOracleContext } from "../hooks/useOracleContext";
import { fitLikelihood, oracleLevels } from "../lib/oracleEngines";
import { usePlayActions } from "../hooks/usePlayActions";
import { interpolate } from "../lib/i18n";
import { LikelihoodPicker } from "./LikelihoodPicker";
import { OracleResultCard } from "./OracleResultCard";
import { OracleHelp } from "./OracleHelp";
import { OracleSwitcher } from "./OracleSwitcher";
import { ConsequenceComposer } from "./ConsequenceComposer";
import { RecentRolls } from "./RecentRolls";
import { EmptyState } from "./StateViews";
import { IconOracle } from "./icons/Icons";

export function OracleView() {
  const { t } = useLocaleContext();
  const { adventures, activeAdventureId } = useJournalContext();
  const { askOracle, addConsequence } = usePlayActions();
  const [question, setQuestion] = useState("");
  const { oracleId } = useOracleContext();
  const [likelihood, setLikelihood] = useState<Likelihood>("equilibrado");
  // Kept as picked: going back to an oracle with five levels restores it.
  const level = fitLikelihood(oracleId, likelihood);
  const [lastRoll, setLastRoll] = useState<OracleRoll | null>(null);
  const [animateKey, setAnimateKey] = useState(0);
  const resultRef = useRef<HTMLDivElement>(null);

  const activeAdventure = adventures.find((c) => c.id === activeAdventureId) ?? null;

  // On phones the result sits below the form, often off screen: it's
  // scrolled into view on roll. "nearest" doesn't move anything if it's
  // already visible (desktop, where it's in the next column).
  useEffect(() => {
    if (animateKey > 0) {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [animateKey]);

  function handleRoll() {
    setLastRoll(askOracle(question, level));
    setAnimateKey((k) => k + 1);
  }

  return (
    // On desktop (lg+) question and result go in two columns, so
    // everything isn't stacked in a narrow strip with empty sides.
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 pb-8 pt-8 md:max-w-3xl md:pt-12 lg:grid lg:max-w-7xl lg:grid-cols-2 2xl:max-w-[110rem] 2xl:gap-16 lg:items-start lg:gap-10 lg:pb-12">
      <div className="flex flex-col gap-6 lg:sticky lg:top-24">
        <header className="flex items-center justify-center gap-2.5">
          <h1 className="font-display text-3xl text-parchment sm:text-4xl">{t.oracle.title}</h1>
          <OracleSwitcher />
          <OracleHelp />
        </header>

        <form
          className="flex flex-col gap-4 rounded-3xl border border-ink-border bg-ink-800/50 p-5 sm:p-6"
          onSubmit={(e) => {
            e.preventDefault();
            handleRoll();
          }}
        >
          <input
            data-hotkey="write oracle"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            aria-label={t.oracle.questionLabel}
            placeholder={t.oracle.questionPlaceholder}
            enterKeyHint="go"
            className="w-full rounded-2xl border border-ink-border bg-ink-900/70 px-4 py-3.5 text-base text-parchment placeholder:text-parchment-dim/50 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
          />

          <LikelihoodPicker value={level} onChange={setLikelihood} levels={oracleLevels(oracleId)} />

          <button
            type="submit"
            className="w-full rounded-2xl bg-gold py-3 font-display text-lg font-semibold text-ink-950 shadow-lg shadow-gold/10 transition hover:bg-gold-soft active:scale-[0.99]"
          >
            {t.oracle.rollButton}
          </button>
          <p className="-mt-1 hidden text-center text-xs text-parchment-dim/60 pointer-fine:block">
            {t.oracle.enterHint}
          </p>
        </form>
      </div>

      <div ref={resultRef} className="flex scroll-mt-24 scroll-mb-24 flex-col gap-6">
        {lastRoll ? (
          <div className="flex flex-col gap-3">
            <OracleResultCard key={animateKey} roll={lastRoll} animate />
            {activeAdventure && (
              <ConsequenceComposer
                key={`${animateKey}-consequence`}
                onSave={(text) => addConsequence(lastRoll.id, text)}
                placeholder={t.oracle.consequencePlaceholder}
                saveLabel={t.common.save}
                savedLabel={interpolate(t.oracle.consequenceSaved, { name: activeAdventure.name })}
              />
            )}
          </div>
        ) : (
          <EmptyState
            icon={<IconOracle size={28} />}
            title={t.oracle.emptyTitle}
            description={t.oracle.emptyDescription}
            compact
          />
        )}

        <RecentRolls exclude={lastRoll ? [lastRoll.id] : []} />
      </div>
    </div>
  );
}
