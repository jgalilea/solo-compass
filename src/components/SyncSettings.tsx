import { Suspense, useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { useLongTexts } from "../hooks/useLongTexts";
import { interpolate, type Dictionary } from "../lib/i18n";
import { copyText } from "../lib/share";
import { downloadTextFile } from "../lib/journalUi";
import { codeFromScan, hasCamera, qrReader } from "../lib/qrScan";
import { parseCode } from "../lib/syncCode";
import {
  changeCode,
  currentCode,
  deleteServerCopy,
  dismissClosed,
  linkDevice,
  renameDevice,
  resolveStale,
  syncedDevices,
  syncNow,
  unlinkDevice,
} from "../lib/syncEngine";
import {
  clearSyncLink,
  isSyncBusy,
  isSyncEnabled,
  isSyncPending,
  loadSyncStatus,
  nextSyncReset,
  offerSyncLink,
  pendingSyncLink,
  subscribeSyncStatus,
  syncAvailable,
  syncLinkUrl,
  takeSyncCardRequest,
  type SyncStatus,
} from "../lib/syncStatus";
import { ConfirmDialog } from "./ConfirmDialog";
import { DialogBody, DialogHeader } from "./Dialog";
import { HelpHeading } from "./HelpDialog";
import { Modal } from "./Modal";
import {
  IconAlertTriangle,
  IconCheck,
  IconChevronRight,
  IconCloudCheck,
  IconCloudOff,
  IconCopy,
  IconDevices,
  IconDownload,
  IconKey,
  IconQrcode,
  IconShieldLock,
  IconSync,
  IconTrash,
  IconUnlink,
} from "./icons/Icons";

/** A clock this far off makes "the newest edit" a guess: worth saying. */
const SKEW_WARNING = 2 * 60 * 1000;

const primaryButton =
  "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-gold px-3 py-2.5 text-sm font-medium text-ink-950 transition hover:bg-gold-soft disabled:opacity-60";
const secondaryButton =
  "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-gold/50 px-3 py-2.5 text-sm font-medium text-gold transition hover:bg-gold/10 disabled:opacity-60";
const quietButton =
  "flex items-center gap-1.5 rounded-xl border border-ink-border px-3 py-2 text-sm text-parchment-dim transition hover:border-gold/50 hover:text-gold";

/** Whether there's a camera to scan the QR code with: asked once, without opening it. */
function useHasCamera(): boolean {
  const [camera, setCamera] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void hasCamera().then((has) => !cancelled && setCamera(has));
    return () => {
      cancelled = true;
    };
  }, []);
  return camera;
}

/** "2 minutes ago", "now"… re-read every half minute while shown. */
function useAgo(time: number | null, locale: string): string | null {
  const now = useNow();
  return time === null ? null : relativeTime(time, locale, now);
}

/** The time now, read again every half minute while shown. */
function useNow(): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function relativeTime(time: number, locale: string, now: number): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const seconds = Math.round((time - Math.max(now, time)) / 1000);
  if (seconds > -60) return rtf.format(0, "second");
  if (seconds > -3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (seconds > -86400) return rtf.format(Math.round(seconds / 3600), "hour");
  return rtf.format(Math.round(seconds / 86400), "day");
}

/**
 * Settings → Your data → Sync your devices: turning it on (a new code,
 * shown with its QR and the advice to keep it), linking with a code
 * typed or brought by a link (never without asking), and, once on, how
 * it's going: synced, offline, paused (and until when, at the latest),
 * stopped, or a question to answer. Only in a build with a relay.
 */
