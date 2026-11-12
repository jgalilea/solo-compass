import { useState, useSyncExternalStore } from "react";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { getInstallState, isIos, promptInstall, subscribeInstallState } from "../lib/install";
import { IconInstall, IconInstalled } from "./icons/Icons";

/**
 * Settings → App: install button when the browser offers it, how to do
 * it by hand when it doesn't (Safari, Firefox), or that it's already
 * installed. See src/lib/install.ts.
 */
export function InstallAppSettings() {
  const { t } = useLocaleContext();
  const state = useSyncExternalStore(subscribeInstallState, getInstallState);
  const [installing, setInstalling] = useState(false);
  const installed = state === "standalone" || state === "installed";

  async function install() {
    setInstalling(true);
    await promptInstall();
    setInstalling(false);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-ink-border bg-ink-900/60 p-4">
      <div className="flex items-start gap-2.5">
        {installed ? (
          <IconInstalled size={20} className="mt-0.5 shrink-0 text-yes" />
        ) : (
          <IconInstall size={20} className="mt-0.5 shrink-0 text-gold" />
        )}
        <div>
          <p className="text-sm text-parchment">
            {state === "standalone"
              ? t.install.statusStandalone
              : state === "installed"
                ? t.install.statusInstalled
                : t.install.statusNotInstalled}
          </p>
          {state === "installed" && (
            <>
              <p className="mt-0.5 text-sm text-parchment-dim">{t.install.openIt}</p>
              <p className="mt-1.5 text-sm text-parchment-faint">{t.install.removed}</p>
            </>
          )}
          {!installed && <p className="mt-0.5 text-sm text-parchment-dim">{t.install.benefit}</p>}
        </div>
      </div>

      {state === "available" && (
        <button
          type="button"
          onClick={install}
          disabled={installing}
          className="flex items-center justify-center gap-2 rounded-xl border border-gold/50 bg-gold/10 py-2.5 text-sm font-medium text-gold transition hover:bg-gold/20 disabled:opacity-60"
        >
          <IconInstall size={17} />
          {installing ? t.install.installing : t.install.button}
        </button>
      )}
      {state === "manual" && (
        <p className="text-sm text-parchment-dim">{isIos() ? t.install.manualIos : t.install.manual}</p>
      )}
    </div>
  );
}
