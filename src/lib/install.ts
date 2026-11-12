/**
 * Installing the app (PWA) from Settings.
 *
 * Chrome/Edge (desktop and Android) fire `beforeinstallprompt` once,
 * shortly after load, when the app can be installed: the event has to
 * be caught and kept from the start (this module is imported from
 * main.tsx), because by the time Settings is opened it's long gone.
 * Its `prompt()` shows the browser's own install dialog.
 *
 * Safari (iOS) and Firefox never fire it: there the card explains how
 * to do it from the browser's own menu instead.
 *
 * "Installed" is certain when the app runs in its own window
 * (display-mode standalone). From a normal browser tab it's remembered
 * in localStorage once the app has been installed or opened installed,
 * and checked where the browser can answer: Chrome on Android tells
 * whether it's on the home screen (getInstalledRelatedApps, with the
 * manifests' `related_applications`), asked on load and whenever the
 * tab comes back into view, since uninstalling happens outside it. If
 * the browser offers to install it again, it was uninstalled too.
 * Elsewhere (Brave's home-screen shortcuts, most desktops) removing it
 * can go unnoticed: the card says so instead of insisting.
 */

export type InstallState =
  /** Running as the installed app. */
  | "standalone"
  /** In a browser tab, but installed on this device before. */
  | "installed"
  /** The browser can show its install dialog. */
  | "available"
  /** Only through the browser's menu (or not at all). */
  | "manual";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const INSTALLED_KEY = "solo-compass:installed";

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installedFlag = loadInstalledFlag();
const listeners = new Set<() => void>();

function loadInstalledFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(INSTALLED_KEY) === "1";
  } catch {
    return false;
  }
}

function saveInstalledFlag(installed: boolean): void {
  installedFlag = installed;
  try {
    if (installed) window.localStorage.setItem(INSTALLED_KEY, "1");
    else window.localStorage.removeItem(INSTALLED_KEY);
  } catch {
    // Not critical: at worst a tab shows "install" for an installed app.
  }
}

function notify() {
  for (const listener of listeners) listener();
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.matchMedia?.("(display-mode: window-controls-overlay)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iPhone/iPad, including iPadOS reporting itself as a Mac. */
export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * Safari itself on iPhone/iPad (other iOS browsers say so in their
 * user agent: CriOS, FxiOS, EdgiOS…). Only Safari deletes a site's
 * data after a week of use without visiting it.
 */
export function isIosSafari(): boolean {
  return isIos() && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(navigator.userAgent);
}

type RelatedAppsNavigator = Navigator & { getInstalledRelatedApps?: () => Promise<unknown[]> };

/**
 * Asks the browser whether the app is installed. Only Android's answer
 * counts when it's "no": on desktop the API exists but lists web apps
 * only on Windows, and the flag is all there is.
 */
async function checkInstalled(): Promise<void> {
  const nav = navigator as RelatedAppsNavigator;
  if (!nav.getInstalledRelatedApps || isStandalone()) return;
  try {
    const apps = await nav.getInstalledRelatedApps();
    const installed = apps.length > 0;
    if (installed === installedFlag) return;
    if (installed || /Android/.test(navigator.userAgent)) {
      saveInstalledFlag(installed);
      notify();
    }
  } catch {
    // Not answered: the flag stays as it was.
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    // No preventDefault: the browser keeps offering its own install
    // option (Android's "Add to Home Screen" bar); the saved event
    // still works for the Settings button.
    deferredPrompt = e as BeforeInstallPromptEvent;
    if (installedFlag) saveInstalledFlag(false);
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    saveInstalledFlag(true);
    notify();
  });
  if (isStandalone() && !installedFlag) saveInstalledFlag(true);
  void checkInstalled();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void checkInstalled();
  });
}

export function getInstallState(): InstallState {
  if (isStandalone()) return "standalone";
  if (deferredPrompt) return "available";
  if (installedFlag) return "installed";
  return "manual";
}

export function subscribeInstallState(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Shows the browser's install dialog. Returns whether it was accepted. */
export async function promptInstall(): Promise<boolean> {
  const event = deferredPrompt;
  if (!event) return false;
  // A prompt event can only be used once.
  deferredPrompt = null;
  try {
    await event.prompt();
    const { outcome } = await event.userChoice;
    return outcome === "accepted";
  } catch {
    return false;
  } finally {
    notify();
  }
}
