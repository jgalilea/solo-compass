import { Component, type ContextType, type ErrorInfo, type ReactNode } from "react";
import { IconAlertOctagon } from "./icons/Icons";
import { LocaleContext } from "../hooks/localeContextInstance";
import { DICTIONARIES, DEFAULT_LOCALE } from "../lib/i18n";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  static contextType = LocaleContext;
  declare context: ContextType<typeof LocaleContext>;

  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Error no controlado en Solo Compass:", error, info);
  }

  render() {
    if (this.state.error) {
      // Si por lo que sea el boundary se renderizase fuera de
      // LocaleProvider, cae a un diccionario por defecto en vez de
      // reventar mostrando el propio error de la app.
      const t = this.context?.t ?? DICTIONARIES[DEFAULT_LOCALE];
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <IconAlertOctagon size={32} className="text-no" />
          <h1 className="font-display text-xl text-parchment">
            {t.error.boundaryTitle}
          </h1>
          <p className="max-w-sm text-sm text-parchment-dim">
            {t.error.boundaryDescription}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full bg-gold px-5 py-2 font-medium text-ink-950 transition hover:bg-gold-soft"
          >
            {t.error.reload}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
