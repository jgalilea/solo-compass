import { useLocaleContext } from "../hooks/useLocaleContext";
import { DialogBody } from "./Dialog";
import { Modal } from "./Modal";

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  description?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useLocaleContext();

  return (
    <Modal
      onClose={onCancel}
      labelledBy="confirm-dialog-title"
      centered
      size="sm"
    >
      <DialogBody className="block">
        <h2 id="confirm-dialog-title" className="font-display text-xl text-parchment">
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-sm text-parchment-dim">{description}</p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-4 py-2 text-sm text-parchment-dim transition hover:text-parchment"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-no/90 px-4 py-2 text-sm font-medium text-ink-950 transition hover:bg-no"
          >
            {confirmLabel}
          </button>
        </div>
      </DialogBody>
    </Modal>
  );
}
