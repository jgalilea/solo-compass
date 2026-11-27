import { useRef, type ReactNode } from "react";
import { TABLE_THEMES, type TableTheme } from "../lib/tables";
import { FilterChips } from "./FilterChips";
import { smoothBehavior } from "../lib/scrolling";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { interpolate } from "../lib/i18n";
import { IconChevronRight, IconClose } from "./icons/Icons";

export function TableSection({
  title,
  actions,
  children,
}: {
  title: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-parchment-dim">
          {title}
        </h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

/**
 * One chip per theme (plus "All"): narrows every block, and the search,
 * to that theme. On phones the row scrolls sideways instead of wrapping
 * into several lines.
 */
export function ThemeFilter({
  value,
  onChange,
}: {
  value: TableTheme | null;
  onChange: (theme: TableTheme | null) => void;
}) {
  const { t } = useLocaleContext();
  return (
    <FilterChips
      label={t.tables.themeFilterLabel}
      allLabel={t.tables.allThemes}
      options={TABLE_THEMES.map((theme) => [theme, t.tables.themes[theme]] as const)}
      value={value}
      onChange={onChange}
      className="-mx-4 px-4"
    />
  );
}

/**
 * Blocks that fold, one under the other in a single frame (the player's
 * own, the games'): a list to look down, not a pile of cards. On a wide
 * screen (2xl) they're tiles side by side and what's open goes below
 * them all, so no row is a name and a number a metre apart.
 */
export function SectionList({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-medium uppercase tracking-wide text-parchment-dim">{title}</h2>
      <div className="flex flex-col divide-y divide-ink-border rounded-2xl border border-ink-border bg-ink-900/40 2xl:grid 2xl:grid-cols-3 2xl:gap-2.5 2xl:divide-y-0 2xl:border-0 2xl:bg-transparent 4xl:grid-cols-4">
        {children}
      </div>
    </section>
  );
}

/**
 * A block of tables (yours, or one game's) that folds away. Open, its
 * name stays pinned while its tables scroll by: with hundreds of them,
 * it's what folds it again. While searching or filtering it only shows
 * the tables that match.
 */
export function FoldingSection({
  title,
  note,
  count,
  countText,
  open,
  onToggle,
  children,
}: {
  title: string;
  /** Whose the tables are, with their licence: shown with them. */
  note?: string;
  count: number;
  /** What's counted, if not tables ("2 generators"). */
  countText?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const { t } = useLocaleContext();
  const panelRef = useRef<HTMLDivElement>(null);

  // What opens is brought into sight when it would start near the bottom
  // of the screen, or past it (on a wide one it's below all the tiles).
  function toggle() {
    onToggle();
    if (open) return;
    requestAnimationFrame(() => {
      const delta =
        (panelRef.current?.getBoundingClientRect().top ?? 0) - window.innerHeight * 0.55;
      if (delta > 0) window.scrollBy({ top: delta, behavior: smoothBehavior() });
    });
  }

  return (
    <div className="2xl:contents">
      <h3
        className={[
          "2xl:static 2xl:rounded-2xl 2xl:border",
          open
            ? "sticky top-0 z-10 rounded-t-2xl bg-ink-950 lg:top-14 2xl:border-gold/50 2xl:bg-gold/10"
            : "2xl:border-ink-border 2xl:bg-ink-900/40",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="flex min-h-13 w-full items-center gap-2.5 rounded-2xl px-4 py-2.5 text-left transition hover:bg-ink-800/60"
        >
          <IconChevronRight
            size={16}
            className={`shrink-0 text-gold transition-transform ${open ? "rotate-90" : ""}`}
          />
          <span className="min-w-0 flex-1 font-display text-lg leading-snug text-parchment">
            {title}
          </span>
          <span className="shrink-0 text-xs text-parchment-faint">
            {countText ??
              interpolate(count === 1 ? t.tables.sectionCountOne : t.tables.sectionCount, {
                count,
              })}
          </span>
        </button>
      </h3>
      {open && (
        <div
          ref={panelRef}
          className="flex flex-col gap-3 px-3 pb-4 pt-1 sm:px-4 2xl:order-1 2xl:col-span-full 2xl:rounded-2xl 2xl:border 2xl:border-ink-border 2xl:bg-ink-900/40 2xl:pt-3"
        >
          {/* Away from its tile, it says its name again. */}
          <div className="hidden items-center gap-3 2xl:flex">
            <span className="min-w-0 flex-1 px-1 font-display text-xl text-parchment">{title}</span>
            <button
              type="button"
              onClick={onToggle}
              aria-label={t.common.close}
              title={t.common.close}
              className="flex size-10 shrink-0 items-center justify-center rounded-full text-parchment-dim transition hover:text-gold"
            >
              <IconClose size={18} />
            </button>
          </div>
          {note && <p className="px-1 text-xs text-parchment-dim">{note}</p>}
          {children}
        </div>
      )}
    </div>
  );
}
