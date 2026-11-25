import { useId, useMemo } from "react";
import { useJournalContext } from "../hooks/useJournalContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { computeDiceStats } from "../lib/diceStats";
import { DialogBody, DialogHeader } from "./Dialog";
import { DiceStatsSection } from "./DiceStatsSection";
import { IconChart } from "./icons/Icons";
import { Modal } from "./Modal";

/** The luck of the player's dice in every adventure's journal (not the free rolls). */
export function AllDiceStatsDialog({ onClose }: { onClose: () => void }) {
  const { t } = useLocaleContext();
  const s = t.journal.stats;
  const titleId = useId();
  const { adventures, entries } = useJournalContext();
  const stats = useMemo(() => {
    const names = new Map(adventures.map((a) => [a.id, a.name]));
    return computeDiceStats(
      entries.filter((e) => names.has(e.adventureId)),
      (entry) => names.get(entry.adventureId)!,
    );
  }, [adventures, entries]);
  return (
    <Modal onClose={onClose} labelledBy={titleId} size="lg">
      <DialogHeader id={titleId} title={s.diceHeading} subtitle={<p>{s.allDiceSubtitle}</p>} Icon={IconChart} onClose={onClose} />
      <DialogBody className="flex flex-col gap-3">
        {stats.total > 0 ? <DiceStatsSection stats={stats} across /> : <p className="text-sm text-parchment-dim">{s.allDiceEmpty}</p>}
      </DialogBody>
    </Modal>
  );
}
