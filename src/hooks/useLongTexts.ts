import { use } from "react";
import { loadLongTexts, type LongTexts } from "../lib/i18n";
import { useLocaleContext } from "./useLocaleContext";

/**
 * The long texts in the language in use (help, the quick guide, the
 * sample's script). Suspends until their chunk is here: use it in a
 * component under a <Suspense>, drawn only when what it shows is opened.
 */
export function useLongTexts(): LongTexts {
  return use(loadLongTexts(useLocaleContext().locale));
}
