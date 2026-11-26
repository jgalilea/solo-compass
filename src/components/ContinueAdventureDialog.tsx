import { useId, useState } from "react";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { interpolate } from "../lib/i18n";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "../lib/journalUi";
import { DialogBody, DialogFooter, DialogHeader } from "./Dialog";
import { IconContinue } from "./icons/Icons";
import { Modal } from "./Modal";

/**
 * Carrying on in a new adventure (continueAdventure.ts): what it takes
 * along, and its name. A question to answer, so a small dialog.
 */
export function ContinueAdventureDialog({
  name,
  onContinue,
  onClose,
}: {
  name: string;
  onContinue: (newName: string) => void;
  onClose: () => void;
}) {
  const { t } = useLocaleContext();
  const [value, setValue] = useState(() => interpolate(t.journal.continueNameDefault, { name }));
  const trimmed = value.trim();
  const formId = useId();

  return (
    <Modal onClose={onClose} labelledBy="continue-adventure-title" centered size="sm">
      <DialogHeader id="continue-adventure-title" title={t.journal.continueAdventure} Icon={IconContinue} onClose={onClose} />
      <DialogBody>
        <p className="text-sm text-parchment-dim">{interpolate(t.journal.continueDescription, { name })}</p>
        <form
          id={formId}
          onSubmit={(e) => {
            e.preventDefault();
            if (trimmed) onContinue(trimmed);
          }}
        >
          <label className="block">
            <span className="text-sm text-parchment-dim">{t.journal.continueNameLabel}</span>
            <input autoFocus value={value} onChange={(e) => setValue(e.target.value)} className={`${INPUT_CLASS} mt-1.5`} />
          </label>
        </form>
      </DialogBody>
      <DialogFooter>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-4 py-2 text-sm text-parchment-dim transition hover:text-parchment"
        >
          {t.common.cancel}
        </button>
        <button type="submit" form={formId} disabled={!trimmed} className={PRIMARY_BUTTON_CLASS}>
          {t.journal.continueButton}
        </button>
      </DialogFooter>
    </Modal>
  );
}
