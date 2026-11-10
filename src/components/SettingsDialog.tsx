import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
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
  IconNote,
  IconQuestion,
  IconScene,
  IconSession,
  IconSettings,
  IconShare,
  IconTable,
  IconUpload,
} from "./icons/Icons";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { useThemeContext } from "../hooks/useThemeContext";
import { useModeContext } from "../hooks/useModeContext";
import { useJournalContext } from "../hooks/useJournalContext";
import { useHotkeys } from "../hooks/useHotkeys";
import { ORACLES } from "../lib/oracles";
import { THEMES } from "../lib/theme";
import { MODES } from "../lib/mode";
import { LOCALES, interpolate } from "../lib/i18n";
import { LONELOG_LICENSE_URL, LONELOG_URL } from "../lib/lonelog";
import { TABLE_CREDITS } from "../lib/tableGames";
import {
  backupFilename,
  BackupError,
  backupText,
  buildBackup,
  downloadBackupFile,
  restoreBackup,
  type RestoreMode,
} from "../lib/backup";
import { canShare, shareTextFile } from "../lib/share";
import {
  formatSince,
  loadLastBackupAt,
  markBackupNudgeSeen,
  saveLastBackupAt,
  shouldNudgeBackup,
} from "../lib/backupReminder";
import { ChangelogDialog } from "./ChangelogDialog";
import { StorageProtectionSettings } from "./StorageProtection";
import { InstallAppSettings } from "./InstallApp";
import { DialogBody, DialogHeader } from "./Dialog";
import { Modal } from "./Modal";
import { KOFI_URL } from "../lib/support";

/**
 * A single entry point for everything that isn't playing: appearance,
 * language, backup and credits. These used to be three loose icons in
 * the header, and the backup (the most important thing in an app with
 * no server) was hidden inside "About".
 */
export function SettingsDialog() {
  const { t } = useLocaleContext();
  const { entries } = useJournalContext();
  const [open, setOpen] = useState(false);
  // "?" opens Settings straight at the shortcut legend.
  const [showShortcuts, setShowShortcuts] = useState(false);
  const shortcutsRef = useRef<HTMLElement>(null);
  const [nudgeSeen, setNudgeSeen] = useState(false);
  const backupDue = useMemo(() => shouldNudgeBackup(entries.map((e) => e.timestamp)), [entries]);
  const nudge = backupDue && !nudgeSeen;

  function openSettings(shortcuts = false) {
    setShowShortcuts(shortcuts);
    setOpen(true);
    // Once the dot has been seen, don't insist for a while even if no backup is made.
    if (nudge) {
      markBackupNudgeSeen();
      setNudgeSeen(true);
    }
  }

  useHotkeys({ "?": () => openSettings(true) });

  useEffect(() => {
    if (open && showShortcuts) shortcutsRef.current?.scrollIntoView({ block: "start" });
  }, [open, showShortcuts]);

  const triggerLabel = nudge ? t.settings.triggerLabelBackupDue : t.settings.triggerLabel;

  return (
    <>
      <button
        type="button"
        onClick={() => openSettings()}
        aria-label={triggerLabel}
        title={triggerLabel}
        aria-keyshortcuts="?"
        className="relative -m-1.5 p-1.5 text-parchment-dim transition hover:text-gold"
      >
        <IconSettings size={22} />
        {/* Backup due: just a dot, no text and no notice. */}
        {nudge && (
          <span className="absolute right-1 top-1 size-2 rounded-full bg-gold ring-2 ring-ink-950" />
        )}
      </button>

      {open && (
        <Modal
          onClose={() => setOpen(false)}
          label={t.settings.title}
          size="lg"
        >
          <DialogHeader title={t.settings.title} onClose={() => setOpen(false)} />
          <DialogBody className="block">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
                <div className="flex flex-col gap-6">
                  <Section title={t.settings.appearanceHeading}>
                    <AppearanceSettings />
                  </Section>
                  <Section title={t.settings.languageHeading}>
                    <LanguageSettings />
                  </Section>
                  {/* Only with a mouse or a keyboard at hand (or when reached via "?"). */}
                  <Section
                    ref={shortcutsRef}
                    title={t.shortcuts.heading}
                    className={showShortcuts ? "scroll-mt-4" : "hidden any-pointer-fine:flex"}
                  >
                    <ShortcutsLegend />
                  </Section>
                </div>
                <div className="flex flex-col gap-6">
                  <Section title={t.install.sectionTitle}>
                    <InstallAppSettings />
                  </Section>
                  <Section title={t.storage.sectionTitle}>
                    <StorageProtectionSettings />
                    <BackupSettings />
                  </Section>
                  <Section title={t.settings.aboutHeading}>
                    <AboutSettings />
                  </Section>
                </div>
              </div>
          </DialogBody>
        </Modal>
      )}
    </>
  );
}

