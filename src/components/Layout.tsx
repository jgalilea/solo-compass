import { useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { IconCompass, IconHeart, IconJournal, IconOracle, IconTable } from "./icons/Icons";
import { SettingsDialog } from "./SettingsDialog";
import { UpdatePrompt } from "./UpdatePrompt";
import { ActiveAdventureChip } from "./ActiveAdventureChip";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { useJournalContext } from "../hooks/useJournalContext";
import { focusHotkeyTarget, isTypingTarget, useHotkeys } from "../hooks/useHotkeys";
import { KOFI_URL } from "../lib/support";

export function Layout() {
  const { t } = useLocaleContext();
  const { activeAdventureId } = useJournalContext();
  const location = useLocation();
  const navigate = useNavigate();

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
      hotkey: "1",
    },
    {
      to: "/tablas",
      label: t.nav.tables,
      Icon: IconTable,
      isActive: location.pathname.startsWith("/tablas"),
      hotkey: "2",
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
      hotkey: "3",
    },
  ];

  // Atajos de escritorio (leyenda en Ajustes; "?" lo registra SettingsDialog).
  useHotkeys({
    ...Object.fromEntries(tabs.map((tab) => [tab.hotkey, () => navigate(tab.to)])),
    h: () => navigate("/historial"),
    "/": () => focusHotkeyTarget("write"),
    o: () => focusHotkeyTarget("oracle"),
    t: () => focusHotkeyTarget("table"),
    d: () => focusHotkeyTarget("dice"),
  });

  // Esc en un campo de texto suelta el foco, para poder seguir con los
  // atajos sin coger el ratón (los diálogos y menús ya usan Esc para
  // cerrarse, y van antes).
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape" || e.defaultPrevented || !isTypingTarget(e.target)) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      (e.target as HTMLElement).blur();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {/* En escritorio (lg+) la navegación sube a la cabecera, que se
          queda fija arriba; la barra inferior es solo para móvil/tablet,
          donde queda al alcance del pulgar. Fondo opaco y sin
          backdrop-blur a propósito: un backdrop-filter convierte la
          cabecera en el bloque contenedor de sus hijos `fixed`, y los
          diálogos que viven dentro (Acerca de, idioma, tema) quedarían
          recortados a su altura. */}
      {/* En escritorio mide exactamente 3.5rem (h-14): las columnas fijas
          del diario (top-14) se colocan justo debajo. */}
      {/* Tres columnas en escritorio (1fr · auto · 1fr): las pestañas
          quedan siempre centradas y nada se mueve cuando el chip de la
          aventura aparece o desaparece según la pantalla. */}
      <header className="border-b border-ink-border/70 px-4 py-3 lg:sticky lg:top-0 lg:z-40 lg:flex lg:h-14 lg:items-center lg:bg-ink-950 lg:py-0">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3 text-parchment sm:px-4 md:max-w-3xl lg:grid lg:max-w-7xl lg:grid-cols-[1fr_auto_1fr] lg:gap-6 2xl:max-w-[110rem]">
          <div className="flex shrink-0 items-center gap-2.5">
            <IconCompass size={26} className="text-gold" />
            {/* En los móviles más estrechos solo el logo, para que quepa el chip. */}
            <span className="hidden font-display text-xl tracking-wide min-[380px]:inline">
              {t.header.appName}
            </span>
          </div>
          <nav className="hidden gap-1 lg:flex">
            {tabs.map(({ to, label, Icon, isActive, hotkey }) => (
              <Link
                key={label}
                to={to}
                aria-current={isActive ? "page" : undefined}
                aria-keyshortcuts={hotkey}
                title={`${label} (${hotkey})`}
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
          <div className="flex min-w-0 items-center justify-end gap-3 lg:gap-4">
            <ActiveAdventureChip />
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

      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>

      <nav className="sticky bottom-0 z-40 border-t lg:hidden border-ink-border bg-ink-950/90 backdrop-blur">
        {/* Alto fijo (ver --spacing-nav en index.css; -1px del borde). */}
        <div className="mx-auto flex h-[calc(var(--spacing-nav)-1px)] max-w-xl md:max-w-3xl">
          {tabs.map(({ to, label, Icon, isActive }) => (
            <Link
              key={label}
              to={to}
              aria-current={isActive ? "page" : undefined}
              className={[
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] transition",
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
