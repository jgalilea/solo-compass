import { Component, type ErrorInfo, type ReactNode } from "react";
import { IconAlertOctagon } from "./icons/Icons";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Error no controlado en Solo Compass:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <IconAlertOctagon size={32} className="text-no" />
          <h1 className="font-display text-xl text-parchment">
            Algo se ha roto en la app
          </h1>
          <p className="max-w-sm text-sm text-parchment-dim">
            Ha ocurrido un error inesperado. Puedes recargar la página; tu
            historial guardado no se pierde.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full bg-gold px-5 py-2 font-medium text-ink-950 transition hover:bg-gold-soft"
          >
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
