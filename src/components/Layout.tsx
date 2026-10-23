import { useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { IconCompass, IconHeart, IconJournal, IconOracle, IconTable } from "./icons/Icons";
import { SettingsDialog } from "./SettingsDialog";
import { StorageProtectionPrompt } from "./StorageProtection";
import { UpdatePrompt } from "./UpdatePrompt";
import { ActiveAdventureIndicator } from "./ActiveAdventureIndicator";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { useJournalContext } from "../hooks/useJournalContext";
import { KOFI_URL } from "../lib/support";

export function Layout() {
  const { t } = useLocaleContext();
  const { activeAdventureId } = useJournalContext();
  const location = useLocation();

  // Cada pantalla empieza arriba: sin esto, en móvil se heredaba el
  // scroll de la anterior (p. ej. el historial se abría a media lista).
  // HashRouter no admite <ScrollRestoration>, que es solo para los
  // routers de datos.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Tres secciones: el historial completo ya no ocupa pestaña propia —
  // se llega desde "Últimas tiradas" en el oráculo (y cuenta como parte
  // de esa sección a efectos de resaltado).
  const tabs = [
    {
      to: "/",
      label: t.nav.oracle,
      Icon: IconOracle,
      isActive: location.pathname === "/" || location.pathname.startsWith("/historial"),
    },
    {
      to: "/tablas",
      label: t.nav.tables,
      Icon: IconTable,
      isActive: location.pathname.startsWith("/tablas"),
    },
    {
      // Con aventura activa, el atajo de la barra va directo a ella —
      // la lista sigue accesible desde la flecha "volver" del detalle.
      // El resaltado del propio tab se basa en la sección ("/diario"),
      // no en este destino concreto, para que siga marcado como
      // activo aunque se navegue a otra aventura desde la lista.
      to: activeAdventureId ? `/diario/${activeAdventureId}` : "/diario",
      label: t.nav.journal,
      Icon: IconJournal,
      isActive: location.pathname.startsWith("/diario"),
    },
  ];

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {/* En escritorio (lg+) la navegación sube a la cabecera, que se
          queda fija arriba; la barra inferior es solo para móvil/tablet,
          donde queda al alcance del pulgar. Fondo opaco y sin
          backdrop-blur a propósito: un backdrop-filter convierte la
          cabecera en el bloque contenedor de sus hijos `fixed`, y los
          diálogos que viven dentro (Acerca de, idioma, tema) quedarían
          recortados a su altura. */}
      <header className="border-b border-ink-border/70 px-4 py-3.5 lg:sticky lg:top-0 lg:z-40 lg:bg-ink-950 lg:py-2.5">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-6 text-parchment sm:px-4 md:max-w-3xl lg:max-w-6xl">
          <div className="flex items-center gap-2.5">
            <IconCompass size={26} className="text-gold" />
            <span className="font-display text-xl tracking-wide">
              {t.header.appName}
            </span>
          </div>
          <nav className="hidden gap-1 lg:flex">
            {tabs.map(({ to, label, Icon, isActive }) => (
              <Link
                key={label}
                to={to}
                aria-current={isActive ? "page" : undefined}
                className={[
                  "flex items-center gap-2 rounded-full px-4 py-2 text-sm transition",
                  isActive
                    ? "bg-gold font-medium text-ink-950"
                    : "text-parchment-dim hover:bg-ink-800/60 hover:text-parchment",
                ].join(" ")}
              >
                <Icon size={17} />
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            {/* Solo en escritorio, donde sobra sitio en la cabecera; en
                móvil/tablet el apoyo vive en Ajustes → Acerca de. */}
            <a
              href={KOFI_URL}
              target="_blank"
              rel="noreferrer"
              title={t.support.button}
              className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-parchment-dim transition hover:bg-ink-800/60 hover:text-gold lg:flex"
            >
              <IconHeart size={17} />
              {t.support.headerLink}
            </a>
            <SettingsDialog />
          </div>
        </div>
      </header>

      <UpdatePrompt />
      <ActiveAdventureIndicator />
      <StorageProtectionPrompt />

      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>

      <nav className="sticky bottom-0 z-40 border-t lg:hidden border-ink-border bg-ink-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-xl md:max-w-3xl">
          {tabs.map(({ to, label, Icon, isActive }) => (
            <Link
              key={label}
              to={to}
              aria-current={isActive ? "page" : undefined}
              className={[
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] transition",
                isActive ? "text-gold font-medium" : "text-parchment-dim hover:text-parchment",
              ].join(" ")}
            >
              <span
                className={[
                  "flex items-center justify-center rounded-full px-3 py-1 transition",
                  isActive ? "bg-gold text-ink-950" : "",
                ].join(" ")}
              >
                <Icon size={18} />
              </span>
              {label}
            </Link>
          ))}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
  );
}
