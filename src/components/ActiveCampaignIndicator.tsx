import { Link, useLocation } from "react-router-dom";
import { useJournalContext } from "../hooks/useJournalContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { interpolate } from "../lib/i18n";
import { IconChevronRight, IconFeather } from "./icons/Icons";

/**
 * Tira fina visible en todas las pantallas (se monta en Layout, fuera
 * del <Outlet>) que recuerda cuál es la campaña activa y lleva a
 * ella. Se oculta si no hay ninguna activa, o si ya se está viendo
 * esa misma campaña (repetirlo ahí no aporta nada).
 */
export function ActiveCampaignIndicator() {
  const { campaigns, activeCampaignId } = useJournalContext();
  const { t } = useLocaleContext();
  const location = useLocation();

  const active = campaigns.find((c) => c.id === activeCampaignId) ?? null;
  if (!active) return null;
  if (location.pathname === `/diario/${active.id}`) return null;

  return (
    <Link
      to={`/diario/${active.id}`}
      aria-label={t.journal.goToActiveCampaign}
      className="flex items-center gap-2 border-b border-ink-border/70 bg-ink-900/40 px-4 py-2 text-xs text-parchment-dim transition hover:text-gold"
    >
      <IconFeather size={13} className="shrink-0 text-gold/70" />
      <span className="min-w-0 flex-1 truncate">
        {interpolate(t.journal.activeCampaignNote, { name: active.name })}
      </span>
      <IconChevronRight size={13} className="shrink-0 opacity-60" />
    </Link>
  );
}
