import {
  Suspense,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  IconAction,
  IconCast,
  IconCheck,
  IconCoffee,
  IconCombat,
  IconConsequence,
  IconDialogue,
  IconDice,
  IconDownload,
  IconExternalLink,
  IconFeedback,
  IconGithub,
  IconShieldLock,
  IconHelp,
  IconNote,
  IconQuestion,
  IconScene,
  IconSession,
  IconShare,
  IconTable,
  IconUpload,
} from "./icons/Icons";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { useThemeContext } from "../hooks/useThemeContext";
import { useModeContext } from "../hooks/useModeContext";
import { useJournalContext } from "../hooks/useJournalContext";
import { openGuide } from "../lib/guide";
import { ORACLES } from "../lib/oracles";
import { THEMES } from "../lib/theme";
import { MODES } from "../lib/mode";
import { LOCALES, interpolate } from "../lib/i18n";
import { LONELOG_LICENSE_URL, LONELOG_URL } from "../lib/lonelog";
import { TABLE_CREDITS } from "../lib/tableCredits";
import { backupFilename, backupText, buildBackup, downloadBackupFile } from "../lib/backup";
import { canShare, shareTextFile } from "../lib/share";
import { fileProblemText, inspectFile } from "../lib/fileImport";
import { offerFiles } from "../lib/incomingFiles";
import { RestoreChoice } from "./RestoreChoice";
import {
  formatSince,
  loadLastBackupAt,
  saveLastBackupAt,
  shouldNudgeBackup,
} from "../lib/backupReminder";
import { ChangelogDialog } from "./ChangelogDialog";
import { StorageProtectionSettings } from "./StorageProtection";
import { SyncHelpButton, SyncSettings } from "./SyncSettings";
import { syncAvailable } from "../lib/syncStatus";
import { InstallAppSettings } from "./InstallApp";
import { DialogBody, DialogHeader } from "./Dialog";
import { Modal } from "./Modal";
import { GITHUB_URL, KOFI_URL, feedbackUrl } from "../lib/support";
import { versionLabel } from "../lib/appVersion";
import {
  canKeepScreenOn,
  isKeepScreenOn,
  setKeepScreenOn,
  subscribeKeepScreenOn,
} from "../lib/wakeLock";
import { smoothBehavior } from "../lib/scrolling";
import { Switch } from "./Switch";

/**
 * What Settings opens (SettingsDialog draws its button): appearance,
 * language, the quick guide, install, storage and backup, and credits.
 * Its own chunk, with the backup and the credits: a first visit doesn't
 * download it until the app is up (preloadAll).
 */
