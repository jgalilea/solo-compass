/**
 * The note in the journal list for iPhone/iPad Safari (not installed):
 * Safari deletes a site's data after seven days of use without visiting
 * it, and an occasional player would lose the whole journal without
 * ever opening Settings. Installed apps are exempt, and so is data the
 * browser already keeps as persistent (storagePersistence.ts).
 *
 * Once closed it stays closed on this device (localStorage).
 */

import { getInstallState, isIosSafari } from "./install";
import { getPersistenceStatus } from "./storagePersistence";

const DISMISSED_KEY = "solo-compass:safari-note-dismissed";

function isDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissSafariStorageNote(): void {
  try {
    window.localStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    // Not critical: the note shows again next time.
  }
}

export async function shouldShowSafariStorageNote(): Promise<boolean> {
  if (typeof window === "undefined" || !isIosSafari() || isDismissed()) return false;
  if (getInstallState() === "standalone") return false;
  return (await getPersistenceStatus()) !== "persisted";
}
