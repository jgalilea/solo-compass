import { useEffect, useRef } from "react";

/** Tecla (`e.key`, en minúscula si es un carácter) → acción. */
export type HotkeyMap = Record<string, () => void>;

const FOCUSABLE = "input, textarea, select, button:not(:disabled), a[href], [tabindex]:not([tabindex='-1'])";

/** Si el foco está en un campo de texto, las teclas son texto, no atajos. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
    return true;
  }
  if (!(target instanceof HTMLInputElement)) return false;
  return !["button", "checkbox", "radio", "range", "submit", "reset", "file", "color"].includes(target.type);
}

/**
 * Atajos de teclado de escritorio (leyenda en Ajustes). No saltan
 * mientras se escribe en un campo, con Ctrl/Cmd/Alt pulsado (para no
 * pisar los del navegador) ni con un diálogo abierto. Las mayúsculas no
 * cuentan como modificador: en el teclado español "/" y "?" van con
 * Mayús.
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
 * Lleva el foco al destino de un atajo: el primer elemento visible con
 * `data-hotkey~="name"` (o lo primero enfocable dentro de él). Si no
 * hay ninguno a la vista —la mesa de juego en móvil/tablet está
 * recogida— pulsa el botón que lo abre (`data-hotkey-open="name"`).
 * Así las pantallas solo marcan sus elementos y no hace falta pasar
 * refs hasta la cabecera.
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
