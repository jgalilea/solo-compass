import { Component, type ContextType, type ErrorInfo, type ReactNode } from "react";
import { IconCopy, IconExternalLink, IconFeedback, IconFumble } from "./icons/Icons";
import { LocaleContext } from "../hooks/localeContextInstance";
import { loadedDictionary, loadLocale } from "../lib/i18n";
import { errorIssueUrl, errorReport } from "../lib/errorReport";
import { copyText } from "../lib/share";
import { feedbackUrl } from "../lib/support";
import { versionLabel } from "../lib/appVersion";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  /** What errorReport wrote, kept so the copy and the issue say the same. */
  report: string;
  copied: "yes" | "failed" | null;
}

/**
 * The fumble screen: what's shown if something throws while drawing.
 * Says the journal is safe (it is: it's in IndexedDB, untouched), offers
 * a reload, and lets the player copy what happened or report it.
 */
export class AppErrorBoundary extends Component<Props, State> {
  static contextType = LocaleContext;
  declare context: ContextType<typeof LocaleContext>;

  state: State = { error: null, report: "", copied: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error, report: errorReport(error) };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled error in Solo Compass:", error, info);
  }

  render() {
    const { error, report, copied } = this.state;
    const locale = this.context?.locale ?? loadLocale();
    if (error) {
      // If for whatever reason the boundary rendered outside
      // LocaleProvider, fall back to the dictionary main.tsx loaded
      // instead of crashing while showing the app's own error.
      const t = this.context?.t ?? loadedDictionary(loadLocale());
      if (!t) return null;
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <IconFumble size={40} className="text-no" />
          <h1 className="font-display text-xl text-parchment">{t.error.boundaryTitle}</h1>
          <p className="max-w-md text-sm text-parchment-dim">{t.error.boundaryDescription}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full bg-gold px-5 py-2 font-medium text-ink-950 transition hover:bg-gold-soft"
          >
            {t.error.reload}
          </button>

          <div className="mt-4 flex w-full max-w-md flex-col gap-3 rounded-2xl border border-ink-border bg-ink-900/60 p-4 text-left">
            <p className="text-sm text-parchment-dim">{t.error.reportHint}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copyText(report).then((ok) => this.setState({ copied: ok ? "yes" : "failed" }))}
                className="flex items-center gap-1.5 rounded-xl border border-gold/40 bg-gold/10 px-3 py-2 text-sm font-medium text-gold transition hover:bg-gold/20"
              >
                <IconCopy size={16} />
                {t.error.copyDetails}
              </button>
              <a
                href={feedbackUrl(locale, versionLabel(), navigator.userAgent)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-xl border border-ink-border px-3 py-2 text-sm text-parchment-dim transition hover:border-gold/50 hover:text-gold"
              >
                <IconFeedback size={16} />
                {t.error.reportForm}
                <IconExternalLink size={14} />
              </a>
            </div>
            <a
              href={errorIssueUrl(error, report)}
              target="_blank"
              rel="noreferrer"
              className="self-start text-xs text-parchment-faint underline underline-offset-2 transition hover:text-gold"
            >
              {t.error.reportOnGithub}
            </a>
            {copied && (
              <p role="status" className="text-xs text-parchment-faint">
                {copied === "yes" ? t.error.copied : t.error.copyFailed}
              </p>
            )}
            {copied === "failed" && (
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-ink-950 p-2 text-xs text-parchment-dim select-all">
                {report}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
