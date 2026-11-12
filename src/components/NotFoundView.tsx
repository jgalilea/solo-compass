import { Link } from "react-router-dom";
import { IconCompass, IconExternalLink, IconFeedback, IconLost } from "./icons/Icons";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { feedbackUrl } from "../lib/support";
import { versionLabel } from "../lib/appVersion";

/**
 * An address that isn't one of the app's screens (an old or mistyped
 * link): says so in the game's voice, leads back to the oracle and, in
 * case a link in the app brought the player here, offers the
 * ideas-and-bugs form.
 */
export function NotFoundView() {
  const { t, locale } = useLocaleContext();
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <IconLost size={44} className="text-gold" />
      <h1 className="font-display text-2xl text-parchment sm:text-3xl">{t.error.notFoundTitle}</h1>
      <p className="max-w-md text-sm text-parchment-dim">{t.error.notFoundDescription}</p>
      <Link
        to="/"
        className="flex items-center gap-1.5 rounded-full bg-gold px-5 py-2 font-medium text-ink-950 transition hover:bg-gold-soft"
      >
        <IconCompass size={18} />
        {t.error.notFoundHome}
      </Link>

      <div className="mt-4 flex w-full max-w-md flex-col gap-3 rounded-2xl border border-ink-border bg-ink-900/60 p-4 text-left">
        <p className="text-sm text-parchment-dim">{t.error.notFoundReport}</p>
        <a
          href={feedbackUrl(locale, versionLabel(), navigator.userAgent)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-xl border border-ink-border py-2 text-sm font-medium text-parchment-dim transition hover:border-gold/50 hover:text-gold"
        >
          <IconFeedback size={16} />
          {t.error.reportForm}
          <IconExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}
