import { NavLink, Outlet, useLocation } from "react-router-dom";
import { IconBook, IconCompass, IconDice, IconScroll } from "./icons/Icons";

const TABS = [
  { to: "/", label: "Oráculo", Icon: IconDice, end: true },
  { to: "/tablas", label: "Tablas", Icon: IconBook, end: false },
  { to: "/historial", label: "Historial", Icon: IconScroll, end: false },
];

export function Layout() {
  const location = useLocation();
  const isOracleTab = location.pathname === "/";

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-ink-border/70 px-4 py-2">
        <div className="mx-auto flex max-w-xl items-center gap-2 text-parchment">
          <IconCompass size={19} className="text-gold" />
          <span className="font-display text-base tracking-wide">
            Solo Compass
          </span>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>

      {!isOracleTab && (
        <footer className="px-4 pb-2 text-center text-[11px] leading-relaxed text-parchment-dim/50">
          Oráculo{" "}
          <a
            href="https://gravenutterance.itch.io/recluse"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-dotted hover:text-parchment-dim"
          >
            Recluse
          </a>{" "}
          de Graven Utterance (Oliver N), licencia CC BY 4.0.
        </footer>
      )}

      <nav className="sticky bottom-0 z-40 border-t border-ink-border bg-ink-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-xl">
          {TABS.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                [
                  "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] transition",
                  isActive ? "text-gold" : "text-parchment-dim hover:text-parchment",
                ].join(" ")
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
  );
}
