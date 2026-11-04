import { useEffect, useState } from "react";
import { useLocaleContext } from "../hooks/useLocaleContext";
import {
  getPersistenceStatus,
  requestPersistentStorage,
  type PersistenceStatus,
} from "../lib/storagePersistence";
import { IconChevronRight, IconShieldAlert, IconShieldCheck } from "./icons/Icons";

/**
 * Explicación de la protección de datos del navegador (ver
 * src/lib/storagePersistence.ts). El permiso nunca se pide sin
 * explicarlo antes: Firefox muestra su propio aviso, y sin contexto
 * parecería algo raro o sospechoso.
 */

function usePersistenceStatus() {
  const [status, setStatus] = useState<PersistenceStatus | null>(null);
  useEffect(() => {
    let cancelled = false;
    void getPersistenceStatus().then((s) => {
      if (!cancelled) setStatus(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return [status, setStatus] as const;
}

function StorageExplanation() {
  const { t } = useLocaleContext();
  const blocks = [
    [t.storage.whatTitle, t.storage.what],
    [t.storage.benefitTitle, t.storage.benefit],
    [t.storage.howTitle, t.storage.how],
    [t.storage.ownershipTitle, t.storage.ownership],
  ];
  return (
    <dl className="flex flex-col gap-3">
      {blocks.map(([title, text]) => (
        <div key={title}>
          <dt className="text-sm font-medium text-parchment">{title}</dt>
          <dd className="mt-0.5 text-sm text-parchment-dim">{text}</dd>
        </div>
      ))}
    </dl>
  );
}

/** El navegador no lo ha concedido: qué hacer para que lo conceda. */
function DeniedNote() {
  const { t } = useLocaleContext();
  return (
    <div role="status" className="flex items-start gap-2.5 rounded-2xl border border-ink-border bg-ink-900/60 p-3.5">
      <IconShieldAlert size={20} className="mt-0.5 shrink-0 text-parchment-dim" />
      <div>
        <p className="text-sm font-medium text-parchment">{t.storage.deniedTitle}</p>
        <p className="mt-0.5 text-sm text-parchment-dim">{t.storage.deniedInSettings}</p>
      </div>
    </div>
  );
}

/** Estado + botón en Ajustes → Tus datos, con la explicación desplegable. */
export function StorageProtectionSettings() {
  const { t } = useLocaleContext();
  const [status, setStatus] = usePersistenceStatus();
  const [requesting, setRequesting] = useState(false);
  const [denied, setDenied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (status === null || status === "unsupported") return null;
  const isProtected = status === "persisted";

  async function protect() {
    setRequesting(true);
    const granted = await requestPersistentStorage();
    setRequesting(false);
    setDenied(!granted);
    if (granted) setStatus("persisted");
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-ink-border bg-ink-900/60 p-4">
      <div className="flex items-start gap-2.5">
        {isProtected ? (
          <IconShieldCheck size={20} className="mt-0.5 shrink-0 text-yes" />
        ) : (
          <IconShieldAlert size={20} className="mt-0.5 shrink-0 text-gold" />
        )}
        <p className="text-sm text-parchment">
          {isProtected ? t.storage.statusProtected : t.storage.statusUnprotected}
        </p>
      </div>

      {!isProtected && (
        <button
          type="button"
          onClick={protect}
          disabled={requesting}
          className="flex items-center justify-center gap-2 rounded-xl border border-gold/50 bg-gold/10 py-2.5 text-sm font-medium text-gold transition hover:bg-gold/20 disabled:opacity-60"
        >
          <IconShieldCheck size={17} />
          {requesting ? t.storage.protecting : t.storage.protectButton}
        </button>
      )}
      {denied && <DeniedNote />}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-fit items-center gap-1.5 text-sm text-parchment-dim transition hover:text-gold"
      >
        <IconChevronRight size={14} className={`transition-transform ${expanded ? "rotate-90" : ""}`} />
        {t.storage.learnMore}
      </button>
      {expanded && (
        <>
          <StorageExplanation />
          {isProtected && (
            <div>
              <p className="text-sm font-medium text-parchment">{t.storage.howToRemoveTitle}</p>
              <p className="mt-0.5 text-sm text-parchment-dim">{t.storage.howToRemove}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
