import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { Die } from "./Die";
import { formatAnswer } from "../lib/oracle";
import type { HistoryEntry } from "../lib/history";
import { IconStar, IconTrash } from "./icons/Icons";

const ANSWER_COLOR: Record<string, string> = {
  si: "text-yes",
  no: "text-no",
  contradiccion: "text-contradiction",
};

const SWIPE_THRESHOLD = 76;
const MAX_DRAG = 120;

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
  onRequestDelete,
  onToggleFavorite,
}: {
  entry: HistoryEntry;
  onRequestDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);

  // Se escuchan los eventos de puntero en window mientras se arrastra, para
  // no perder el gesto si el dedo/cursor sale de la tarjeta.
  useEffect(() => {
    if (!dragging) return;

    function handleMove(e: globalThis.PointerEvent) {
      const dx = e.clientX - startX.current;
      setDragX(Math.max(-MAX_DRAG, Math.min(MAX_DRAG, dx)));
    }

    function handleUp() {
      setDragX((current) => {
        if (current >= SWIPE_THRESHOLD) {
          onToggleFavorite(entry.id);
        } else if (current <= -SWIPE_THRESHOLD) {
          onRequestDelete(entry.id);
        }
        return 0;
      });
      setDragging(false);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [dragging, entry.id, onRequestDelete, onToggleFavorite]);

  const handlePointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    startX.current = e.clientX;
    setDragging(true);
  }, []);

  const progress = Math.min(Math.abs(dragX) / SWIPE_THRESHOLD, 1);
  const revealFavorite = dragX > 4;
  const revealDelete = dragX < -4;

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {(revealFavorite || revealDelete) && (
        <div
          aria-hidden
          className={[
            "absolute inset-0 flex items-center rounded-2xl px-5",
            revealFavorite ? "justify-start bg-gold" : "justify-end bg-no",
          ].join(" ")}
          style={{ opacity: 0.25 + progress * 0.75 }}
        >
          {revealFavorite ? (
            <IconStar filled size={20} className="text-ink-950" />
          ) : (
            <IconTrash size={20} className="text-ink-950" />
          )}
        </div>
      )}

      <div
        onPointerDown={handlePointerDown}
        style={{
          transform: dragX ? `translateX(${dragX}px)` : undefined,
          transition: dragging ? "none" : "transform 200ms ease",
          touchAction: "pan-y",
        }}
        className={[
          "relative rounded-2xl border p-4 transition-colors",
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
                entry.favorite
                  ? "Quitar de destacadas"
                  : "Marcar como destacada"
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
              onClick={() => onRequestDelete(entry.id)}
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
    </div>
  );
}
