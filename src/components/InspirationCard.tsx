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
      <div className="flex items-start gap-3">
        <IconSparkles size={20} className="mt-0.5 shrink-0 text-gold" />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg leading-snug text-parchment">{t.tables.inspirationTitle}</h2>
          <p className="mt-0.5 text-sm text-parchment-dim">{t.tables.inspirationDescription}</p>
        </div>
        <button
          type="button"
          onClick={onRoll}
          disabled={rolling}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gold px-3.5 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-gold-soft active:scale-95 disabled:opacity-60"
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
