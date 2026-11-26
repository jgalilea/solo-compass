import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { cardPurpose, showDraws } from "../lib/cards";
import { Die } from "./Die";
import { readRolledDice } from "../lib/diceNotation";
import { RollResult } from "./RollResult";
import { RolledDice, TableDiceRow } from "./RolledDice";
import { PlayingCard } from "./PlayingCard";
import { formatOracleResult } from "../lib/i18n/answerText";
import { oracleDice } from "../lib/oracle";
import { ROLE_COLOR } from "../lib/oracleEngines";
import { tableDice } from "../lib/rolledDice";
import { tableRollDie, type HistoryEntry } from "../lib/history";
import { Link } from "react-router-dom";
import { IconJournal, IconPencil, IconStar, IconTrash } from "./icons/Icons";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { interpolate } from "../lib/i18n";

const ANSWER_COLOR: Record<string, string> = {
  si: "text-yes",
  no: "text-no",
  contradiccion: "text-contradiction",
};

const SWIPE_THRESHOLD = 76;
const MAX_DRAG = 120;

function formatTime(dateLocale: string, ts: number): string {
  return new Intl.DateTimeFormat(dateLocale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}

export function HistoryEntryCard({
  entry,
  adventureId,
  adventureName,
  onRequestDelete,
  onToggleFavorite,
  onLog,
}: {
  entry: HistoryEntry;
  /** The adventure it was rolled for (none: a free roll) and its name (null: deleted since). */
  adventureId?: string;
  adventureName?: string | null;
  onRequestDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  /** Logs a free roll in a journal; none if there's no adventure to. */
  onLog?: (entry: HistoryEntry) => void;
}) {
  const { t } = useLocaleContext();
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  // Mirrors dragX without waiting for a repaint, so the final value
  // can be read on release without relying on a closure that might be
  // stale (the dragX update and the read on release can land in the
  // same tick).
  const dragXRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);

  // Pointer events are listened to on window while dragging, so the
  // gesture isn't lost if the finger/cursor leaves the card.
  useEffect(() => {
    if (!dragging) return;

    function handleMove(e: globalThis.PointerEvent) {
      if (e.pointerId !== pointerIdRef.current) return;
      const dx = e.clientX - startX.current;
      const clamped = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, dx));
      dragXRef.current = clamped;
      setDragX(clamped);
    }

    function handleUp(e: globalThis.PointerEvent) {
      if (e.pointerId !== pointerIdRef.current) return;
      const finalX = dragXRef.current;
      // Local visual state is cleared first; notifying the parent (which
      // triggers renders in another component) comes after and outside any
      // state updater, so the gesture is never left half-reset.
      dragXRef.current = 0;
      setDragX(0);
      setDragging(false);
      pointerIdRef.current = null;
      if (finalX >= SWIPE_THRESHOLD) {
        onToggleFavorite(entry.id);
      } else if (finalX <= -SWIPE_THRESHOLD) {
        onRequestDelete(entry.id);
      }
    }

    function handleCancel() {
      // Safety net: if for whatever reason pointerup never arrives
      // (e.g. switching apps mid-gesture), no action fires, only the
      // visual state is cleared.
      dragXRef.current = 0;
      setDragX(0);
      setDragging(false);
      pointerIdRef.current = null;
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    window.addEventListener("blur", handleCancel);
    return () => {
      window.removeEventListener("blur", handleCancel);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [dragging, entry.id, onRequestDelete, onToggleFavorite]);

  const handlePointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    startX.current = e.clientX;
    dragXRef.current = 0;
    pointerIdRef.current = e.pointerId;
    setDragging(true);
  }, []);

  const progress = Math.min(Math.abs(dragX) / SWIPE_THRESHOLD, 1);
  const revealFavorite = dragX > 4;
  const revealDelete = dragX < -4;

  const rolledDice = entry.kind === "dados" && !entry.card ? readRolledDice(entry.text) : null;
  const tableDie = entry.kind === "tabla" ? tableRollDie(entry) : null;
  const tableRolled = entry.kind === "tabla" && tableDie ? tableDice(tableDie, entry.total) : null;

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
        <div className="flex items-start justify-between gap-3 text-xs uppercase tracking-wide text-parchment-faint">
          <span>{entry.kind === "oraculo" ? t.history.kindOracle : entry.kind === "dados" ? (entry.card ? t.history.kindCards : t.history.kindDice) : entry.tableName}</span>
          <div className="flex items-center gap-4">
            <span className="normal-case tracking-normal">
              {formatTime(t.dateLocale, entry.timestamp)}
            </span>
            <button
              type="button"
              onClick={() => onToggleFavorite(entry.id)}
              aria-pressed={entry.favorite}
              aria-label={
                entry.favorite ? t.history.favoriteRemove : t.history.favoriteAdd
              }
              className={[
                "-m-2 p-2 transition",
                entry.favorite
                  ? "text-gold"
                  : "text-parchment-faint hover:text-gold",
              ].join(" ")}
            >
              <IconStar size={15} filled={entry.favorite} />
            </button>
            <button
              type="button"
              onClick={() => onRequestDelete(entry.id)}
              aria-label={t.history.deleteEntry}
              className="-m-2 p-2 text-parchment-faint transition hover:text-no"
            >
              <IconTrash size={15} />
            </button>
          </div>
        </div>

        {/* Which story it belongs to, or that it was a free roll. */}
        <div className="mt-1 flex min-w-0 items-center gap-1 text-xs text-parchment-dim">
          <IconJournal size={12} className="shrink-0" />
          {adventureId && adventureName ? (
            <Link
              to={`/diario/${adventureId}`}
              onPointerDown={(e) => e.stopPropagation()}
              className="min-w-0 truncate text-gold/90 underline decoration-dotted underline-offset-2 hover:text-gold"
            >
              {adventureName}
            </Link>
          ) : (
            <span className="truncate italic">{adventureId ? t.history.deletedAdventure : t.history.freeRoll}</span>
          )}
          {!adventureId && onLog && (
            <button
              type="button"
              onClick={() => onLog(entry)}
              className="-my-2 ml-auto flex shrink-0 items-center gap-1 py-2 pl-2 font-medium text-gold/90 transition hover:text-gold"
            >
              <IconPencil size={12} />
              {t.history.log}
            </button>
          )}
        </div>

        {entry.kind === "oraculo" ? (
          <div className="mt-2">
            {entry.question && (
              <p className="text-sm italic text-parchment/90">“{entry.question}”</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <div className="flex gap-1">
                {oracleDice(entry).flatMap((group) =>
                  group.rolls.map((v, i) => (
                    <Die
                      key={`${group.role}${i}`}
                      sides={group.sides}
                      value={v}
                      color={ROLE_COLOR[group.role]}
                      name={t.oracleDice[group.role]}
                      size="sm"
                      faded={group.rolls.length > 1 && v !== group.kept}
                    />
                  )),
                )}
              </div>
              <span
                className={[
                  // Same size for every variant (the short ones like "Yes"/"No"
                  // used to be bigger than the long ones, which looked
                  // inconsistent).
                  "break-words text-sm font-semibold",
                  ANSWER_COLOR[entry.answer],
                ].join(" ")}
              >
                {formatOracleResult(t, entry)}
              </span>
            </div>
          </div>
        ) : entry.kind === "dados" ? (
          entry.card ? (
            <div className="mt-2 flex items-center gap-3">
              <PlayingCard id={entry.card.id} />
              <CardDrawText text={entry.text} />
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
              {rolledDice && <RolledDice dice={rolledDice} />}
              <DiceRollText text={showDraws(entry.text)} />
            </div>
          )
        ) : (
          <div className="mt-2 flex items-center gap-3">
            {tableRolled && <TableDiceRow groups={[tableRolled]} size="sm" />}
            <div className="min-w-0">
              <p className="break-words text-sm text-parchment/90">{entry.resultText}</p>
              <p className="mt-1 text-xs text-parchment-dim">
                {interpolate(t.history.rollLabel, {
                  rolls: tableDie ?? entry.rolls.join(" · "),
                  total: entry.total,
                })}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** A card drawn, beside its drawing: its name, under what it was for ("Omen"), if anything. */
function CardDrawText({ text }: { text: string }) {
  const arrow = text.lastIndexOf(" -> ");
  const purpose = cardPurpose(text);
  return (
    <div className="min-w-0">
      {purpose && <p className="text-xs text-parchment-dim">{purpose}</p>}
      <p className="break-words text-sm font-medium text-parchment">{text.slice(arrow + 4)}</p>
    </div>
  );
}

/** "Attack d20+5 -> 19 (14 + 5)": what was rolled small, the result below. */
function DiceRollText({ text }: { text: string }) {
  const arrow = text.lastIndexOf(" -> ");
  if (arrow < 0) return <p className="min-w-0 break-words text-sm text-parchment/90">{text}</p>;
  return (
    <div className="min-w-0">
      <p className="break-words text-xs text-parchment-dim">{text.slice(0, arrow)}</p>
      <p className="mt-0.5 flex flex-col">
        <RollResult result={text.slice(arrow + 4)} />
      </p>
    </div>
  );
}

