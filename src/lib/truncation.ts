import type { MouseEvent } from "react";

/**
 * For text cut short ("truncate", "line-clamp"): on hover, the whole
 * text as a tooltip, but only when it's really cut. Used as the
 * element's onMouseEnter.
 */
export function titleIfCut(text: string) {
  return (e: MouseEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const cut = el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
    if (cut) el.title = text;
    else el.removeAttribute("title");
  };
}