export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { t } = useLocaleContext();
  const bodyRef = useRef<HTMLDivElement>(null);
  // The part being read, marked in the top row.
  const [current, setCurrent] = useState<Part>(PARTS[0]);
  // While a jump from the top row scrolls, the part picked stays marked
  // (not each one it passes); then the mark follows the scroll again.
  const jumping = useRef<number | undefined>(undefined);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    let frame = 0;
    const follow = () => {
      frame = 0;
      setCurrent(partInView(body));
    };
    const onScroll = () => {
      if (jumping.current !== undefined) {
        clearTimeout(jumping.current);
        jumping.current = window.setTimeout(() => {
          jumping.current = undefined;
          follow();
        }, 150);
        return;
      }
      if (!frame) frame = requestAnimationFrame(follow);
    };
    body.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      body.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
      clearTimeout(jumping.current);
    };
  }, []);

  function jumpTo(part: Part) {
    setCurrent(part);
    clearTimeout(jumping.current);
    // Cleared by the scroll it starts; this only covers a jump that doesn't move.
    jumping.current = window.setTimeout(() => (jumping.current = undefined), 300);
    document
      .getElementById(`settings-${part}`)
      ?.scrollIntoView({ behavior: smoothBehavior(), block: "start" });
  }

  return (
    <Modal onClose={onClose} label={t.settings.title} size="lg">
      <DialogHeader title={t.settings.title} onClose={onClose} />
      {/* One column is a long way down: straight to each part, and the
          one being read is marked (filled, like the game table's tabs). */}
      <nav
        aria-label={t.settings.title}
        className="shrink-0 border-b border-ink-border/70 px-3 py-1.5 sm:px-5 lg:hidden"
      >
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-ink-900/60 p-1">
          {PARTS.map((part) => (
            <button
              key={part}
              type="button"
              onClick={() => jumpTo(part)}
              aria-current={part === current ? "true" : undefined}
              className={[
                "h-9 truncate rounded-lg px-1 text-[13px] font-medium transition",
                part === current
                  ? "bg-gold text-ink-950"
                  : "text-parchment-dim hover:text-parchment",
              ].join(" ")}
            >
              {
                {
                  appearance: t.settings.appearanceHeading,
                  app: t.install.sectionTitle,
                  data: t.storage.sectionTitle,
                  about: t.settings.aboutHeading,
                }[part]
              }
            </button>
          ))}
        </div>
      </nav>
      <DialogBody ref={bodyRef} className="block">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          <div className="flex flex-col gap-6">
            <Section part="appearance" title={t.settings.appearanceHeading}>
              <AppearanceSettings />
            </Section>
            <Section title={t.settings.languageHeading}>
              <LanguageSettings />
            </Section>
            <Section title={t.guide.title}>
              <div className="rounded-2xl border border-ink-border bg-ink-900/60 p-4">
                <p className="text-sm text-parchment-dim">{t.guide.settingsText}</p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    openGuide();
                  }}
                  aria-keyshortcuts="?"
                  className="mt-3 flex items-center gap-1.5 rounded-xl border border-gold/50 px-3 py-2 text-sm font-medium text-gold transition hover:bg-gold/10"
                >
                  <IconHelp size={16} />
                  {t.guide.settingsButton}
                </button>
              </div>
            </Section>
          </div>
          <div className="flex flex-col gap-6">
            <Section part="app" title={t.install.sectionTitle}>
              <InstallAppSettings />
            </Section>
            <Section part="data" title={t.storage.sectionTitle}>
              <StorageProtectionSettings />
              <BackupSettings />
              {/* Its texts are long ones (useLongTexts): a moment, if they aren't here yet. */}
              <Suspense fallback={null}>
                <SyncSettings />
              </Suspense>
            </Section>
            <Section part="about" title={t.settings.aboutHeading}>
              <AboutSettings />
            </Section>
          </div>
        </div>
      </DialogBody>
    </Modal>
  );
}

/** The parts of Settings its top row jumps to. */
const PARTS = ["appearance", "app", "data", "about"] as const;
type Part = (typeof PARTS)[number];

/**
 * The part being read in the one column of a phone: the last whose
 * heading has reached the top, or the last part once at the bottom.
 */
function partInView(body: HTMLElement): Part {
  if (body.scrollTop + body.clientHeight >= body.scrollHeight - 2) return "about";
  const line = body.getBoundingClientRect().top + 80;
  let found: Part = PARTS[0];
  for (const part of PARTS) {
    const top = document.getElementById(`settings-${part}`)?.getBoundingClientRect().top;
    if (top !== undefined && top <= line) found = part;
  }
  return found;
}

function Section({ title, part, children }: { title: string; part?: Part; children: ReactNode }) {
  return (
    <section id={part && `settings-${part}`} className="flex scroll-mt-4 flex-col gap-3">
      <h3 className="text-xs font-medium uppercase tracking-wide text-parchment-dim">{title}</h3>
      {children}
    </section>
  );
}

