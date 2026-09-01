import { Die } from "./Die";
import { formatAnswer } from "../lib/oracle";
import type { HistoryEntry } from "../lib/history";

const ANSWER_COLOR: Record<string, string> = {
  si: "text-yes",
  no: "text-no",
  contradiccion: "text-contradiction",
};

function formatTime(ts: number): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}

export function HistoryEntryCard({
  entry,
  onDelete,
}: {
  entry: HistoryEntry;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="group relative rounded-2xl border border-ink-border bg-ink-800/50 p-4">
      <button
        type="button"
        onClick={() => onDelete(entry.id)}
        aria-label="Eliminar entrada"
        className="absolute right-3 top-3 text-parchment-dim/50 opacity-0 transition hover:text-no group-hover:opacity-100 focus:opacity-100"
      >
        ✕
      </button>

      <div className="flex items-center justify-between gap-3 pr-6 text-xs uppercase tracking-wide text-parchment-dim/70">
        <span>{entry.kind === "oraculo" ? "Oráculo" : entry.tableName}</span>
        <span>{formatTime(entry.timestamp)}</span>
      </div>

      {entry.kind === "oraculo" ? (
        <div className="mt-2">
          {entry.question && (
            <p className="text-sm italic text-parchment/90">“{entry.question}”</p>
          )}
          <div className="mt-2 flex items-center gap-3">
            <div className="flex gap-1">
              {entry.white.rolls.map((v, i) => (
                <Die key={`w${i}`} value={v} color="blanco" size="sm" faded={v !== entry.white.kept} />
              ))}
              {entry.black.rolls.map((v, i) => (
                <Die key={`b${i}`} value={v} color="negro" size="sm" faded={v !== entry.black.kept} />
              ))}
            </div>
            <span className={`font-display text-lg font-semibold ${ANSWER_COLOR[entry.answer]}`}>
              {formatAnswer(entry)}
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-2">
          <p className="text-sm text-parchment/90">{entry.resultText}</p>
          <p className="mt-1 text-xs text-parchment-dim">
            Tirada: {entry.rolls.join(" · ")} → {entry.total}
          </p>
        </div>
      )}
    </div>
  );
}
