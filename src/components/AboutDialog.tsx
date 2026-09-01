import { useState } from "react";
import { IconClose, IconCompass, IconExternalLink, IconInfo } from "./icons/Icons";

const RECLUSE_URL = "https://gravenutterance.itch.io/recluse";

export function AboutDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Acerca de Solo Compass y créditos"
        className="-m-1.5 p-1.5 text-parchment-dim transition hover:text-gold"
      >
        <IconInfo size={20} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Acerca de Solo Compass"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-3xl border border-ink-border bg-ink-800 p-5 shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconCompass size={20} className="text-gold" />
                <h2 className="font-display text-lg text-parchment">
                  Solo Compass
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="-m-1 p-1 text-parchment-dim transition hover:text-parchment"
              >
                <IconClose size={16} />
              </button>
            </div>

            <p className="text-sm text-parchment-dim">
              Oráculo y tablas de significado para guiar partidas de rol en
              solitario. Todo el historial se guarda solo en este
              dispositivo.
            </p>

            <div className="mt-4 rounded-2xl border border-ink-border bg-ink-900/60 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-parchment-dim/70">
                El oráculo usa
              </p>
              <p className="mt-1 font-display text-base text-parchment">
                Recluse
              </p>
              <p className="mt-1 text-sm text-parchment-dim">
                de Graven Utterance (Oliver N), bajo licencia{" "}
                <a
                  href="https://creativecommons.org/licenses/by/4.0/"
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-dotted hover:text-parchment"
                >
                  CC BY 4.0
                </a>
                .
              </p>
              <a
                href={RECLUSE_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-gold/40 bg-gold/10 py-2 text-sm font-medium text-gold transition hover:bg-gold/20"
              >
                Ver Recluse original
                <IconExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
