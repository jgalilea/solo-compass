import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { findTagQuery, tagOptionText, tagOptions, type CastMember, type TagOption } from "../lib/lonelogTags";

export interface TagSuggestionsState {
  open: boolean;
  options: TagOption[];
  active: number;
  listId: string;
  optionId: (index: number) => string;
  pick: (option: TagOption) => void;
  setActive: (index: number) => void;
}

/**
 * Lonelog tag suggestions for a text field: typing "[" lists the
 * adventure's characters and places (and offers a new one), so tags
 * can be written without knowing their syntax. Arrows to move, Enter
 * or Tab to pick, Esc to close the list. Used by the composer and by
 * the entry editor; the list itself is <TagSuggestions>.
 *
 * The field stays controlled by its owner (`text`/`setText`); wire
 * `onChange` and `onKeyDown` (which returns true when it used the key)
 * and spread `inputProps` on the textarea.
 */
export function useTagAutocomplete({
  text,
  setText,
  inputRef,
  cast,
  enabled = true,
}: {
  text: string;
  setText: (text: string) => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  cast: CastMember[];
  /** Off where tags don't belong (a session title). */
  enabled?: boolean;
}) {
  const listId = useId();
  const [caret, setCaret] = useState(0);
  const [focused, setFocused] = useState(false);
  const [activeOption, setActiveOption] = useState(0);
  // The "[" whose list was closed with Esc.
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);

  // Caret to restore right after a picked tag is painted (setting the
  // value moves it to the end; doing it later would race fast typing).
  const pendingCaret = useRef<number | null>(null);
  useLayoutEffect(() => {
    const position = pendingCaret.current;
    if (position === null) return;
    pendingCaret.current = null;
    inputRef.current?.focus();
    inputRef.current?.setSelectionRange(position, position);
  }, [text, inputRef]);

  const query = enabled ? findTagQuery(text.slice(0, caret)) : null;
  const open = focused && !!query && query.start !== dismissedAt;
  const options = open ? tagOptions(cast, query) : [];
  const active = Math.min(activeOption, Math.max(options.length - 1, 0));
  const optionId = (index: number) => `${listId}-option-${index}`;

  function pick(option: TagOption) {
    if (!query) return;
    const after = text.slice(caret);
    const inserted = tagOptionText(option) + (after.startsWith(" ") ? "" : " ");
    const position = query.start + inserted.length;
    setText(text.slice(0, query.start) + inserted + after);
    setCaret(position);
    pendingCaret.current = position;
  }

  /** Call after the owner's own onChange (with the field). */
  function onChange(el: HTMLTextAreaElement) {
    setCaret(el.selectionStart);
    setActiveOption(0);
    if (!findTagQuery(el.value.slice(0, el.selectionStart))) setDismissedAt(null);
  }

  /** Call first in the field's onKeyDown; true if it used the key. */
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>): boolean {
    if (!open || e.nativeEvent.isComposing) return false;
    if (e.key === "Escape") {
      // Closes the list only; a second Esc does what the field does.
      e.preventDefault();
      e.stopPropagation();
      setDismissedAt(query!.start);
      return true;
    }
    if (options.length === 0) return false;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActiveOption((active + step + options.length) % options.length);
      return true;
    }
    if ((e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) || e.key === "Tab") {
      e.preventDefault();
      pick(options[active]);
      return true;
    }
    return false;
  }

  const inputProps = {
    onSelect: (e: { currentTarget: HTMLTextAreaElement }) => setCaret(e.currentTarget.selectionStart),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    role: "combobox",
    "aria-autocomplete": "list" as const,
    "aria-expanded": open,
    "aria-controls": open ? listId : undefined,
    "aria-activedescendant": options.length > 0 ? optionId(active) : undefined,
  };

  const suggestions: TagSuggestionsState = { open, options, active, listId, optionId, pick, setActive: setActiveOption };
  return { inputProps, onChange, onKeyDown, suggestions };
}