function AppearanceSettings() {
  const { theme, setTheme } = useThemeContext();
  const { mode, setMode, resolvedMode } = useModeContext();
  const { t } = useLocaleContext();

  return (
    <>
      <div
        role="radiogroup"
        aria-label={t.modeSwitcher.groupLabel}
        className="grid grid-cols-3 gap-1 rounded-2xl border border-ink-border bg-ink-900/60 p-1.5"
      >
        {MODES.map((option) => {
          const active = option === mode;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setMode(option)}
              className={[
                "rounded-xl px-2 py-2 text-sm font-medium transition",
                active
                  ? "bg-gold text-ink-950 shadow-sm"
                  : "text-parchment-dim hover:text-parchment",
              ].join(" ")}
            >
              {t.modeSwitcher[option]}
            </button>
          );
        })}
      </div>

      <div
        role="radiogroup"
        aria-label={t.themeSwitcher.dialogTitle}
        className="grid grid-cols-2 gap-2 lg:grid-cols-1"
      >
        {THEMES.map((themeInfo) => {
          const active = themeInfo.id === theme;
          const label = t.theme[themeInfo.id];
          const swatch = resolvedMode === "light" ? themeInfo.swatchLight : themeInfo.swatch;
          return (
            <button
              key={themeInfo.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(themeInfo.id)}
              className={[
                "flex min-w-0 items-center gap-2.5 rounded-2xl border p-3 text-left transition sm:gap-3",
                active ? "border-gold/50 bg-gold/10" : "border-ink-border hover:border-ink-500",
              ].join(" ")}
            >
              <span className="flex h-8 w-8 shrink-0 overflow-hidden rounded-full border border-ink-border/70">
                {swatch.map((c, i) => (
                  <span key={i} className="h-full flex-1" style={{ background: c }} />
                ))}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-parchment">{label.name}</span>
                <span className="block truncate text-xs text-parchment-dim max-sm:hidden">
                  {label.tagline}
                </span>
              </span>
              {active && <IconCheck size={18} className="shrink-0 text-gold" />}
            </button>
          );
        })}
      </div>

      {canKeepScreenOn() && <KeepScreenOnSetting />}
    </>
  );
}

/** Only where the browser can do it (canKeepScreenOn). */
function KeepScreenOnSetting() {
  const { t } = useLocaleContext();
  const on = useSyncExternalStore(subscribeKeepScreenOn, isKeepScreenOn);
  const hintId = useId();

  return (
    <div className="rounded-2xl border border-ink-border bg-ink-900/60 p-4">
      <Switch checked={on} onChange={setKeepScreenOn} describedBy={hintId} className="text-sm">
        <span className={on ? "font-medium text-parchment" : ""}>
          {t.settings.keepScreenOnLabel}
        </span>
      </Switch>
      <p id={hintId} className="mt-1.5 text-xs text-parchment-faint">
        {t.settings.keepScreenOnHint}
      </p>
    </div>
  );
}

function LanguageSettings() {
  const { locale, setLocale, t } = useLocaleContext();

  return (
    <div role="radiogroup" aria-label={t.language.dialogTitle} className="grid grid-cols-2 gap-2">
      {LOCALES.map((l) => {
        const active = l === locale;
        return (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setLocale(l)}
            className={[
              "flex items-center justify-between gap-2 rounded-2xl border p-3 text-left text-sm font-medium text-parchment transition",
              active ? "border-gold/50 bg-gold/10" : "border-ink-border hover:border-ink-500",
            ].join(" ")}
          >
            {t.language.names[l]}
            {active && <IconCheck size={18} className="shrink-0 text-gold" />}
          </button>
        );
      })}
    </div>
  );
}

