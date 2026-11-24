import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { LocaleContext, type LocaleContextValue } from "../hooks/localeContextInstance";
import { RollDrawing } from "./RollDrawing";

/**
 * Calls `run` with a function that gives a roll's drawing as HTML, for
 * the HTML export: the same components as on screen, as inline SVG.
 */
export function withRollDrawings<T>(
  locale: LocaleContextValue,
  run: (draw: (detail: string, result: string | null) => string) => T,
): T {
  const host = document.createElement("div");
  const root = createRoot(host);
  try {
    return run((detail, result) => {
      flushSync(() =>
        root.render(
          <LocaleContext.Provider value={locale}>
            <RollDrawing detail={detail} result={result} />
          </LocaleContext.Provider>,
        ),
      );
      return host.innerHTML;
    });
  } finally {
    root.unmount();
  }
}
