import { Suspense } from "react";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { preloadable } from "../lib/preloadable";
import { HelpDialog } from "./HelpDialog";

const OracleHelpContent = preloadable(() => import("./OracleHelpContent").then((m) => m.OracleHelpContent));

/**
 * "?" next to the oracle's name. The button is on the first screen;
 * the guide it opens (OracleHelpContent) is loaded apart.
 */
export function OracleHelp() {
  const { t } = useLocaleContext();
  return (
    <HelpDialog button={t.oracleHelp.button} title={t.oracleHelp.title}>
      <Suspense fallback={null}>
        <OracleHelpContent />
      </Suspense>
    </HelpDialog>
  );
}
