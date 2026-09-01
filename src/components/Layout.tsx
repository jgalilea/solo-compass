import { NavLink, Outlet } from "react-router-dom";
import { IconBook, IconCompass, IconDice, IconScroll } from "./icons/Icons";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { AboutDialog } from "./AboutDialog";

const TABS = [
  { to: "/", label: "Oráculo", Icon: IconDice, end: true },
  { to: "/tablas", label: "Tablas", Icon: IconBook, end: false },
  { to: "/historial", label: "Historial", Icon: IconScroll, end: false },
];

export function Layout() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-ink-border/70 px-4 py-3.5">
        <div className="mx-auto flex max-w-xl items-center justify-between text-parchment">
          <div className="flex items-center gap-2.5">
            <IconCompass size={26} className="text-gold" />
            <span className="font-display text-xl tracking-wide">
              Solo Compass
            </span>
          </div>
          <div className="flex items-center gap-4">
            <AboutDialog />
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>

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
