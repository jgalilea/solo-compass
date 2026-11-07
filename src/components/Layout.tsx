import { useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { IconCoffee, IconCompass, IconJournal, IconOracle, IconTable } from "./icons/Icons";
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

  // Every screen starts at the top: without this, on phones the
  // previous screen's scroll was inherited (e.g. history opened halfway
  // down the list). HashRouter doesn't support <ScrollRestoration>,
  // which is only for data routers.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Three sections: the full history no longer has its own tab — it's
  // reached from "Recent rolls" on the oracle (and counts as part of
  // that section for highlighting).
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
      // With an active adventure, the bar shortcut goes straight to it —
      // the list is still reachable from the detail's "back" arrow.
      // The tab's own highlight is based on the section ("/diario"), not
      // on this specific destination, so it stays marked as active even
      // when navigating to another adventure from the list.
      to: activeAdventureId ? `/diario/${activeAdventureId}` : "/diario",
      label: t.nav.journal,
      Icon: IconJournal,
      isActive: location.pathname.startsWith("/diario"),
      hotkey: "3",
    },
  ];

  // Desktop shortcuts (legend in Settings; "?" is registered by SettingsDialog).
  useHotkeys({
    ...Object.fromEntries(tabs.map((tab) => [tab.hotkey, () => navigate(tab.to)])),
    h: () => navigate("/historial"),
    "/": () => focusHotkeyTarget("write"),
    o: () => focusHotkeyTarget("oracle"),
    t: () => focusHotkeyTarget("table"),
    d: () => focusHotkeyTarget("dice"),
  });

  // Esc in a text field drops focus, so shortcuts keep working without
  // reaching for the mouse (dialogs and menus already use Esc to close,
  // and they come first).
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
      {/* On desktop (lg+) the nav moves up into the header, which stays
          pinned at the top; the bottom bar is only for phone/tablet,
          where it's within thumb reach. Opaque background and no
          backdrop-blur on purpose: a backdrop-filter makes the header
          the containing block of its `fixed` children, and the dialogs
          living inside it (About, language, theme) would be clipped to
          its height. */}
      {/* On desktop it's exactly 3.5rem tall (h-14): the journal's sticky
          columns (top-14) sit right below it. */}
      {/* Three columns on desktop (1fr · auto · 1fr): the tabs always stay
          centred and nothing moves when the adventure chip appears or
          disappears depending on the screen. */}
      <header className="border-b border-ink-border/70 px-4 py-3 lg:sticky lg:top-0 lg:z-40 lg:flex lg:h-14 lg:items-center lg:bg-ink-950 lg:py-0">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3 text-parchment sm:px-4 md:max-w-3xl lg:grid lg:max-w-7xl lg:grid-cols-[1fr_auto_1fr] lg:gap-6 2xl:max-w-[110rem]">
          <div className="flex shrink-0 items-center gap-2.5">
            <IconCompass size={26} className="text-gold" />
            {/* On phones only the logo, so the adventure chip has room
                beside the Ko-fi and Settings icons. */}
            <span className="hidden font-display text-xl tracking-wide sm:inline">
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
            {/* Ko-fi, as a quiet icon beside Settings and in the same
                style, at every size: in sight on phones too without
                taking room or asking for anything. */}
            <a
              href={KOFI_URL}
              target="_blank"
              rel="noreferrer"
              aria-label={t.support.button}
              title={t.support.button}
              className="-m-1.5 shrink-0 p-1.5 text-parchment-dim transition hover:text-gold"
            >
              <IconCoffee size={22} />
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
        {/* Fixed height (see --spacing-nav in index.css; -1px for the border). */}
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
