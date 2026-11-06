import { useLocaleContext } from "../hooks/useLocaleContext";
import type { TagSuggestionsState } from "../hooks/useTagAutocomplete";
import { interpolate } from "../lib/i18n";
import { CastIcon } from "./CastIcon";

/**
 * The list opened by "[" in a text field (see useTagAutocomplete):
 * above the composer, below a field being edited. Positioned against
 * the nearest positioned ancestor.
 */
export function TagSuggestions({
  state,
  placement,
}: {
  state: TagSuggestionsState;
  placement: "above" | "below";
}) {
  const { t } = useLocaleContext();
  if (!state.open) return null;
  return (
    <div
      id={state.listId}
      role="listbox"
      aria-label={t.notebook.suggestLabel}
      className={[
        "animate-fade-up absolute z-40 overflow-hidden rounded-2xl border border-ink-border bg-ink-800 py-1.5 shadow-2xl sm:right-auto sm:w-80",
        placement === "above" ? "inset-x-3 bottom-full mb-2" : "inset-x-0 top-full mt-1.5",
      ].join(" ")}
    >
      {state.options.length === 0 ? (
        <p className="px-4 py-2 text-xs text-parchment-dim">{t.notebook.suggestHint}</p>
      ) : (
        state.options.map((option, i) => {
          const existing = "member" in option;
          const kind = existing ? option.member.kind : option.kind;
          const kindLabel = { pc: t.notebook.kindPc, npc: t.notebook.kindNpc, place: t.notebook.kindPlace }[kind];
          const name = existing ? option.member.name : option.name;
          const detail = existing
            ? option.member.tags.join(" · ") || kindLabel
            : interpolate(t.notebook.suggestNew, { kind: kindLabel });
          return (
            <button
              key={`${kind}:${name}:${existing}`}
              id={state.optionId(i)}
              type="button"
              role="option"
              aria-selected={i === state.active}
              // Keeps the focus (and the phone keyboard) in the field.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => state.pick(option)}
              onMouseMove={() => state.setActive(i)}
              className={[
                "flex w-full items-center gap-2.5 px-4 py-2 text-left transition",
                i === state.active ? "bg-ink-700" : "hover:bg-ink-700/60",
              ].join(" ")}
            >
              <CastIcon kind={kind} size={16} className="shrink-0 text-gold" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-parchment">{name}</span>
                <span className={`block truncate text-xs ${existing ? "text-parchment-dim" : "text-gold"}`}>{detail}</span>
              </span>
            </button>
          );
        })
      )}
    </div>
  );
}
