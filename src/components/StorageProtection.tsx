import { useEffect, useState } from "react";
import { useJournalContext } from "../hooks/useJournalContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import {
  getPersistenceStatus,
  hasSeenPersistencePrompt,
  markPersistencePromptSeen,
  requestPersistentStorage,
  type PersistenceStatus,
} from "../lib/storagePersistence";
import { IconChevronRight, IconShieldAlert, IconShieldCheck } from "./icons/Icons";
import { Modal } from "./Modal";

/**
 * Explicación de la protección de datos del navegador (ver
 * src/lib/storagePersistence.ts). El permiso nunca se pide sin
 * explicarlo antes: Firefox muestra su propio aviso, y sin contexto
 * parecería algo raro o sospechoso.
 */

type RequestResult = "granted" | "denied" | null;

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

function RequestResultNote({
  result,
  inSettings = false,
}: {
  result: Exclude<RequestResult, null>;
  /** En Ajustes no tiene sentido decir "inténtalo desde Ajustes". */
  inSettings?: boolean;
}) {
  const { t } = useLocaleContext();
  const granted = result === "granted";
  return (
    <div
      role="status"
      className={[
        "flex items-start gap-2.5 rounded-2xl border p-3.5",
        granted ? "border-yes/40 bg-yes/10" : "border-ink-border bg-ink-900/60",
      ].join(" ")}
    >
      {granted ? (
        <IconShieldCheck size={20} className="mt-0.5 shrink-0 text-yes" />
      ) : (
        <IconShieldAlert size={20} className="mt-0.5 shrink-0 text-parchment-dim" />
      )}
      <div>
        <p className="text-sm font-medium text-parchment">
          {granted ? t.storage.grantedTitle : t.storage.deniedTitle}
        </p>
        <p className="mt-0.5 text-sm text-parchment-dim">
          {granted ? t.storage.granted : inSettings ? t.storage.deniedInSettings : t.storage.denied}
        </p>
      </div>
    </div>
  );
}

/**
 * Se ofrece una sola vez, en cuanto existe la primera aventura (antes
 * no hay nada que proteger). Después, solo desde Ajustes.
 */
export function StorageProtectionPrompt() {
  const { t } = useLocaleContext();
  const { status: journalStatus, adventures } = useJournalContext();
  const [status] = usePersistenceStatus();
  const [seen, setSeen] = useState(() => hasSeenPersistencePrompt());
  const [requesting, setRequesting] = useState(false);
  const [result, setResult] = useState<RequestResult>(null);

  const shouldShow =
    !seen && journalStatus === "ready" && adventures.length > 0 && status === "not-persisted";
  if (!shouldShow) return null;

  function close() {
    markPersistencePromptSeen();
    setSeen(true);
  }

  async function protect() {
    setRequesting(true);
    const granted = await requestPersistentStorage();
    setRequesting(false);
    setResult(granted ? "granted" : "denied");
  }

  return (
    <Modal
      onClose={close}
      label={t.storage.promptTitle}
      className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-ink-border bg-ink-800 shadow-2xl sm:rounded-3xl"
    >
      <div className="flex shrink-0 items-center gap-2.5 border-b border-ink-border/70 px-5 py-4 sm:px-6">
        <IconShieldCheck size={22} className="shrink-0 text-gold" />
        <h2 className="font-display text-xl text-parchment">{t.storage.promptTitle}</h2>
      </div>

      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
        {result ? (
          <RequestResultNote result={result} />
        ) : (
          <>
            <p className="text-sm text-parchment/90">{t.storage.promptIntro}</p>
            <StorageExplanation />
            <p className="rounded-xl border border-ink-border bg-ink-900/60 p-3 text-xs text-parchment-dim">
              {t.storage.declineNote}
            </p>
          </>
        )}
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-ink-border/70 px-5 py-4 sm:px-6">
        {result ? (
          <button
            type="button"
            onClick={close}
            className="rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-ink-950 transition hover:bg-gold-soft"
          >
            {t.storage.done}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={close}
              className="rounded-xl px-4 py-2.5 text-sm text-parchment-dim transition hover:text-parchment"
            >
              {t.storage.decline}
            </button>
            <button
              type="button"
              onClick={protect}
              disabled={requesting}
              className="flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-medium text-ink-950 transition hover:bg-gold-soft disabled:opacity-60"
            >
              <IconShieldCheck size={17} />
              {requesting ? t.storage.protecting : t.storage.protectButton}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}

/** Estado + botón en Ajustes → Tus datos, con la explicación desplegable. */
export function StorageProtectionSettings() {
  const { t } = useLocaleContext();
  const [status, setStatus] = usePersistenceStatus();
  const [requesting, setRequesting] = useState(false);
  const [result, setResult] = useState<RequestResult>(null);
  const [expanded, setExpanded] = useState(false);

  if (status === null || status === "unsupported") return null;
  const isProtected = status === "persisted";

  async function protect() {
    setRequesting(true);
    const granted = await requestPersistentStorage();
    setRequesting(false);
    setResult(granted ? "granted" : "denied");
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
      {result === "denied" && <RequestResultNote result={result} inSettings />}

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
