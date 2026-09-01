import { Die } from "./Die";
import { formatAnswer } from "../lib/oracle";
import type { HistoryEntry } from "../lib/history";
import { IconStar, IconTrash } from "./icons/Icons";

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
  onToggleFavorite,
}: {
  entry: HistoryEntry;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-4 transition-colors",
        entry.favorite
          ? "border-gold/40 bg-gold/[0.06]"
          : "border-ink-border bg-ink-800/50",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3 text-xs uppercase tracking-wide text-parchment-dim/70">
        <span>{entry.kind === "oraculo" ? "Oráculo" : entry.tableName}</span>
        <div className="flex items-center gap-2.5">
          <span className="normal-case tracking-normal">
            {formatTime(entry.timestamp)}
          </span>
          <button
            type="button"
            onClick={() => onToggleFavorite(entry.id)}
            aria-pressed={entry.favorite}
            aria-label={
              entry.favorite ? "Quitar de destacadas" : "Marcar como destacada"
            }
            className={[
              "-m-1 p-1 transition",
              entry.favorite
                ? "text-gold"
                : "text-parchment-dim/50 hover:text-gold",
            ].join(" ")}
          >
            <IconStar size={15} filled={entry.favorite} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(entry.id)}
            aria-label="Eliminar entrada"
            className="-m-1 p-1 text-parchment-dim/50 transition hover:text-no"
          >
            <IconTrash size={15} />
          </button>
        </div>
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
