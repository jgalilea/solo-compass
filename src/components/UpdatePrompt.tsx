import { useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { IconClose, IconSparkles } from "./icons/Icons";

// An installed app rarely "navigates" again (it resumes from the
// background), which is when the browser looks for a new service
// worker on its own. So we ask for it ourselves: when coming back to
// the app and every hour while it's open.
const HOURLY = 60 * 60 * 1000;
const MIN_GAP = 60 * 1000;

function watchForUpdates(registration: ServiceWorkerRegistration) {
  let lastCheck = Date.now();
  function check() {
    if (registration.installing || !navigator.onLine) return;
    if (Date.now() - lastCheck < MIN_GAP) return;
    lastCheck = Date.now();
    registration.update().catch(() => {
      // Offline or server down: it'll try again later.
    });
  }
  window.setInterval(check, HOURLY);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") check();
  });
}

/**
 * Registers the service worker and, when a new version has been
 * downloaded, says so with a banner under the header. It doesn't
 * reload by itself: it updates when "Update" is pressed. "Later" hides
 * the banner, and it shows again the next time the app is opened.
 */
export function UpdatePrompt() {
  const { t } = useLocaleContext();
  const [updating, setUpdating] = useState(false);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration) watchForUpdates(registration);
    },
  });

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      className="animate-fade-up border-b border-gold/40 bg-gold/10 px-4 py-2.5"
    >
      <div className="mx-auto flex max-w-xl items-center gap-3 sm:px-4 md:max-w-3xl lg:max-w-7xl 2xl:max-w-[110rem]">
        <IconSparkles size={20} className="shrink-0 text-gold" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-parchment">{t.update.title}</p>
          <p className="hidden text-xs text-parchment-dim sm:block">{t.update.description}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setUpdating(true);
            void updateServiceWorker(true);
            // Normally the reload comes as soon as the new version takes
            // control. If the page wasn't controlled by the service worker
            // (e.g. the first visit), that moment never comes: reload
            // anyway.
            window.setTimeout(() => window.location.reload(), 3000);
          }}
          disabled={updating}
          className="shrink-0 rounded-xl bg-gold px-3.5 py-2 text-sm font-medium text-ink-950 transition hover:bg-gold-soft disabled:opacity-60"
        >
          {updating ? t.update.updating : t.update.button}
        </button>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          aria-label={t.update.later}
          title={t.update.later}
          className="-m-1.5 shrink-0 p-1.5 text-parchment-dim transition hover:text-parchment"
        >
          <IconClose size={18} />
        </button>
      </div>
    </div>
  );
}
