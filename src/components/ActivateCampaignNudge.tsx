import { Link } from "react-router-dom";
import { useJournalContext } from "../hooks/useJournalContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { IconChevronRight, IconFeather } from "./icons/Icons";

/**
 * Aviso discreto para Oráculo y Tablas: sin campaña activa, nada
 * indica que el diario existe — este enlace lo hace visible justo
 * donde se tira, sin estorbar (no aparece si ya hay una activa, ni
 * en el resto de pantallas). Autocontenido a propósito, como
 * ActiveCampaignIndicator, para que el sitio de uso sea solo
 * `<ActivateCampaignNudge />`.
 */
export function ActivateCampaignNudge() {
  const { campaigns, activeCampaignId } = useJournalContext();
  const { t } = useLocaleContext();

  const hasActive = campaigns.some((c) => c.id === activeCampaignId);
  if (hasActive) return null;

  return (
    <Link
      to="/diario"
      className="flex items-center justify-center gap-1.5 text-center text-xs text-parchment-dim/70 transition hover:text-gold"
    >
      <IconFeather size={12} className="shrink-0" />
      {t.journal.activateNudge}
      <IconChevronRight size={12} className="shrink-0" />
    </Link>
  );
}
