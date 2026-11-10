import type { ComponentType } from "react";
import { titleIfCut } from "../lib/truncation";
import { IconChevronRight } from "./icons/Icons";

/**
 * The heading of a block in the adventure's side column (sessions,
 * pinned notes, cast…): tapping it folds or unfolds the whole block.
 * Folded, it says how many things are inside.
 */
export function FoldingHeading({
  Icon,
  title,
  folded,
  onToggle,
  count,
}: {
  Icon: ComponentType<{ size?: number; className?: string }>;
  title: string;
  folded: boolean;
  onToggle: () => void;
  count?: number;
}) {
  return (
    <h2>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!folded}
        className="group flex w-full items-center gap-2 rounded-md py-0.5 text-left text-xs font-medium uppercase tracking-wide text-parchment-dim transition hover:text-parchment"
      >
        <Icon size={15} className="shrink-0 text-gold" />
        <span onMouseEnter={titleIfCut(title)} className="min-w-0 flex-1 truncate">
          {title}
        </span>
        {folded && count !== undefined && count > 0 && (
          <span className="shrink-0 font-normal normal-case tracking-normal text-parchment-dim/60">{count}</span>
        )}
        <IconChevronRight
          size={14}
          className={`shrink-0 text-parchment-dim/60 transition-transform group-hover:text-parchment ${folded ? "" : "rotate-90"}`}
        />
      </button>
    </h2>
  );
}
