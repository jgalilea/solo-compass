import type { ReactNode } from "react";

export function LoadingState({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-parchment-dim">
      <span
        className="h-8 w-8 animate-spin rounded-full border-2 border-ink-500 border-t-gold"
        role="status"
        aria-label={label}
      />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-ink-border bg-ink-900/40 px-6 py-16 text-center">
      {icon && <div className="text-3xl opacity-70">{icon}</div>}
      <p className="font-display text-lg text-parchment">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-parchment-dim">{description}</p>
      )}
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Algo ha ido mal",
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-no/30 bg-no/5 px-6 py-16 text-center">
      <div className="text-3xl">⚠️</div>
      <p className="font-display text-lg text-parchment">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-parchment-dim">{description}</p>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-full border border-no/40 px-4 py-1.5 text-sm text-no transition hover:bg-no/10"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
