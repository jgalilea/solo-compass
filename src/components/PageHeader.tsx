import type { ReactNode } from "react";

/**
 * The top of every screen, the same on all of them: its name on the
 * left with what belongs to it (the oracle's switcher, a way back) and,
 * at the other end of the row, what's done from there. Low on purpose:
 * on a phone the screen's tool has to be in sight without scrolling.
 */
export function PageHeader({
  title,
  subtitle,
  before,
  after,
  actions,
}: {
  title: string;
  subtitle?: string;
  /** Before the name: the way back. */
  before?: ReactNode;
  /** Right after the name. */
  after?: ReactNode;
  /** At the end of the row. */
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-1">
      <div className="flex min-h-10 flex-wrap items-center gap-x-2.5 gap-y-2">
        {before}
        <h1 className="font-display text-3xl leading-none text-parchment sm:text-4xl sm:leading-none">{title}</h1>
        {after}
        {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
      </div>
      {subtitle && <p className="text-sm text-parchment-dim">{subtitle}</p>}
    </header>
  );
}
