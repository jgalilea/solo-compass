import { useLocaleContext } from "../hooks/useLocaleContext";
import { interpolate } from "../lib/i18n";
import type { Adventure } from "../lib/journal";
import { ConsequenceComposer } from "./ConsequenceComposer";

/** The latest roll on this screen: a table, or the quick inspiration. */
export interface LastResult {
  /** Table id, or "inspiration": which row shows it inline on phones. */
  sourceId: string;
  /** History id, to link the consequence. */
  rollId: string;
  /** Every history roll it's made of (the inspiration's two tables). */
  rollIds?: string[];
  title: string;
  /** "d20 · 14", or the inspiration's "Action 3/4, Theme 2/5". */
  detail: string;
  /** Value looked up in the table (single tables only). */
  total?: number;
  text: string;
}

export function ResultPanel({
  last,
  activeAdventure,
  onSaveConsequence,
  inline = false,
}: {
  last: LastResult;
  activeAdventure: Adventure | null;
  onSaveConsequence: (rollId: string, text: string) => void;
  inline?: boolean;
}) {
  const { t } = useLocaleContext();

  return (
    <div className="flex flex-col gap-3">
      <div
        className={[
          "animate-fade-up rounded-2xl border p-4",
          inline ? "border-ink-border bg-ink-900/60" : "border-gold/40 bg-ink-800/70 p-5",
        ].join(" ")}
      >
        {/* A generator's detail is long: it wraps under the title. */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-xs uppercase tracking-wide text-parchment-dim">
          <span className="max-w-full truncate">
            {inline && last.total !== undefined ? interpolate(t.tables.resultLabel, { n: last.total }) : last.title}
          </span>
          <span className="min-w-0 break-words">
            {last.detail}
            {!inline && last.total !== undefined && ` → ${last.total}`}
          </span>
        </div>
        <p className={inline ? "mt-2 text-parchment" : "mt-3 text-lg font-medium leading-snug text-parchment"}>
          {last.text}
        </p>
      </div>

      {activeAdventure && (
        <ConsequenceComposer
          onSave={(text) => onSaveConsequence(last.rollId, text)}
          placeholder={t.oracle.consequencePlaceholder}
          saveLabel={t.common.save}
          savedLabel={interpolate(t.oracle.consequenceSaved, { name: activeAdventure.name })}
        />
      )}
    </div>
  );
}
