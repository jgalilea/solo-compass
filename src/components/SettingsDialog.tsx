import { useRef, useState, type ComponentType, type ReactNode } from "react";
import {
  IconAction,
  IconCheck,
  IconClose,
  IconConsequence,
  IconDice,
  IconDownload,
  IconExternalLink,
  IconNote,
  IconQuestion,
  IconSession,
  IconSettings,
  IconUpload,
} from "./icons/Icons";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { useOracleContext } from "../hooks/useOracleContext";
import { useThemeContext } from "../hooks/useThemeContext";
import { useModeContext } from "../hooks/useModeContext";
import { getOracle } from "../lib/oracles";
import { THEMES } from "../lib/theme";
import { MODES } from "../lib/mode";
import { LOCALES, interpolate } from "../lib/i18n";
import { LONELOG_LICENSE_URL, LONELOG_URL } from "../lib/lonelog";
import { backupFilename, BackupError, buildBackup, downloadBackupFile, restoreBackup } from "../lib/backup";
import { ChangelogDialog } from "./ChangelogDialog";
import { ConfirmDialog } from "./ConfirmDialog";
import { StorageProtectionSettings } from "./StorageProtection";
import { Modal } from "./Modal";

/**
 * Un único punto de entrada para todo lo que no es jugar: apariencia,
 * idioma, copia de seguridad y créditos. Antes eran tres iconos
 * sueltos en la cabecera, y la copia de seguridad (lo más importante
 * en una app sin servidor) quedaba escondida dentro de "Acerca de".
 */
export function SettingsDialog() {
  const { t } = useLocaleContext();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t.settings.triggerLabel}
        title={t.settings.triggerLabel}
        className="-m-1.5 p-1.5 text-parchment-dim transition hover:text-gold"
      >
        <IconSettings size={22} />
      </button>

      {open && (
        <Modal
          onClose={() => setOpen(false)}
          label={t.settings.title}
          className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-ink-border bg-ink-800 shadow-2xl sm:max-w-lg sm:rounded-3xl lg:max-w-4xl"
        >
          {/* La cabecera queda fija y solo el contenido hace scroll, para
              que la barra no se monte sobre las esquinas redondeadas. */}
          <div className="flex shrink-0 items-center justify-between border-b border-ink-border/70 px-5 py-4 sm:px-6">
            <h2 className="font-display text-xl text-parchment">{t.settings.title}</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t.common.close}
              className="-m-1.5 p-1.5 text-parchment-dim transition hover:text-parchment"
            >
              <IconClose size={20} />
            </button>
          </div>

          <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 sm:py-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
              <div className="flex flex-col gap-6">
                <Section title={t.settings.appearanceHeading}>
                  <AppearanceSettings />
                </Section>
                <Section title={t.settings.languageHeading}>
                  <LanguageSettings />
                </Section>
              </div>
              <div className="flex flex-col gap-6">
                <Section title={t.storage.sectionTitle}>
                  <StorageProtectionSettings />
                  <BackupSettings />
                </Section>
                <Section title={t.settings.aboutHeading}>
                  <AboutSettings />
                </Section>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
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

function BackupSettings() {
  const { t } = useLocaleContext();
  const [exportedFilename, setExportedFilename] = useState<string | null>(null);
  const [pendingRestore, setPendingRestore] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleExportAll() {
    const payload = await buildBackup(t);
    const filename = backupFilename();
    downloadBackupFile(filename, payload);
    setExportedFilename(filename);
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const text = await file.text();
    setImportError(null);
    setPendingRestore(text);
  }

  async function confirmRestore() {
    if (!pendingRestore || restoring) return;
    setRestoring(true);
    try {
      await restoreBackup(t, pendingRestore);
      // Recarga completa a propósito: history/journal/theme/locale…
      // viven repartidos en varios contextos de React ya montados, y
      // la forma más simple y fiable de que todos reflejen los datos
      // recién restaurados es arrancar de cero.
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

      {exportedFilename && (
        <p className="mt-2 text-xs text-gold/80">
          {interpolate(t.about.exportedAllConfirmation, { filename: exportedFilename })}
        </p>
      )}
      {importError && <p className="mt-2 text-xs text-no">{importError}</p>}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleExportAll}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gold py-2.5 text-sm font-medium text-ink-950 transition hover:bg-gold-soft"
        >
          <IconDownload size={16} />
          {t.about.exportAllButton}
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-ink-border py-2.5 text-sm text-parchment-dim transition hover:border-gold/50 hover:text-gold"
        >
          <IconUpload size={16} />
          {t.about.importAllButton}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleImportFile}
        />
      </div>

      {pendingRestore && (
        <ConfirmDialog
          title={t.about.importAllConfirmTitle}
          description={
            restoring ? t.about.importAllSuccessReloading : t.about.importAllConfirmDescription
          }
          confirmLabel={t.about.importAllConfirmButton}
          onConfirm={confirmRestore}
          onCancel={() => setPendingRestore(null)}
        />
      )}
    </div>
  );
}

function AboutSettings() {
  const { t } = useLocaleContext();
  const { oracleId } = useOracleContext();
  const oracle = getOracle(oracleId);

  return (
    <>
      <p className="text-sm text-parchment-dim">{t.about.description}</p>

      <ChangelogDialog />

      <Credit
        label={t.about.oracleUsedBy}
        name={oracle.name}
        author={oracle.author}
        license={oracle.license}
        licenseUrl={oracle.licenseUrl}
        url={oracle.url}
      />

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
          </dl>
        </div>
      </Credit>
    </>
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