function BackupSettings() {
  const { t, locale } = useLocaleContext();
  const { entries } = useJournalContext();
  const [lastBackupAt, setLastBackupAt] = useState(loadLastBackupAt);
  // Same rule as the header dot, without the "already seen" snooze.
  const stale = useMemo(
    () =>
      shouldNudgeBackup(
        entries.map((e) => e.timestamp),
        undefined,
        lastBackupAt,
        null,
      ),
    [entries, lastBackupAt],
  );
  const [exportedFilename, setExportedFilename] = useState<string | null>(null);
  // The backup file just picked, waiting for "merge" or "replace".
  const [pendingRestore, setPendingRestore] = useState<{
    text: string;
    date: string | null;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function markBackedUp() {
    const now = Date.now();
    saveLastBackupAt(now);
    setLastBackupAt(now);
  }

  // Reading every store can fail (storage unavailable): say so where
  // the card's errors go instead of a button that does nothing.
  async function readBackup() {
    try {
      return await buildBackup(t);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : t.history.storageUnavailableError);
      return null;
    }
  }

  async function handleExportAll() {
    const payload = await readBackup();
    if (!payload) return;
    const filename = backupFilename();
    downloadBackupFile(filename, payload);
    setExportedFilename(filename);
    markBackedUp();
  }

  // Straight to another device through the system's share sheet; if
  // sharing fails (not just cancelled), it's downloaded instead.
  async function handleShareAll() {
    const payload = await readBackup();
    if (!payload) return;
    const filename = backupFilename();
    try {
      if (
        (await shareTextFile(
          filename,
          backupText(payload),
          t.about.shareAllTitle,
          "application/json",
        )) === "shared"
      ) {
        markBackedUp();
      }
    } catch {
      downloadBackupFile(filename, payload);
      setExportedFilename(filename);
      markBackedUp();
    }
  }

  // Looked at first (fileImport.ts): a journal or tables picked here by
  // mistake go to the dialog that imports them as that.
  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportError(null);
    const found = await inspectFile(t, file, "backup");
    if (found.kind === "problem") setImportError(fileProblemText(t, found.problem));
    else if (found.kind !== "backup") offerFiles([file], "button");
    else {
      const date =
        found.exportedAt === null
          ? null
          : new Intl.DateTimeFormat(t.dateLocale, { dateStyle: "long", timeStyle: "short" }).format(
              found.exportedAt,
            );
      setPendingRestore({ text: found.text, date });
    }
  }

  return (
    <div className="rounded-2xl border border-gold/30 bg-gold/[0.05] p-4">
      {/* Dim, not faint: on this tinted card faint falls under 4.5:1 in light mode. */}
      <p className="text-xs font-medium uppercase tracking-wide text-parchment-dim">
        {t.about.dataSectionTitle}
      </p>
      <p className="mt-1.5 text-sm text-parchment-dim">{t.about.dataSectionDescription}</p>
      <p className="mt-1.5 text-sm text-parchment-dim">{t.storage.backupStillMatters}</p>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-parchment-dim">
        {stale && <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-gold" />}
        {lastBackupAt
          ? interpolate(t.about.lastBackup, { when: formatSince(lastBackupAt, locale) })
          : t.about.noBackupYet}
      </p>

      {exportedFilename && (
        <p className="mt-2 text-xs text-gold/80">
          {interpolate(t.about.exportedAllConfirmation, { filename: exportedFilename })}
        </p>
      )}
      {importError && <p className="mt-2 text-xs text-no">{importError}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleExportAll()}
          className="flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-gold px-3 py-2.5 text-sm font-medium text-ink-950 transition hover:bg-gold-soft"
        >
          <IconDownload size={16} />
          {t.about.exportAllButton}
        </button>
        {canShare() && (
          <button
            type="button"
            onClick={() => void handleShareAll()}
            className="flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-gold/50 px-3 py-2.5 text-sm font-medium text-gold transition hover:bg-gold/10"
          >
            <IconShare size={16} />
            {t.about.shareAllButton}
          </button>
        )}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-ink-border px-3 py-2.5 text-sm text-parchment-dim transition hover:border-gold/50 hover:text-gold"
        >
          <IconUpload size={16} />
          {t.about.importAllButton}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          // .txt too: shared from Chromium, the backup arrives as text.
          accept=".json,.txt,application/json,text/plain"
          className="hidden"
          onChange={(e) => void handleImportFile(e)}
        />
      </div>
      <p className="mt-3 text-xs leading-relaxed text-parchment-dim">{t.about.dataSectionHint}</p>

      {pendingRestore && (
        <Modal
          onClose={() => setPendingRestore(null)}
          labelledBy="restore-choice-title"
          centered
          size="sm"
        >
          <DialogBody className="block">
            <h2 id="restore-choice-title" className="font-display text-xl text-parchment">
              {t.about.restoreChoiceTitle}
            </h2>
            {pendingRestore.date && (
              <p className="mt-1 text-sm text-parchment-dim">
                {interpolate(t.about.restoreChoiceDescription, { date: pendingRestore.date })}
              </p>
            )}
            <RestoreChoice
              text={pendingRestore.text}
              onCancel={() => setPendingRestore(null)}
              onError={(message) => {
                setImportError(message);
                setPendingRestore(null);
              }}
            />
          </DialogBody>
        </Modal>
      )}
    </div>
  );
}

