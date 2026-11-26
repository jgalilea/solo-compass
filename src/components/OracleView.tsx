import { useEffect, useRef, useState } from "react";
import type { OracleRoll } from "../lib/oracle";
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
import { TwistCounter } from "./TwistCounter";
import { ConsequenceComposer } from "./ConsequenceComposer";
import { RecentRolls } from "./RecentRolls";
import { OracleWaiting } from "./OracleWaiting";
import { PageHeader } from "./PageHeader";
import { PAGE_CLASS } from "../lib/pageLayout";
import { smoothBehavior } from "../lib/scrolling";

export function OracleView() {
  const { t } = useLocaleContext();
  const { adventures, activeAdventureId } = useJournalContext();
  const { askOracle, addConsequence } = usePlayActions();
  const [question, setQuestion] = useState("");
  const { oracleId, likelihood, setLikelihood } = useOracleContext();
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
      resultRef.current?.scrollIntoView({ behavior: smoothBehavior(), block: "nearest" });
    }
  }, [animateKey]);

  function handleRoll() {
    setLastRoll(askOracle(question, level));
    setAnimateKey((k) => k + 1);
  }

  return (
    <div className={PAGE_CLASS}>
      <PageHeader
        title={t.oracle.title}
        after={
          <>
            <OracleSwitcher />
            <TwistCounter adventureId={activeAdventureId} />
            <OracleHelp />
          </>
        }
      />

      {/* On desktop (lg+) question and answer sit side by side; on a wide
          one (3xl) the latest rolls get a column of their own. */}
      <div className="flex flex-col gap-5 md:gap-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8 3xl:grid-cols-[minmax(0,36rem)_minmax(0,1fr)_minmax(0,26rem)] 3xl:gap-10 4xl:grid-cols-[minmax(0,40rem)_minmax(0,1fr)_minmax(0,36rem)]">
        <form
          className="flex flex-col gap-4 rounded-3xl border border-ink-border bg-ink-800/50 p-4 sm:p-6 lg:row-span-2 3xl:row-span-1"
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
            className="w-full rounded-2xl border border-ink-border bg-ink-900/70 px-4 py-3.5 text-base text-parchment placeholder:text-parchment-faint focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
          />

          <LikelihoodPicker value={level} onChange={setLikelihood} levels={oracleLevels(oracleId)} />

          <button
            type="submit"
            className="w-full rounded-2xl bg-gold py-3 font-display text-lg font-semibold text-ink-950 shadow-lg shadow-gold/10 transition hover:bg-gold-soft active:scale-[0.99]"
          >
            {t.oracle.rollButton}
          </button>
          <p className="-mt-1 hidden text-center text-xs text-parchment-faint pointer-fine:block">
            {t.oracle.enterHint}
          </p>
        </form>

        <div ref={resultRef} className="scroll-mt-24 scroll-mb-24">
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
            <OracleWaiting oracleId={oracleId} likelihood={level} />
          )}
        </div>

        <RecentRolls kind="oraculo" wideLimit={9} />
      </div>
    </div>
  );
}
