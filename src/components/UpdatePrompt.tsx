import { useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { IconClose, IconSparkles } from "./icons/Icons";

// Una app instalada rara vez vuelve a "navegar" (se reanuda desde
// segundo plano), que es cuando el navegador busca un service worker
// nuevo por su cuenta. Así que se lo pedimos nosotros: al volver a la
// app y cada hora mientras esté abierta.
const HOURLY = 60 * 60 * 1000;
const MIN_GAP = 60 * 1000;

function watchForUpdates(registration: ServiceWorkerRegistration) {
  let lastCheck = Date.now();
  function check() {
    if (registration.installing || !navigator.onLine) return;
    if (Date.now() - lastCheck < MIN_GAP) return;
    lastCheck = Date.now();
    registration.update().catch(() => {
      // Sin red o servidor caído: se volverá a intentar más tarde.
    });
  }
  window.setInterval(check, HOURLY);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") check();
  });
}

/**
 * Registra el service worker y, cuando hay una versión nueva
 * descargada, lo dice con un aviso bajo la cabecera. No recarga solo:
 * se actualiza al pulsar "Actualizar". Con "Más tarde" el aviso se
 * oculta, y vuelve a salir la próxima vez que se abra la app.
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
      <div className="mx-auto flex max-w-xl items-center gap-3 sm:px-4 md:max-w-3xl lg:max-w-6xl">
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
            // Lo normal es que la recarga llegue en cuanto la versión
            // nueva toma el control. Si la página no estaba controlada
            // por el service worker (p. ej. la primera visita), ese
            // momento no llega: se recarga igualmente.
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
