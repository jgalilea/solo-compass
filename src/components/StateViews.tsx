import type { ReactNode } from "react";
import { IconAlertTriangle } from "./icons/Icons";
import { useLocaleContext } from "../hooks/useLocaleContext";

export function LoadingState({ label }: { label?: string }) {
  const { t } = useLocaleContext();
  const text = label ?? t.common.loading;
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-parchment-dim">
      <span
        className="h-8 w-8 animate-spin rounded-full border-2 border-ink-500 border-t-gold"
        role="status"
        aria-label={text}
      />
      <p className="text-sm">{text}</p>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={[
        "flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-ink-border bg-ink-900/40 px-6 text-center",
        compact ? "py-6" : "py-16",
      ].join(" ")}
    >
      {icon && (
        <div className="flex items-center justify-center text-parchment-dim opacity-70">
          {icon}
        </div>
      )}
      <p className="font-display text-base text-parchment">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-parchment-dim">{description}</p>
      )}
      {action}
    </div>
  );
}

export function ErrorState({
  title,
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  const { t } = useLocaleContext();
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-no/30 bg-no/5 px-6 py-16 text-center">
      <IconAlertTriangle size={28} className="text-no" />
      <p className="font-display text-lg text-parchment">
        {title ?? t.common.somethingWrong}
      </p>
      {description && (
        <p className="max-w-sm text-sm text-parchment-dim">{description}</p>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-full border border-no/40 px-4 py-1.5 text-sm text-no transition hover:bg-no/10"
        >
          {t.common.retry}
        </button>
      )}
    </div>
  );
}
