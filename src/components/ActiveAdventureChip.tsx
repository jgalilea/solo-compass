import { Link, useLocation } from "react-router-dom";
import { useJournalContext } from "../hooks/useJournalContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { interpolate } from "../lib/i18n";
import { IconJournal } from "./icons/Icons";

/**
 * Chip de la cabecera, el mismo en todas las pantallas: dónde se están
 * apuntando las tiradas y un atajo para volver a esa aventura. Sin
 * aventura activa avisa (atenuado) y lleva al diario para elegir una.
 * Se oculta donde repetirlo no aporta: dentro de esa misma aventura, o
 * en el diario si no hay ninguna activa (ya se está eligiendo).
 */
export function ActiveAdventureChip() {
  const { status, adventures, activeAdventureId } = useJournalContext();
  const { t } = useLocaleContext();
  const location = useLocation();

  if (status !== "ready") return null;
  const active = adventures.find((c) => c.id === activeAdventureId) ?? null;

  if (!active) {
    if (location.pathname.startsWith("/diario")) return null;
    return (
      <Link
        to="/diario"
        title={t.journal.noActiveChipTitle}
        aria-label={t.journal.noActiveChipTitle}
        className="flex min-w-0 items-center gap-1.5 rounded-full border border-dashed border-ink-border px-3 py-1.5 text-xs text-parchment-dim transition hover:border-gold/50 hover:text-gold"
      >
        <IconJournal size={14} className="shrink-0" />
        <span className="truncate">{t.journal.noActiveChip}</span>
      </Link>
    );
  }

  if (location.pathname === `/diario/${active.id}`) return null;
  return (
    <Link
      to={`/diario/${active.id}`}
      title={interpolate(t.journal.activeAdventureNote, { name: active.name })}
      aria-label={t.journal.goToActiveAdventure}
      className="flex min-w-0 items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold transition hover:bg-gold/20"
    >
      <IconJournal size={14} className="shrink-0" />
      <span className="truncate">{active.name}</span>
    </Link>
  );
}
