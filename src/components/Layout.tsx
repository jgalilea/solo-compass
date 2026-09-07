import { Link, Outlet, useLocation } from "react-router-dom";
import { IconBook, IconCompass, IconDice, IconFeather, IconScroll } from "./icons/Icons";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { AboutDialog } from "./AboutDialog";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ActiveCampaignIndicator } from "./ActiveCampaignIndicator";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { useJournalContext } from "../hooks/useJournalContext";

export function Layout() {
  const { t } = useLocaleContext();
  const { activeCampaignId } = useJournalContext();
  const location = useLocation();

  const tabs = [
    { to: "/", label: t.nav.oracle, Icon: IconDice, isActive: location.pathname === "/" },
    {
      to: "/tablas",
      label: t.nav.tables,
      Icon: IconBook,
      isActive: location.pathname.startsWith("/tablas"),
    },
    {
      // Con campaña activa, el atajo de la barra va directo a ella —
      // la lista sigue accesible desde la flecha "volver" del detalle.
      // El resaltado del propio tab se basa en la sección ("/diario"),
      // no en este destino concreto, para que siga marcado como
      // activo aunque se navegue a otra campaña desde la lista.
      to: activeCampaignId ? `/diario/${activeCampaignId}` : "/diario",
      label: t.nav.journal,
      Icon: IconFeather,
      isActive: location.pathname.startsWith("/diario"),
    },
    {
      to: "/historial",
      label: t.nav.history,
      Icon: IconScroll,
      isActive: location.pathname.startsWith("/historial"),
    },
  ];

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-ink-border/70 px-4 py-3.5">
        <div className="mx-auto flex max-w-xl items-center justify-between text-parchment">
          <div className="flex items-center gap-2.5">
            <IconCompass size={26} className="text-gold" />
            <span className="font-display text-xl tracking-wide">
              {t.header.appName}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <AboutDialog />
            <LanguageSwitcher />
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      <ActiveCampaignIndicator />

      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>

      <nav className="sticky bottom-0 z-40 border-t border-ink-border bg-ink-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-xl">
          {tabs.map(({ to, label, Icon, isActive }) => (
            <Link
              key={label}
              to={to}
              aria-current={isActive ? "page" : undefined}
              className={[
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] transition",
                isActive ? "text-gold" : "text-parchment-dim hover:text-parchment",
              ].join(" ")}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
  );
}
