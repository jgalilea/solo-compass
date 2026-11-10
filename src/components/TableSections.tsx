import type { ReactNode } from "react";
import { TABLE_THEMES, type TableTheme } from "../lib/tables";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { interpolate } from "../lib/i18n";
import { IconChevronRight } from "./icons/Icons";

export function TableSection({ title, actions, children }: { title: ReactNode; actions?: ReactNode; children: ReactNode }) {
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
export function ThemeFilter({ value, onChange }: { value: TableTheme | null; onChange: (theme: TableTheme | null) => void }) {
  const { t } = useLocaleContext();
  const chip = (selected: boolean) =>
    [
      "shrink-0 rounded-full border px-3 py-1.5 text-sm transition",
      // Filled when selected: not colour alone (some themes' gold is near-white).
      selected
        ? "border-gold bg-gold font-medium text-ink-950"
        : "border-ink-border text-parchment-dim hover:border-gold/50 hover:text-gold",
    ].join(" ");
  return (
    <div role="group" aria-label={t.tables.themeFilterLabel} className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
      <div className="flex gap-2 pb-1 lg:flex-wrap">
        <button type="button" aria-pressed={value === null} onClick={() => onChange(null)} className={chip(value === null)}>
          {t.tables.allThemes}
        </button>
        {TABLE_THEMES.map((theme) => (
          <button
            key={theme}
            type="button"
            aria-pressed={value === theme}
            onClick={() => onChange(value === theme ? null : theme)}
            className={chip(value === theme)}
          >
            {t.tables.themes[theme]}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * A block of tables (yours, or one game's) that folds away. While
 * searching or filtering it only shows the tables that match.
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
  note?: string;
  count: number;
  /** What's counted, if not tables ("2 generators"). */
  countText?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const { t } = useLocaleContext();
  return (
    <section className="rounded-2xl border border-ink-border bg-ink-900/40">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-2xl p-4 text-left transition hover:bg-ink-800/40"
      >
        <IconChevronRight
          size={16}
          className={`shrink-0 text-gold transition-transform ${open ? "rotate-90" : ""}`}
        />
        <span className="min-w-0 flex-1">
          <span className="block font-display text-lg leading-snug text-parchment">{title}</span>
          {note && <span className="mt-0.5 block text-xs text-parchment-dim">{note}</span>}
        </span>
        <span className="shrink-0 text-xs text-parchment-faint">
          {countText ?? interpolate(count === 1 ? t.tables.sectionCountOne : t.tables.sectionCount, { count })}
        </span>
      </button>
      {open && <div className="px-3 pb-3 sm:px-4 sm:pb-4">{children}</div>}
    </section>
  );
}