function Section({
  title,
  className = "",
  ref,
  children,
}: {
  title: string;
  className?: string;
  ref?: React.Ref<HTMLElement>;
  children: ReactNode;
}) {
  return (
    <section ref={ref} className={`flex flex-col gap-3 ${className}`}>
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
                active ? "bg-gold text-ink-950 shadow-sm" : "text-parchment-dim hover:text-parchment",
              ].join(" ")}
            >
              {t.modeSwitcher[option]}
            </button>
          );
        })}
      </div>

      <div role="radiogroup" aria-label={t.themeSwitcher.dialogTitle} className="flex flex-col gap-2">
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
                "flex items-center gap-3 rounded-2xl border p-3 text-left transition",
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
                <span className="block truncate text-xs text-parchment-dim">{label.tagline}</span>
              </span>
              {active && <IconCheck size={18} className="shrink-0 text-gold" />}
            </button>
          );
        })}
      </div>
    </>
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

function ShortcutsLegend() {
  const { t } = useLocaleContext();
  const s = t.shortcuts;
  const groups: { heading: string; rows: [keys: string[], label: string][] }[] = [
    {
      heading: s.navigationHeading,
      rows: [
        [["1"], s.goOracle],
        [["2"], s.goTables],
        [["3"], s.goJournal],
        [["H"], s.goHistory],
      ],
    },
    {
      heading: s.playHeading,
      rows: [
        [["/"], s.write],
        [["O"], s.oracle],
        [["T"], s.table],
        [["D"], s.dice],
        [[s.enterKey], s.send],
        [[s.shiftKey, s.enterKey], s.newLine],
        [["Esc"], s.leaveField],
        [["?"], s.help],
      ],
    },
  ];

  return (
    <div className="rounded-2xl border border-ink-border bg-ink-900/60 p-4">
      <p className="text-sm text-parchment-dim">{s.intro}</p>
      {groups.map(({ heading, rows }) => (
        <div key={heading} className="mt-3.5">
          <p className="text-xs font-medium uppercase tracking-wide text-parchment-dim/70">{heading}</p>
          {/* Fixed-width key column: both lists line up. */}
          <dl className="mt-2 grid grid-cols-[6.5rem_1fr] items-center gap-x-3 gap-y-2 text-sm">
            {rows.map(([keys, label]) => (
              <div key={label} className="contents">
                <dt className="flex gap-1">
                  {keys.map((k) => (
                    <kbd
                      key={k}
                      className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-b-2 border-ink-border bg-ink-800 px-1.5 font-sans text-xs font-medium text-parchment"
                    >
                      {k}
                    </kbd>
                  ))}
                </dt>
                <dd className="min-w-0 text-parchment-dim">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

function BackupSettings() {
  const { t, locale } = useLocaleContext();
  const { entries } = useJournalContext();
  const [lastBackupAt, setLastBackupAt] = useState(loadLastBackupAt);
  // Same rule as the header dot, without the "already seen" snooze.
  const stale = useMemo(
    () => shouldNudgeBackup(entries.map((e) => e.timestamp), undefined, lastBackupAt, null),
    [entries, lastBackupAt],
  );
  const [exportedFilename, setExportedFilename] = useState<string | null>(null);
  // The backup file just picked, waiting for "merge" or "replace".
  const [pendingRestore, setPendingRestore] = useState<{ text: string; date: string | null } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function markBackedUp() {
    const now = Date.now();
    saveLastBackupAt(now);
    setLastBackupAt(now);
  }

  async function handleExportAll() {
    const payload = await buildBackup(t);
    const filename = backupFilename();
    downloadBackupFile(filename, payload);
    setExportedFilename(filename);
    markBackedUp();
  }

  // Straight to another device through the system's share sheet; if
  // sharing fails (not just cancelled), it's downloaded instead.
  async function handleShareAll() {
    const payload = await buildBackup(t);
    const filename = backupFilename();
    try {
      if ((await shareTextFile(filename, backupText(payload), t.about.shareAllTitle, "application/json")) === "shared") {
        markBackedUp();
      }
    } catch {
      downloadBackupFile(filename, payload);
      setExportedFilename(filename);
      markBackedUp();
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const text = await file.text();
    setImportError(null);
    let date: string | null = null;
    try {
      const exportedAt = Date.parse((JSON.parse(text) as { exportedAt?: string }).exportedAt ?? "");
      if (Number.isFinite(exportedAt)) {
        date = new Intl.DateTimeFormat(t.dateLocale, { dateStyle: "long", timeStyle: "short" }).format(exportedAt);
      }
    } catch {
      // Not readable: restoreBackup says so when it's tried.
    }
    setPendingRestore({ text, date });
  }

  async function confirmRestore(mode: RestoreMode) {
    if (!pendingRestore || restoring) return;
    setRestoring(true);
    try {
      await restoreBackup(t, pendingRestore.text, mode);
      // Full reload on purpose: history/journal/theme/locale… are
      // spread across several React contexts that are already mounted,
      // and the simplest, most reliable way for all of them to reflect
      // the freshly restored data is to start from scratch.
      window.location.reload();
    } catch (err) {
      setImportError(err instanceof BackupError ? err.message : t.about.importAllError);
      setRestoring(false);
      setPendingRestore(null);
    }
  }

  return (
    <div className="rounded-2xl border border-gold/30 bg-gold/[0.05] p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-parchment-dim/70">
        {t.about.dataSectionTitle}
      </p>
      <p className="mt-1.5 text-sm text-parchment-dim">{t.about.dataSectionDescription}</p>
      <p className="mt-1.5 text-sm text-parchment-dim">{t.storage.backupStillMatters}</p>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-parchment-dim/80">
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
          onClick={handleExportAll}
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
          onChange={handleImportFile}
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
            {restoring ? (
              <p className="mt-4 text-sm text-gold">{t.about.importAllSuccessReloading}</p>
            ) : (
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => void confirmRestore("merge")}
                  className="rounded-xl border border-gold/50 bg-gold/10 px-4 py-3 text-left transition hover:bg-gold/20"
                >
                  <span className="block text-sm font-semibold text-gold">{t.about.restoreMergeLabel}</span>
                  <span className="mt-0.5 block text-xs text-parchment-dim">{t.about.restoreMergeDescription}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void confirmRestore("replace")}
                  className="rounded-xl border border-ink-border px-4 py-3 text-left transition hover:border-no/60"
                >
                  <span className="block text-sm font-semibold text-no">{t.about.restoreReplaceLabel}</span>
                  <span className="mt-0.5 block text-xs text-parchment-dim">{t.about.restoreReplaceDescription}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPendingRestore(null)}
                  className="self-end rounded-full px-4 py-2 text-sm text-parchment-dim transition hover:text-parchment"
                >
                  {t.common.cancel}
                </button>
              </div>
            )}
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
      <p className="text-sm text-parchment-dim">{t.about.description}</p>

      <ChangelogDialog />

      <SupportCard />

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
          <p className="text-xs font-medium uppercase tracking-wide text-parchment-dim/70">
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
            <LegendRow Icon={IconTable} symbol="tbl: gen:" description={t.about.legendTable} />
            <LegendRow Icon={IconDialogue} symbol="@( )" description={t.about.legendNarrative} />
            <LegendRow Icon={IconCast} symbol="[N:]" description={t.about.legendTags} />
            <LegendRow Icon={IconCombat} symbol="[R:] [F:]" description={t.about.legendAddons} />
          </dl>
        </div>
      </Credit>
    </>
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
      <p className="text-xs font-medium uppercase tracking-wide text-parchment-dim/70">{label}</p>
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
              <p key={line} className="mt-1 text-xs italic text-parchment-dim/80">
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
      <p className="text-xs font-medium uppercase tracking-wide text-parchment-dim/70">{label}</p>
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
