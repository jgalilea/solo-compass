import { useEffect, useRef } from "react";

/** Key (`e.key`, lowercased if it's a character) → action. */
export type HotkeyMap = Record<string, () => void>;

const FOCUSABLE = "input, textarea, select, button:not(:disabled), a[href], [tabindex]:not([tabindex='-1'])";

/** If focus is in a text field, keys are text, not shortcuts. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
    return true;
  }
  if (!(target instanceof HTMLInputElement)) return false;
  return !["button", "checkbox", "radio", "range", "submit", "reset", "file", "color"].includes(target.type);
}

/**
 * Desktop keyboard shortcuts (legend in Settings). They don't fire
 * while typing in a field, with Ctrl/Cmd/Alt held (so the browser's own
 * aren't overridden) or with a dialog open. Shift doesn't count as a
 * modifier: on the Spanish keyboard "/" and "?" need Shift.
 */
export function useHotkeys(map: HotkeyMap) {
  const mapRef = useRef(map);
  useEffect(() => {
    mapRef.current = map;
  });

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented || e.repeat || e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target) || document.querySelector('[aria-modal="true"]')) return;
      const action = mapRef.current[e.key.length === 1 ? e.key.toLowerCase() : e.key];
      if (!action) return;
      e.preventDefault();
      action();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}

function isVisible(el: Element): boolean {
  const html = el as HTMLElement;
  return html.checkVisibility ? html.checkVisibility() : html.offsetParent !== null;
}

/**
 * Moves focus to a shortcut's target: the first visible element with
 * `data-hotkey~="name"` (or the first focusable thing inside it). If
 * none is visible —the game table on phone/tablet is folded away— it
 * clicks the button that opens it (`data-hotkey-open="name"`).
 * This way screens only mark their elements and no refs need passing
 * up to the header.
 */
export function focusHotkeyTarget(name: string): boolean {
  const target = [...document.querySelectorAll(`[data-hotkey~="${name}"]`)].find(isVisible);
  if (target) {
    const field = target.matches(FOCUSABLE) ? target : target.querySelector(FOCUSABLE);
    if (field instanceof HTMLElement) {
      field.focus();
      field.scrollIntoView({ block: "nearest" });
      return true;
    }
  }
  const opener = [...document.querySelectorAll(`[data-hotkey-open="${name}"]`)].find(isVisible);
  if (opener instanceof HTMLElement) {
    opener.click();
    return true;
  }
  return false;
}
