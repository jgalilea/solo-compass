/**
 * "smooth", unless the system asks for less motion: scrolling from code
 * doesn't follow the CSS rule for it (index.css).
 */
export function smoothBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
}

/**
 * Smooth for a short way; a long one is a jump. In a long journal the
 * newest entry can be thousands of pixels below, and animating that
 * kept the page sliding for over a second on a phone.
 */
export function scrollBehaviorFor(distance: number): ScrollBehavior {
  return Math.abs(distance) > 2 * window.innerHeight ? "instant" : smoothBehavior();
}

/** scrollIntoView, with the behaviour for how far the element is. */
export function revealElement(el: Element | null, block: ScrollLogicalPosition): void {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const distance =
    block === "center" ? rect.top + rect.height / 2 - window.innerHeight / 2
    : block === "end" ? rect.bottom - window.innerHeight
    : rect.top;
  el.scrollIntoView({ behavior: scrollBehaviorFor(distance), block });
}
