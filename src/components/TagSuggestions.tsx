import { Fragment, useEffect } from "react";
import { useLocaleContext } from "../hooks/useLocaleContext";
import type { TagSuggestionsState } from "../hooks/useTagAutocomplete";
import { interpolate } from "../lib/i18n";
import { progressText, type TagOption } from "../lib/lonelogTags";
import { CastIcon } from "./CastIcon";

const isRecent = (option: TagOption | undefined) => !!option && "member" in option && !!option.recent;

/**
 * The list opened by "[" in a text field (see useTagAutocomplete):
 * above the composer, below a field being edited. Positioned against
 * the nearest positioned ancestor. It scrolls, so it never takes the
 * whole screen however long the cast gets.
 */
export function TagSuggestions({
  state,
  placement,
}: {
  state: TagSuggestionsState;
  placement: "above" | "below";
}) {
  const { t } = useLocaleContext();
  const activeId = state.open ? state.optionId(state.active) : null;
  // Keep the option chosen with the arrow keys in sight.
  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);
  if (!state.open) return null;
  return (
    <div
      id={state.listId}
      role="listbox"
      aria-label={t.notebook.suggestLabel}
      className={[
        "animate-fade-up absolute z-40 max-h-72 overflow-y-auto overscroll-contain rounded-2xl border border-ink-border bg-ink-800 py-1.5 shadow-2xl sm:right-auto sm:w-80",
        placement === "above" ? "inset-x-3 bottom-full mb-2" : "inset-x-0 top-full mt-1.5",
      ].join(" ")}
    >
      {state.options.length === 0 ? (
        <p className="px-4 py-2 text-xs text-parchment-dim">{t.notebook.suggestHint}</p>
      ) : (
        state.options.map((option, i) => {
          const existing = "member" in option;
          const kind = existing ? option.member.kind : option.kind;
          const kindLabel = t.notebook.kinds[kind];
          const name = existing ? option.member.name : option.name;
          const progress = existing && option.member.progress ? progressText(option.member.progress) : "";
          const detail = existing
            ? [progress, ...option.member.tags].filter(Boolean).join(" · ") || kindLabel
            : state.actor
              ? t.notebook.suggestOtherName
              : interpolate(t.notebook.suggestNew, { kind: kindLabel });
          // The last few named go first, then everything in alphabetical order.
          const recent = isRecent(option);
          const heading =
            recent && i === 0
              ? t.notebook.suggestRecent
              : !recent && isRecent(state.options[i - 1])
                ? t.notebook.suggestAll
                : null;
          return (
            <Fragment key={`${kind}:${name}:${existing}:${recent}`}>
              {heading && (
                <p
                  aria-hidden
                  className={`px-4 pb-1 text-[11px] font-medium uppercase tracking-wider text-parchment-dim ${i > 0 ? "mt-1.5 border-t border-ink-border pt-2.5" : "pt-1"}`}
                >
                  {heading}
                </p>
              )}
              <button
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
                  <span className={`block truncate text-xs ${existing ? "text-parchment-dim" : "text-gold"}`}>
                    {detail}
                  </span>
                </span>
              </button>
            </Fragment>
          );
        })
      )}
    </div>
  );
}
