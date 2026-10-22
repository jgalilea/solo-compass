import { Link } from "react-router-dom";
import { useHistoryContext } from "../hooks/useHistoryContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { formatAnswer } from "../lib/i18n/answerText";
import { IconChevronRight, IconOracle, IconTable } from "./icons/Icons";

const ANSWER_COLOR: Record<string, string> = {
  si: "text-yes",
  no: "text-no",
  contradiccion: "text-contradiction",
};

/**
 * Las últimas tiradas (oráculo y tablas, con o sin aventura activa)
 * con acceso al historial completo. Sustituye a la pestaña
 * "Historial" de la barra: el registro sigue a un toque, sin ocupar
 * un hueco de la navegación principal.
 */
export function RecentRolls({ limit = 3, excludeId }: { limit?: number; excludeId?: string }) {
  const { status, entries } = useHistoryContext();
  const { t } = useLocaleContext();

  // La tirada que ya se está mostrando en grande no se repite aquí.
  const recent = entries.filter((e) => e.id !== excludeId).slice(0, limit);
  if (status !== "ready" || recent.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-medium uppercase tracking-wide text-parchment-dim">
          {t.oracle.recentHeading}
        </h2>
        <Link
          to="/historial"
          className="-m-2 flex items-center gap-1 p-2 text-sm text-parchment-dim transition hover:text-gold"
        >
          {t.oracle.viewAllHistory}
          <IconChevronRight size={14} />
        </Link>
      </div>
      <ul className="flex flex-col divide-y divide-ink-border/60 rounded-2xl border border-ink-border bg-ink-900/40">
        {recent.map((entry) => (
          <li key={entry.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
            {entry.kind === "oraculo" ? (
              <>
                <IconOracle size={16} className="shrink-0 text-parchment-dim/70" />
                <span className="min-w-0 flex-1 truncate italic text-parchment/85">
                  {entry.question ? `“${entry.question}”` : t.history.kindOracle}
                </span>
                <span
                  className={`shrink-0 font-display font-semibold ${ANSWER_COLOR[entry.answer]}`}
                >
                  {formatAnswer(t, entry)}
                </span>
              </>
            ) : (
              <>
                <IconTable size={16} className="shrink-0 text-parchment-dim/70" />
                <span className="shrink-0 text-parchment-dim">{entry.tableName}</span>
                <span className="min-w-0 flex-1 truncate text-right text-parchment/85">
                  {entry.resultText}
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
