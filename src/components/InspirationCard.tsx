import { useEffect, useRef } from "react";
import { useLocaleContext } from "../hooks/useLocaleContext";
import type { Adventure } from "../lib/journal";
import { IconDice, IconSparkles } from "./icons/Icons";
import { ResultPanel, type LastResult } from "./TableResultPanel";
import { smoothBehavior } from "../lib/scrolling";

export function InspirationCard({
  last,
  rolling,
  activeAdventure,
  onRoll,
  onSaveConsequence,
}: {
  last: LastResult | null;
  rolling: boolean;
  activeAdventure: Adventure | null;
  onRoll: () => void;
  onSaveConsequence: (rollId: string, text: string) => void;
}) {
  const { t } = useLocaleContext();
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (last) resultRef.current?.scrollIntoView({ behavior: smoothBehavior(), block: "nearest" });
  }, [last]);

  return (
    <section className="rounded-2xl border border-gold/40 bg-gold/[0.06] p-4 sm:p-5">
      {/* On phones the description goes below, across the whole card. */}
      <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2">
        <h2 className="flex min-w-0 items-center gap-2.5 font-display text-lg leading-snug text-parchment">
          <IconSparkles size={20} className="shrink-0 text-gold" />
          {t.tables.inspirationTitle}
        </h2>
        <p className="max-sm:col-span-2 max-sm:row-start-2 text-sm leading-snug text-parchment-dim sm:row-start-2 sm:pl-7.5">
          {t.tables.inspirationDescription}
        </p>
        <button
          type="button"
          onClick={onRoll}
          disabled={rolling}
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-gold px-4 text-sm font-semibold text-ink-950 transition hover:bg-gold-soft active:scale-95 disabled:opacity-60 sm:row-span-2 max-sm:col-start-2 max-sm:row-start-1"
        >
          <IconDice size={17} className={rolling ? "animate-spin" : ""} />
          {t.tables.inspirationButton}
        </button>
      </div>
      {last && (
        <div ref={resultRef} className="mt-4 scroll-mb-24 lg:hidden">
          <ResultPanel
            key={last.rollId}
            last={last}
            activeAdventure={activeAdventure}
            onSaveConsequence={onSaveConsequence}
            inline
          />
        </div>
      )}
    </section>
  );
}
