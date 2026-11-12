import type { Locale } from "./i18n";

/** The author's Ko-fi page, linked from Settings and the desktop header. */
export const KOFI_URL = "https://ko-fi.com/jgalilea";

/** The project's repository (GPL-3.0), linked from Settings → About. */
export const GITHUB_URL = "https://github.com/jgalilea/solo-compass";

/** The ideas-and-bugs form (Tally), one per language. */
export const FEEDBACK_FORMS: Record<Locale, string> = {
  es: "https://tally.so/r/2jaJxb",
  en: "https://tally.so/r/M1NJQM",
};

/**
 * The form in the player's language, with the app's version and the
 * browser filled into its hidden fields (`version`, `browser`): what the
 * form says it receives, and nothing else.
 */
export function feedbackUrl(locale: Locale, version: string, userAgent: string): string {
  return `${FEEDBACK_FORMS[locale]}?${new URLSearchParams({ version, browser: userAgent })}`;
}