function AboutSettings() {
  const { t } = useLocaleContext();

  return (
    <>
      <p className="text-sm text-parchment-dim">
        {t.about.description}{" "}
        <span className="whitespace-nowrap text-parchment-faint">
          {interpolate(t.about.version, { version: versionLabel() })}
        </span>
      </p>

      <ChangelogDialog />

      <PrivacyCard />

      <FeedbackCard />

      <SupportCard />

      <SourceCard />

      <CreditList
        label={t.about.oracleUsedBy}
        credits={ORACLES.map((o) => ({ ...o, attribution: [o.attribution] }))}
      />

      <CreditList label={t.about.tablesUsedBy} credits={TABLE_CREDITS} />

      <Credit
        label={t.about.journalUsedBy}
        name="Lonelog"
        author="Roberto Bisceglie"
        license="CC BY-SA 4.0"
        licenseUrl={LONELOG_LICENSE_URL}
        url={LONELOG_URL}
      >
        <div className="mt-4 border-t border-ink-border pt-3.5">
          <p className="text-xs font-medium uppercase tracking-wide text-parchment-faint">
            {t.about.legendTitle}
          </p>
          <p className="mt-1.5 text-xs text-parchment-dim">{t.about.legendIntro}</p>
          <dl className="mt-2.5 flex flex-col gap-2">
            <LegendRow Icon={IconAction} symbol="@" description={t.about.legendAction} />
            <LegendRow Icon={IconQuestion} symbol="?" description={t.about.legendQuestion} />
            <LegendRow Icon={IconDice} symbol="d:" description={t.about.legendRoll} />
            <LegendRow Icon={IconConsequence} symbol="=>" description={t.about.legendConsequence} />
            <LegendRow Icon={IconNote} description={t.about.legendNote} />
            <LegendRow Icon={IconSession} symbol="=== ===" description={t.about.legendSession} />
            <LegendRow Icon={IconScene} symbol="S1 *…*" description={t.about.legendScene} />
            <LegendRow Icon={IconTable} symbol="tbl:" description={t.about.legendTable} />
            <LegendRow Icon={IconDialogue} symbol="@( )" description={t.about.legendNarrative} />
            <LegendRow Icon={IconCast} symbol="[N:]" description={t.about.legendTags} />
            <LegendRow Icon={IconCombat} symbol="[R:] [F:]" description={t.about.legendAddons} />
          </dl>
        </div>
      </Credit>
    </>
  );
}

