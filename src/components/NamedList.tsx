import type { NamedCount } from "../lib/journalStats";
import { CastIcon } from "./CastIcon";

/** The most named, each with a bar against the first. */
export function NamedList({ title, items }: { title: string; items: NamedCount[] }) {
  const max = items[0]?.count ?? 1;
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-ink-border bg-ink-900/50 px-4 py-3">
      <p className="text-xs text-parchment-dim">{title}</p>
      <ol className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.key} className="flex flex-col gap-1">
            <span className="flex items-center gap-2 text-sm text-parchment">
              <CastIcon kind={item.kind} size={15} className="shrink-0 text-gold" />
              <span className="min-w-0 flex-1 truncate">{item.name}</span>
              <span className="tabular-nums text-parchment-dim">{item.count}</span>
            </span>
            <span aria-hidden className="h-1 rounded-r bg-gold" style={{ width: `${(item.count / max) * 100}%` }} />
          </li>
        ))}
      </ol>
    </div>
  );
}