export function SyncSettings() {
  const sync = useLongTexts().sync;
  const enabled = useSyncExternalStore(subscribeSyncStatus, isSyncEnabled, () => false);
  const status = useSyncExternalStore(subscribeSyncStatus, loadSyncStatus, () => null);
  const busy = useSyncExternalStore(subscribeSyncStatus, isSyncBusy, () => false);
  const fromLink = useSyncExternalStore(subscribeSyncStatus, pendingSyncLink, () => null);
  const [revealed, setRevealed] = useState<{ code: string; fresh: boolean } | null>(null);
  const [entering, setEntering] = useState(false);
  const [confirm, setConfirm] = useState<"change" | "unlink" | "delete" | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const camera = useHasCamera();
  const cardRef = useRef<HTMLDivElement>(null);

  // Opened from a link, or from the header's sync icon: straight to the card.
  useEffect(() => {
    if (fromLink) cardRef.current?.scrollIntoView({ block: "start" });
  }, [fromLink]);
  useEffect(() => {
    if (takeSyncCardRequest()) cardRef.current?.scrollIntoView({ block: "start" });
  }, []);

  if (!syncAvailable()) return null;

  /** What the buttons do touches the browser's storage, which can fail (full, blocked): said, never thrown away. */
  async function attempt(action: () => Promise<void>) {
    setFailure(null);
    try {
      await action();
    } catch {
      setFailure(sync.actionFailed);
    }
  }

  const turnOn = () =>
    attempt(async () => {
      const code = await linkDevice();
      setRevealed({ code, fresh: true });
    });

  const linkWith = (code: string) =>
    attempt(async () => {
      await linkDevice(code);
      setEntering(false);
      setRevealed(null);
      clearSyncLink();
    });

  const showCode = () =>
    attempt(async () => {
      const code = await currentCode();
      if (code) setRevealed({ code, fresh: false });
    });

  const confirmed = (action: "change" | "unlink" | "delete") => {
    setConfirm(null);
    setMoreOpen(false);
    return attempt(async () => {
      if (action === "change") setRevealed({ code: await changeCode(), fresh: true });
      else if (action === "unlink") {
        setRevealed(null);
        await unlinkDevice();
      } else if (await deleteServerCopy()) setRevealed(null);
      else setFailure(sync.deleteServerFailed);
    });
  };

  return (
    <div ref={cardRef} id="settings-sync" className="flex scroll-mt-4 flex-col gap-3 rounded-2xl border border-ink-border bg-ink-900/60 p-4">
      <p className="flex items-center gap-1.5 font-display text-base text-parchment">
        <IconDevices size={18} className="shrink-0 text-gold" />
        {sync.title}
      </p>

      {fromLink && (
        <LinkFromUrl
          code={fromLink.code}
          scanned={fromLink.source === "scan"}
          alreadyLinked={enabled}
          onLink={() => void linkWith(fromLink.code)}
          onCancel={clearSyncLink}
        />
      )}

      {!enabled && status?.state === "closed" && (
        <Notice tone="warn" title={sync.closedTitle}>
          <p>{sync.closed}</p>
          <button type="button" onClick={dismissClosed} className={`${quietButton} mt-2 w-fit`}>
            {sync.closedOk}
          </button>
        </Notice>
      )}

      {revealed ? (
        <CodeReveal
          code={revealed.code}
          fresh={revealed.fresh}
          onDone={() => setRevealed(null)}
        />
      ) : enabled ? (
        <>
          <SyncState status={status} busy={busy} />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void syncNow()} disabled={busy} className={secondaryButton}>
              <IconSync size={16} className={busy ? "animate-spin" : ""} />
              {busy ? sync.syncing : sync.syncNow}
            </button>
            <button type="button" onClick={() => void showCode()} className={secondaryButton}>
              <IconKey size={16} />
              {sync.showCode}
            </button>
          </div>
          <SyncedDevicesList status={status} />
          <Disclosure open={moreOpen} onToggle={() => setMoreOpen((v) => !v)} label={sync.moreOptions}>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setConfirm("change")} className={quietButton}>
                <IconKey size={16} />
                {sync.changeCode}
              </button>
              <button type="button" onClick={() => setConfirm("unlink")} className={quietButton}>
                <IconUnlink size={16} />
                {sync.unlink}
              </button>
              <button
                type="button"
                onClick={() => setConfirm("delete")}
                className="flex items-center gap-1.5 rounded-xl border border-ink-border px-3 py-2 text-sm text-no transition hover:border-no/60"
              >
                <IconTrash size={16} />
                {sync.deleteServer}
              </button>
            </div>
          </Disclosure>
        </>
      ) : entering ? (
        <CodeEntry
          onLink={(code) => void linkWith(code)}
          onScan={camera ? () => setScanning(true) : undefined}
          onCancel={() => setEntering(false)}
        />
      ) : (
        !fromLink && (
          <>
            <p className="text-sm text-parchment-dim">{sync.intro}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void turnOn()} className={`${primaryButton} basis-full`}>
                <IconDevices size={16} />
                {sync.turnOn}
              </button>
              {camera && (
                <button type="button" onClick={() => setScanning(true)} className={secondaryButton}>
                  <IconQrcode size={16} />
                  {sync.scanQr}
                </button>
              )}
              <button type="button" onClick={() => setEntering(true)} className={secondaryButton}>
                <IconKey size={16} />
                {sync.haveCode}
              </button>
            </div>
          </>
        )
      )}

      {failure && (
        <p role="alert" className="text-sm text-no">
          {failure}
        </p>
      )}

      <SyncHelpButton label={sync.learnMore} />

      {scanning && (
        <QrScanDialog
          onCode={(code) => {
            setScanning(false);
            setEntering(false);
            // Asked like a link: linking joins this device's data with whoever's code it is.
            offerSyncLink(code, "scan");
          }}
          onClose={() => setScanning(false)}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={{ change: sync.changeCodeTitle, unlink: sync.unlinkTitle, delete: sync.deleteServerTitle }[confirm]}
          description={{ change: sync.changeCodeText, unlink: sync.unlinkText, delete: sync.deleteServerText }[confirm]}
          confirmLabel={{ change: sync.changeCode, unlink: sync.unlink, delete: sync.deleteServer }[confirm]}
          onConfirm={() => void confirmed(confirm)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

function Disclosure({ open, onToggle, label, children }: { open: boolean; onToggle: () => void; label: string; children: ReactNode }) {
  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-fit items-center gap-1.5 text-sm text-parchment-dim transition hover:text-gold"
      >
        <IconChevronRight size={14} className={`transition-transform ${open ? "rotate-90" : ""}`} />
        {label}
      </button>
      {open && children}
    </>
  );
}

function Notice({ tone, title, children }: { tone: "ok" | "warn" | "problem"; title: string; children: ReactNode }) {
  const Icon = tone === "ok" ? IconCloudCheck : tone === "warn" ? IconCloudOff : IconAlertTriangle;
  const color = tone === "ok" ? "text-yes" : tone === "warn" ? "text-gold" : "text-no";
  return (
    <div role="status" className="flex items-start gap-2.5 rounded-xl border border-ink-border bg-ink-900/60 p-3">
      <Icon size={20} className={`mt-0.5 shrink-0 ${color}`} />
      <div className="min-w-0 text-sm text-parchment-dim">
        <p className="font-medium text-parchment">{title}</p>
        <div className="mt-0.5 flex flex-col gap-1">{children}</div>
      </div>
    </div>
  );
}

function resetTime(t: Dictionary): string {
  return new Intl.DateTimeFormat(t.dateLocale, { timeStyle: "short" }).format(nextSyncReset());
}

/** How it's going, in a line or a box. */
function SyncState({ status, busy }: { status: SyncStatus | null; busy: boolean }) {
  const { t, locale } = useLocaleContext();
  const sync = useLongTexts().sync;
  const pending = useSyncExternalStore(subscribeSyncStatus, isSyncPending, () => false);
  const ago = useAgo(status?.state === "ok" ? status.at : null, locale);

  if (status?.state === "paused") {
    return (
      <Notice tone="warn" title={sync.pausedTitle}>
        <p>{{ unreachable: sync.pausedUnreachable, quota: sync.pausedQuota, rate: sync.pausedRate, daily: sync.pausedDaily }[status.reason]}</p>
        {status.reason !== "rate" && <p>{interpolate(sync.backBy, { reset: resetTime(t) })}</p>}
        <p>{sync.meanwhile}</p>
      </Notice>
    );
  }
  if (status?.state === "offline") {
    return (
      <Notice tone="warn" title={sync.offlineTitle}>
        <p>{sync.offline}</p>
      </Notice>
    );
  }
  if (status?.state === "error" && status.reason === "unexpected") return <UnexpectedFailure status={status} />;
  if (status?.state === "error") {
    return (
      <Notice tone="problem" title={sync.errorTitle}>
        <p>{{ full: sync.errorFull, update: sync.errorUpdate, damaged: sync.errorDamaged, unexpected: sync.errorUnexpected }[status.reason]}</p>
      </Notice>
    );
  }
  if (status?.state === "stale") return <StaleChoice />;

  const skew = status?.state === "ok" ? status.skew : 0;
  return (
    <div className="flex flex-col gap-2">
      <p role="status" className="flex items-center gap-2 text-sm text-parchment">
        {busy ? (
          <IconSync size={18} className="shrink-0 animate-spin text-gold" />
        ) : status?.state === "ok" ? (
          <IconCloudCheck size={18} className="shrink-0 text-yes" />
        ) : (
          <IconDevices size={18} className="shrink-0 text-parchment-dim" />
        )}
        {busy ? sync.syncing : ago ? interpolate(sync.synced, { when: ago }) : sync.notYet}
      </p>
      {pending && !busy && <p className="text-sm text-parchment-dim">{sync.pendingNote}</p>}
      {Math.abs(skew) > SKEW_WARNING && (
        <p className="flex items-start gap-2 text-sm text-parchment-dim">
          <IconAlertTriangle size={16} className="mt-0.5 shrink-0 text-gold" />
          {interpolate(skew > 0 ? sync.clockAhead : sync.clockBehind, { minutes: String(Math.round(Math.abs(skew) / 60_000)) })}
        </p>
      )}
    </div>
  );
}

/** Something failed on this device: when it tries again, and the report to send if it keeps happening. */
function UnexpectedFailure({ status }: { status: Extract<SyncStatus, { state: "error" }> }) {
  const { t } = useLocaleContext();
  const sync = useLongTexts().sync;
  const [copied, setCopied] = useState(false);
  const report = status.report;

  async function copy() {
    if (report && (await copyText(report))) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Notice tone="warn" title={sync.pausedTitle}>
      <p>{sync.errorUnexpected}</p>
      {status.retryAt && (
        <p>{interpolate(sync.retryAt, { time: new Intl.DateTimeFormat(t.dateLocale, { timeStyle: "short" }).format(status.retryAt) })}</p>
      )}
      {report && (
        <>
          <button type="button" onClick={() => void copy()} className={`${quietButton} mt-1 w-fit`}>
            {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
            {copied ? sync.reportCopied : sync.copyReport}
          </button>
          <p className="text-xs text-parchment-faint">{sync.reportHint}</p>
        </>
      )}
    </Notice>
  );
}

function StaleChoice() {
  const sync = useLongTexts().sync;
  return (
    <Notice tone="warn" title={sync.staleTitle}>
      <p>{sync.staleText}</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={() => void resolveStale("merge")} className={`${secondaryButton} flex-col items-start whitespace-normal text-left`}>
          <span>{sync.staleMerge}</span>
          <span className="text-xs font-normal text-parchment-dim">{sync.staleMergeHint}</span>
        </button>
        <button type="button" onClick={() => void resolveStale("server")} className={`${secondaryButton} flex-col items-start whitespace-normal text-left`}>
          <span>{sync.staleServer}</span>
          <span className="text-xs font-normal text-parchment-dim">{sync.staleServerHint}</span>
        </button>
      </div>
    </Notice>
  );
}

/** Typed or pasted: checked before linking, so a typo never makes a new, empty box. */
function CodeEntry({ onLink, onScan, onCancel }: { onLink: (code: string) => void; onScan?: () => void; onCancel: () => void }) {
  const { t } = useLocaleContext();
  const sync = useLongTexts().sync;
  const [text, setText] = useState("");
  const [invalid, setInvalid] = useState(false);
  const fieldId = useId();
  const errorId = useId();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!parseCode(text)) return setInvalid(true);
    onLink(text);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <label htmlFor={fieldId} className="text-sm font-medium text-parchment">
        {sync.codeLabel}
      </label>
      <input
        id={fieldId}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setInvalid(false);
        }}
        autoFocus
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        aria-invalid={invalid}
        aria-describedby={invalid ? errorId : undefined}
        placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXX"
        className="w-full rounded-xl border border-ink-border bg-ink-950/60 px-3 py-2.5 font-mono text-base tracking-wide text-parchment placeholder:text-parchment-faint focus:border-gold focus:outline-none"
      />
      {invalid && (
        <p id={errorId} className="text-sm text-no">
          {sync.codeInvalid}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={primaryButton}>
          <IconDevices size={16} />
          {sync.link}
        </button>
        {onScan && (
          <button type="button" onClick={onScan} className={secondaryButton}>
            <IconQrcode size={16} />
            {sync.scanQr}
          </button>
        )}
        <button type="button" onClick={onCancel} className={secondaryButton}>
          {t.common.cancel}
        </button>
      </div>
    </form>
  );
}

/** Opened with a code in the link: asked, never linked by itself (a link can come from anyone). */
function LinkFromUrl({
  code,
  scanned,
  alreadyLinked,
  onLink,
  onCancel,
}: {
  code: string;
  scanned: boolean;
  alreadyLinked: boolean;
  onLink: () => void;
  onCancel: () => void;
}) {
  const { t } = useLocaleContext();
  const sync = useLongTexts().sync;
  const valid = parseCode(code) !== null;
  return (
    <Notice tone="warn" title={sync.linkFromUrlTitle}>
      {valid ? (
        <>
          <p>{scanned ? sync.linkFromScan : sync.linkFromUrl}</p>
          {alreadyLinked && <p>{sync.alreadyLinked}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={onLink} className={primaryButton}>
              <IconDevices size={16} />
              {sync.link}
            </button>
            <button type="button" onClick={onCancel} className={secondaryButton}>
              {t.common.cancel}
            </button>
          </div>
        </>
      ) : (
        <>
          <p>{sync.codeInvalid}</p>
          <button type="button" onClick={onCancel} className={`${quietButton} mt-2 w-fit`}>
            {sync.closedOk}
          </button>
        </>
      )}
    </Notice>
  );
}

/** The code, its QR and link, and (just made) the advice to keep it. */
function CodeReveal({ code, fresh, onDone }: { code: string; fresh: boolean; onDone: () => void }) {
  const sync = useLongTexts().sync;
  const [copied, setCopied] = useState(false);
  const link = syncLinkUrl(code);

  async function copy() {
    if (await copyText(code)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {fresh && (
        <div className="flex items-start gap-2.5 rounded-xl border border-gold/40 bg-gold/[0.06] p-3">
          <IconKey size={20} className="mt-0.5 shrink-0 text-gold" />
          <div className="text-sm text-parchment-dim">
            <p className="font-medium text-parchment">{sync.saveTitle}</p>
            <p className="mt-0.5">{sync.saveText}</p>
          </div>
        </div>
      )}
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
        <SyncQr value={link} label={sync.qrLabel} />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-parchment-dim">{sync.codeLabel}</p>
          <p className="select-all break-all font-mono text-lg tracking-wide text-parchment">{code}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void copy()} className={quietButton}>
              {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
              {copied ? sync.copied : sync.copy}
            </button>
            <button
              type="button"
              onClick={() => downloadTextFile(sync.fileName, interpolate(sync.fileText, { code, link }), "text/plain")}
              className={quietButton}
            >
              <IconDownload size={16} />
              {sync.download}
            </button>
          </div>
        </div>
      </div>
      <p className="text-sm text-parchment-dim">{sync.otherDevice}</p>
      <p className="text-xs text-parchment-faint">{sync.iosHint}</p>
      <p className="text-sm text-parchment-dim">{sync.notBackup}</p>
      <button type="button" onClick={onDone} className={fresh ? primaryButton : secondaryButton}>
        {fresh ? sync.done : sync.hideCode}
      </button>
    </div>
  );
}

/**
 * The link as a QR code, drawn here (the library, small, is loaded only
 * when one is shown). Always black on white, whatever the theme: that's
 * what cameras read best.
 */
function SyncQr({ value, label }: { value: string; label: string }) {
  const [modules, setModules] = useState<boolean[][] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    import("uqr")
      .then(({ encode }) => {
        if (!cancelled) setModules(encode(value, { ecc: "M", border: 2 }).data);
      })
      // Its chunk didn't come (offline before the app had it): the code and its link are still there.
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [value]);
  if (failed) return null;

  const size = modules?.length ?? 1;
  const path = modules
    ?.flatMap((row, y) => row.map((dark, x) => (dark ? `M${x} ${y}h1v1h-1z` : "")))
    .join("");
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className="size-44 shrink-0 rounded-xl"
    >
      <rect width={size} height={size} fill="#ffffff" />
      {path && <path d={path} fill="#000000" />}
    </svg>
  );
}

/**
 * How the sync works, its security and privacy, in full: from the card
 * and from Settings → About's privacy note. Its texts are long texts,
 * read once it's open.
 */
export function SyncHelpButton({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-fit items-center gap-1.5 text-left text-sm text-parchment-dim underline decoration-parchment-faint underline-offset-4 transition hover:text-gold"
      >
        <IconShieldLock size={16} className="shrink-0 text-gold" />
        {label}
      </button>
      {open && (
        <Modal onClose={() => setOpen(false)} label={label} size="lg">
          <Suspense fallback={null}>
            <SyncHelp onClose={() => setOpen(false)} />
          </Suspense>
        </Modal>
      )}
    </>
  );
}

function SyncHelp({ onClose }: { onClose: () => void }) {
  const help = useLongTexts().sync.help;
  return (
    <>
      <DialogHeader title={help.title} Icon={IconDevices} onClose={onClose} />
      {/* Only text: the keyboard scrolls it once it has focus. */}
      <DialogBody focusable className="flex flex-col gap-5">
        <p className="text-sm text-parchment">{help.intro}</p>
        <div className="grid gap-5 lg:grid-cols-2">
          {help.sections.map((section) => (
            <section key={section.heading} className="flex flex-col gap-2">
              <HelpHeading>{section.heading}</HelpHeading>
              <ul className="flex list-disc flex-col gap-1.5 pl-4 text-sm text-parchment-dim marker:text-gold">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogBody>
    </>
  );
}

/** How often a frame is read while scanning (ms): quick enough, and light on a phone. */
const SCAN_EVERY = 250;

/**
 * The camera, pointed at the other device's QR code. Every frame is read
 * on this device and nothing is kept; the camera is let go as soon as
 * the dialog closes.
 */
function QrScanDialog({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const sync = useLongTexts().sync;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [problem, setProblem] = useState<"denied" | "unavailable" | null>(null);
  const [notCode, setNotCode] = useState(false);
  const found = useRef(onCode);
  useEffect(() => {
    found.current = onCode;
  }, [onCode]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const stop = () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      } catch (error) {
        const name = error instanceof Error ? error.name : "";
        setProblem(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "unavailable");
        return;
      }
      const video = videoRef.current;
      if (stopped || !video) return stop();
      video.srcObject = stream;
      try {
        await video.play();
      } catch {
        // Some browsers play muted inline video without being asked; reading goes on.
      }
      let read: Awaited<ReturnType<typeof qrReader>>;
      try {
        read = await qrReader();
      } catch {
        // The reader's chunk didn't come (offline before the app had it).
        setProblem("unavailable");
        return stop();
      }
      const tick = async () => {
        if (stopped) return;
        let text: string | null = null;
        try {
          text = await read(video);
        } catch {
          // A frame that couldn't be read: the next one.
        }
        if (stopped) return;
        if (text !== null) {
          const code = codeFromScan(text);
          if (code) {
            stop();
            found.current(code);
            return;
          }
          setNotCode(true);
        }
        timer = setTimeout(() => void tick(), SCAN_EVERY);
      };
      void tick();
    })();
    return stop;
  }, []);

  return (
    <Modal onClose={onClose} label={sync.scanTitle} size="lg">
      <DialogHeader title={sync.scanTitle} Icon={IconQrcode} onClose={onClose} />
      <DialogBody className="flex flex-col items-center gap-3">
        {problem ? (
          <p role="alert" className="text-sm text-no">
            {problem === "denied" ? sync.scanDenied : sync.scanUnavailable}
          </p>
        ) : (
          <>
            <div className="relative w-full max-w-sm overflow-hidden rounded-xl bg-ink-950">
              {/* The camera's picture: only to aim, so it's not described. */}
              <video ref={videoRef} muted playsInline autoPlay aria-hidden className="aspect-square w-full object-cover" />
              <div aria-hidden className="pointer-events-none absolute inset-[15%] rounded-lg border-2 border-gold/80" />
            </div>
            <p role="status" className="text-center text-sm text-parchment-dim">
              {notCode ? sync.scanNotCode : sync.scanHint}
            </p>
          </>
        )}
        <button type="button" onClick={onClose} className={`${secondaryButton} w-full max-w-sm flex-none`}>
          {sync.scanCancel}
        </button>
      </DialogBody>
    </Modal>
  );
}

/**
 * The devices sharing the code, as they've told this one (inside what's
 * sealed: the relay knows nothing of them): this one, with its name to
 * change, and the others with when they were last heard of.
 */
function SyncedDevicesList({ status }: { status: SyncStatus | null }) {
  const { t, locale } = useLocaleContext();
  const sync = useLongTexts().sync;
  const now = useNow();
  const [devices, setDevices] = useState<Awaited<ReturnType<typeof syncedDevices>> | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const fieldId = useId();
  // Read again after each exchange (what came in may name a new device).
  const lastAt = status?.state === "ok" ? status.at : 0;
  useEffect(() => {
    let cancelled = false;
    syncedDevices()
      .then((found) => !cancelled && setDevices(found))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [lastAt]);
  if (!devices) return null;

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (editing === null) return;
    renameDevice(editing);
    setDevices((d) => d && { ...d, me: { ...d.me, name: editing.trim() || d.me.name } });
    setEditing(null);
  }

  return (
    <div className="flex flex-col gap-2 border-t border-ink-border pt-3">
      <p className="text-xs font-medium uppercase tracking-wide text-parchment-dim">
        {interpolate(sync.devicesTitle, { count: String(devices.others.length + 1) })}
      </p>
      <ul className="flex flex-col gap-1.5 text-sm">
        <li className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <IconDevices size={16} className="shrink-0 text-gold" />
          {editing === null ? (
            <>
              <span className="font-medium text-parchment">{devices.me.name}</span>
              <span className="text-parchment-faint">{sync.thisDevice}</span>
              <button
                type="button"
                onClick={() => setEditing(devices.me.name)}
                className="text-parchment-dim underline decoration-parchment-faint underline-offset-4 transition hover:text-gold"
              >
                {sync.rename}
              </button>
            </>
          ) : (
            <form onSubmit={save} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <label htmlFor={fieldId} className="sr-only">
                {sync.renameLabel}
              </label>
              <input
                id={fieldId}
                value={editing}
                onChange={(e) => setEditing(e.target.value)}
                maxLength={40}
                autoFocus
                className="min-w-0 flex-1 rounded-xl border border-ink-border bg-ink-950/60 px-3 py-2 text-base text-parchment focus:border-gold focus:outline-none"
              />
              <button type="submit" className={quietButton}>
                {t.common.save}
              </button>
              <button type="button" onClick={() => setEditing(null)} className={quietButton}>
                {t.common.cancel}
              </button>
            </form>
          )}
        </li>
        {devices.others.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-x-2">
            <IconDevices size={16} className="shrink-0 text-parchment-dim" />
            <span className="text-parchment">{d.name}</span>
            <span className="text-parchment-faint">{interpolate(sync.seen, { when: relativeTime(d.seenAt, locale, now) })}</span>
          </li>
        ))}
      </ul>
      {devices.others.length === 0 && <p className="text-xs text-parchment-faint">{sync.noOthers}</p>}
    </div>
  );
}
