import { useState, type ReactNode } from "react";
import { loadFoldedNotebookSections, toggleFoldedNotebookSection, type StatsBlock } from "../lib/notebookSections";
import { IconChevronRight } from "./icons/Icons";

/** A block of the statistics: its heading folds it, and that's kept per device. */
export function StatsSection({
  id,
  title,
  className = "",
  children,
}: {
  id: StatsBlock;
  title: string;
  /** For what's inside (the heading spans the whole width). */
  className?: string;
  children: ReactNode;
}) {
  const [folded, setFolded] = useState(() => loadFoldedNotebookSections().has(id));
  return (
    <section className="flex flex-col gap-2">
      <h3>
        <button
          type="button"
          onClick={() => setFolded(toggleFoldedNotebookSection(id, !folded).has(id))}
          aria-expanded={!folded}
          className="group flex w-full items-center gap-2 rounded-md py-1 text-left text-xs font-medium uppercase tracking-wide text-parchment-dim transition hover:text-parchment"
        >
          <span className="min-w-0 flex-1">{title}</span>
          <IconChevronRight
            size={16}
            className={`shrink-0 text-parchment-faint transition-transform group-hover:text-parchment ${folded ? "" : "rotate-90"}`}
          />
        </button>
      </h3>
      {!folded && <div className={`flex flex-col gap-3 ${className}`}>{children}</div>}
    </section>
  );
}
