import { useLocaleContext } from "../hooks/useLocaleContext";
import type { Adventure } from "../lib/journal";
import { DialogBody } from "./Dialog";
import { Modal } from "./Modal";
import { IconChevronRight } from "./icons/Icons";

/** Which adventure's journal a free roll goes to. */
export function LogRollDialog({
  adventures,
  activeId,
  onPick,
  onClose,
}: {
  adventures: Adventure[];
  activeId: string | null;
  onPick: (adventure: Adventure) => void;
  onClose: () => void;
}) {
  const { t } = useLocaleContext();
  return (
    <Modal onClose={onClose} labelledBy="log-roll-title" centered size="sm">
      <DialogBody>
        <h2 id="log-roll-title" className="font-display text-xl text-parchment">
          {t.history.logTitle}
        </h2>
        <ul className="flex flex-col gap-2">
          {adventures.map((adventure) => (
            <li key={adventure.id}>
              <button
                type="button"
                onClick={() => onPick(adventure)}
                className="flex w-full items-center gap-2 rounded-xl border border-ink-border px-3.5 py-2.5 text-left text-sm text-parchment transition hover:border-gold/50 hover:text-gold"
              >
                <span className="min-w-0 flex-1 truncate">{adventure.name}</span>
                {adventure.id === activeId && (
                  <span className="shrink-0 text-xs text-gold">{t.journal.activeLabel}</span>
                )}
                <IconChevronRight size={14} className="shrink-0 text-parchment-faint" />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onClose}
          className="self-end rounded-full px-4 py-2 text-sm text-parchment-dim transition hover:text-parchment"
        >
          {t.common.cancel}
        </button>
      </DialogBody>
    </Modal>
  );
}