/** Where the data lives: in this browser, and, only if the device sync is on, sealed on its relay. */
function PrivacyCard() {
  const { t } = useLocaleContext();
  return (
    <div className="rounded-2xl border border-ink-border bg-ink-900/60 p-4">
      <p className="flex items-center gap-1.5 font-display text-base text-parchment">
        <IconShieldLock size={18} className="shrink-0 text-gold" />
        {t.about.privacyTitle}
      </p>
      <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-4 text-sm text-parchment-dim marker:text-gold">
        {t.about.privacyItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
        {syncAvailable() && <li>{t.about.privacySync}</li>}
      </ul>
      {syncAvailable() && (
        <div className="mt-3">
          <SyncHelpButton label={t.about.privacySyncHow} />
        </div>
      )}
    </div>
  );
}

/** Ideas and bugs, through the form in the player's language. */
function FeedbackCard() {
  const { t, locale } = useLocaleContext();
  return (
    <div className="rounded-2xl border border-ink-border bg-ink-900/60 p-4">
      <p className="flex items-center gap-1.5 font-display text-base text-parchment">
        <IconFeedback size={18} className="shrink-0 text-gold" />
        {t.about.feedbackTitle}
      </p>
      <p className="mt-1 text-sm text-parchment-dim">{t.about.feedbackDescription}</p>
      <a
        href={feedbackUrl(locale, versionLabel(), navigator.userAgent)}
        target="_blank"
        rel="noreferrer"
        className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-ink-border py-2 text-sm font-medium text-parchment-dim transition hover:border-gold/50 hover:text-gold"
      >
        {t.about.feedbackButton}
        <IconExternalLink size={14} />
      </a>
    </div>
  );
}

function SourceCard() {
  const { t } = useLocaleContext();
  return (
    <div className="rounded-2xl border border-ink-border bg-ink-900/60 p-4">
      <p className="flex items-center gap-1.5 font-display text-base text-parchment">
        <IconGithub size={18} className="shrink-0 text-gold" />
        {t.about.sourceTitle}
      </p>
      <p className="mt-1 text-sm text-parchment-dim">{t.about.sourceDescription}</p>
      <a
        href={GITHUB_URL}
        target="_blank"
        rel="noreferrer"
        className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-ink-border py-2 text-sm font-medium text-parchment-dim transition hover:border-gold/50 hover:text-gold"
      >
        {t.about.sourceButton}
        <IconExternalLink size={14} />
      </a>
    </div>
  );
}

/**
 * A plain link to Ko-fi, not its widget: the widget loads a third-party
 * script on every visit (and here nothing leaves the device), doesn't
 * work offline and doesn't respect the themes.
 */
function SupportCard() {
  const { t } = useLocaleContext();
  return (
    <div className="rounded-2xl border border-ink-border bg-ink-900/60 p-4">
      <p className="flex items-center gap-1.5 font-display text-base text-parchment">
        <IconCoffee size={18} className="shrink-0 text-gold" />
        {t.support.title}
      </p>
      <p className="mt-1 text-sm text-parchment-dim">{t.support.description}</p>
      <a
        href={KOFI_URL}
        target="_blank"
        rel="noreferrer"
        className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-gold/40 bg-gold/10 py-2 text-sm font-medium text-gold transition hover:bg-gold/20"
      >
        {t.support.button}
        <IconExternalLink size={14} />
      </a>
    </div>
  );
}

/** Every third-party oracle or table source, with the attribution each asks for. */
function CreditList({ label, credits }: { label: string; credits: typeof TABLE_CREDITS }) {
  const { t } = useLocaleContext();
  return (
    <div className="rounded-2xl border border-ink-border bg-ink-900/60 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-parchment-faint">{label}</p>
      <ul className="mt-2 flex flex-col gap-3">
        {credits.map((credit) => (
          <li key={credit.name}>
            <a
              href={credit.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-base font-semibold text-parchment transition hover:text-gold"
            >
              {credit.name}
              <IconExternalLink size={13} />
            </a>
            <p className="text-sm text-parchment-dim">
              {interpolate(t.about.creditBy, { author: credit.author })}{" "}
              <a
                href={credit.licenseUrl}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-dotted hover:text-parchment"
              >
                {credit.license}
              </a>
              .
            </p>
            {/* The wording each source asks for, in English as published. */}
            {credit.attribution.map((line) => (
              <p key={line} className="mt-1 text-xs italic text-parchment-dim">
                {line}
              </p>
            ))}
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-ink-border pt-3 text-xs text-parchment-dim">
        {t.about.notOfficial} {t.about.translationNote}
      </p>
    </div>
  );
}

function Credit({
  label,
  name,
  author,
  license,
  licenseUrl,
  url,
  children,
}: {
  label: string;
  name: string;
  author: string;
  license: string;
  licenseUrl: string;
  url: string;
  children?: ReactNode;
}) {
  const { t } = useLocaleContext();
  return (
    <div className="rounded-2xl border border-ink-border bg-ink-900/60 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-parchment-faint">{label}</p>
      <p className="mt-1 font-display text-base text-parchment">{name}</p>
      <p className="mt-1 text-sm text-parchment-dim">
        {interpolate(t.about.creditBy, { author })}{" "}
        <a
          href={licenseUrl}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-dotted hover:text-parchment"
        >
          {license}
        </a>
        .
      </p>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-gold/40 bg-gold/10 py-2 text-sm font-medium text-gold transition hover:bg-gold/20"
      >
        {t.common.viewOriginal}
        <IconExternalLink size={14} />
      </a>
      {children}
    </div>
  );
}

function LegendRow({
  Icon,
  symbol,
  description,
}: {
  Icon: ComponentType<{ size?: number; className?: string }>;
  symbol?: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <dt className="flex w-20 shrink-0 items-center gap-2 pt-0.5">
        <Icon size={16} className="shrink-0 text-gold" />
        <code className="text-xs text-parchment-dim">{symbol}</code>
      </dt>
      <dd className="min-w-0 flex-1 text-parchment-dim">{description}</dd>
    </div>
  );
}
