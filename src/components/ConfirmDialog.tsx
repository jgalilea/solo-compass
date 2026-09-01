export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirmar",
  onConfirm,
  onCancel,
}: {
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-ink-border bg-ink-800 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="font-display text-lg text-parchment">
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
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-no/90 px-4 py-2 text-sm font-medium text-ink-950 transition hover:bg-no"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
