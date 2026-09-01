import { NavLink, Outlet } from "react-router-dom";

const TABS = [
  { to: "/", label: "Oráculo", icon: "🎲", end: true },
  { to: "/tablas", label: "Tablas", icon: "📖", end: false },
  { to: "/historial", label: "Historial", icon: "📜", end: false },
];

export function Layout() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>

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

      <nav className="sticky bottom-0 z-40 border-t border-ink-border bg-ink-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-xl">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                [
                  "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs transition",
                  isActive ? "text-gold" : "text-parchment-dim hover:text-parchment",
                ].join(" ")
              }
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              {tab.label}
            </NavLink>
          ))}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
  );
}
