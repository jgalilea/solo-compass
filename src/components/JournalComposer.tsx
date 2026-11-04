import { useLayoutEffect, useRef, useState, type ComponentType, type Ref, type RefObject } from "react";
import { useDismiss } from "../hooks/useDismiss";
import { useJournalContext } from "../hooks/useJournalContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { interpolate } from "../lib/i18n";
import { COMPOSER_KINDS, type ComposerMode } from "../lib/journalUi";
import { Modal } from "./Modal";
import { DiceTool, OracleTool, TableTool } from "./PlayTools";
import {
  IconAction,
  IconChevronUpDown,
  IconClose,
  IconConsequence,
  IconDice,
  IconNote,
  IconOracle,
  IconSend,
  IconSession,
  IconTable,
} from "./icons/Icons";

type Tool = "oracle" | "table" | "dice";
type IconType = ComponentType<{ size?: number; className?: string }>;

const MODE_ICON: Record<ComposerMode, IconType> = {
  note: IconNote,
  action: IconAction,
  roll: IconDice,
  consequence: IconConsequence,
  session: IconSession,
};

/**
 * Composer fijo al pie del diario, en una sola fila para dejar la
 * pantalla al diario: herramientas (oráculo, tabla, dados), el tipo de
 * entrada como un chip dentro del campo, el texto y enviar.
 *
 * El texto admite varias líneas y el campo crece con él (hasta unas
 * seis; luego hace scroll dentro). Con teclado físico Intro envía y
 * Mayús+Intro salta de línea, como en un chat; en táctil Intro salta
 * de línea y se envía con el botón (allí no hay Mayús a mano).
 *
 * Las herramientas se abren en una hoja desde abajo por encima del
 * contenido (no empujan el composer ni tapan las últimas entradas), con
 * pestañas para pasar de una a otra, y se cierran al tirar. En
 * escritorio no aparecen aquí: viven en el panel fijo de la derecha
 * (ver AdventureDetailView).
 *
 * El tipo y la tirada enlazada los guarda el padre, porque también los
 * cambia el panel de escritorio: tras cualquier tirada pasa solo a
 * "Consecuencia", que es lo siguiente que se suele apuntar.
 */
export function JournalComposer({
  ref,
  inputRef,
  adventureId,
  mode,
  onModeChange,
  linkedRollId,
  onLogged,
  onRolled,
}: {
  /** El diario lo mide para no dejar lo recién apuntado debajo del composer. */
  ref?: Ref<HTMLDivElement>;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  adventureId: string;
  mode: ComposerMode;
  onModeChange: (mode: ComposerMode) => void;
  linkedRollId: string | undefined;
  /** Se ha apuntado algo escrito a mano. */
  onLogged: () => void;
  /** Se ha tirado con una herramienta (rollId para enlazar la consecuencia). */
  onRolled: (rollId?: string) => void;
}) {
  const { t } = useLocaleContext();
  const { addEntry } = useJournalContext();
  const [tool, setTool] = useState<Tool | null>(null);
  const [text, setText] = useState("");
  // Teclado físico (ratón/trackpad): Intro envía. Se mira una vez; no
  // cambia a mitad de partida.
  const [finePointer] = useState(() => window.matchMedia("(pointer: fine)").matches);
  const sendsOnEnter = finePointer || mode === "session";

  // El campo crece con el texto (vacío vuelve a una fila: si no, un
  // placeholder largo que no cabe también lo haría crecer). Si lo
  // último del diario se veía justo encima, se baja lo que crece para
  // que el composer no lo tape.
  useLayoutEffect(() => {
    const el = inputRef.current;
    const root = el?.closest<HTMLElement>("[data-composer]");
    if (!el || !root) return;
    const listEnd = root.previousElementSibling?.getBoundingClientRect().bottom;
    const lastWasVisible = listEnd !== undefined && listEnd <= root.getBoundingClientRect().top + 2;
    el.style.height = "auto";
    el.style.height = text ? `${el.scrollHeight}px` : "";
    const covered = (listEnd ?? 0) - root.getBoundingClientRect().top;
    if (lastWasVisible && covered > 0) window.scrollBy(0, covered);
  }, [text, inputRef]);

  const placeholder =
    mode === "consequence"
      ? t.oracle.consequencePlaceholder
      : mode === "session"
        ? t.journal.newSessionPlaceholder
        : t.journal.addPlaceholder;

  function handleSubmit() {
    if (mode === "session") {
      // Un título de sesión es de una línea (en Lonelog va entre "===").
      addEntry(adventureId, "session", text.replace(/\s*\n\s*/g, " ").trim() || new Date().toLocaleDateString());
      onModeChange("note");
    } else {
      if (!text.trim()) return;
      addEntry(adventureId, mode, text.trim(), mode === "consequence" ? linkedRollId : undefined);
    }
    setText("");
    onLogged();
  }

  const tools: { id: Tool; label: string; title: string; Icon: IconType }[] = [
    { id: "oracle", label: t.journal.toolOracle, title: t.journal.toolOracleTitle, Icon: IconOracle },
    { id: "table", label: t.journal.toolTable, title: t.journal.toolTableTitle, Icon: IconTable },
    { id: "dice", label: t.journal.toolDice, title: t.journal.toolDiceTitle, Icon: IconDice },
  ];
  const openTool = tools.find((x) => x.id === tool);

  function rolled(rollId?: string) {
    setTool(null);
    onRolled(rollId);
  }

  return (
    <div
      ref={ref}
      data-composer
      className="group/composer sticky bottom-[calc(var(--spacing-nav)+env(safe-area-inset-bottom))] z-30 -mx-4 mt-auto border-t border-ink-border bg-ink-900/95 px-3 py-2.5 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border lg:bottom-0 lg:mb-0 lg:rounded-b-none lg:border-b-0 lg:px-3 lg:py-3"
    >
      <div className="flex items-center gap-1.5">
        {/* Al escribir en un móvil estrecho se pliegan, para dejar el
            ancho al texto (como en una app de mensajería). */}
        <div className="flex shrink-0 gap-1 max-sm:group-has-[textarea:focus]/composer:hidden lg:hidden">
          {tools.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTool(id)}
              aria-label={label}
              title={label}
              className="flex size-10 items-center justify-center rounded-xl border border-gold/40 bg-gold/10 text-gold transition hover:bg-gold/20 active:scale-95"
            >
              <Icon size={19} />
            </button>
          ))}
        </div>

        <form
          className="flex min-w-0 flex-1 items-end gap-1 rounded-xl border border-ink-border bg-ink-800/70 p-1 transition focus-within:border-gold"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <ModePicker mode={mode} onChange={onModeChange} />
          <textarea
            ref={inputRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing || !sendsOnEnter) return;
              e.preventDefault();
              handleSubmit();
            }}
            placeholder={placeholder}
            aria-label={placeholder}
            enterKeyHint={sendsOnEnter ? "send" : "enter"}
            className="max-h-40 min-w-0 flex-1 resize-none self-center bg-transparent px-1 py-1.5 text-base text-parchment placeholder:text-parchment-dim/50 focus:outline-none"
          />
          <button
            type="submit"
            aria-label={t.journal.sendButton}
            title={t.journal.sendButton}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gold text-ink-950 transition hover:bg-gold-soft active:scale-95"
          >
            <IconSend size={17} />
          </button>
        </form>
      </div>

      {openTool && (
        <Modal
          sheet
          onClose={() => setTool(null)}
          label={openTool.title}
          className="animate-fade-up flex max-h-[85dvh] w-full max-w-lg flex-col gap-4 overflow-y-auto overscroll-contain rounded-t-3xl border border-b-0 border-ink-border bg-ink-800 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:max-w-xl sm:p-6 md:max-w-3xl sm:pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
        >
          {/* Pestañas en vez de título: se pasa del oráculo a una tabla
              sin cerrar la hoja (en escritorio están las tres a la vista). */}
          <div className="flex items-center gap-2">
            <div role="tablist" aria-label={t.journal.playPanelLabel} className="flex min-w-0 flex-1 gap-1 rounded-xl bg-ink-900/60 p-1">
              {tools.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={id === tool}
                  onClick={() => setTool(id)}
                  className={[
                    "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium transition",
                    id === tool ? "bg-gold text-ink-950" : "text-parchment-dim hover:text-parchment",
                  ].join(" ")}
                >
                  {/* En el móvil más estrecho no caben icono y nombre. */}
                  <Icon size={16} className="shrink-0 max-[380px]:hidden" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setTool(null)}
              aria-label={t.common.close}
              className="shrink-0 p-2 text-parchment-dim transition hover:text-parchment"
            >
              <IconClose size={18} />
            </button>
          </div>
          <h2 className="sr-only">{openTool.title}</h2>
          {tool === "oracle" && <OracleTool adventureId={adventureId} onRolled={rolled} autoFocus />}
          {tool === "table" && <TableTool adventureId={adventureId} onRolled={rolled} />}
          {tool === "dice" && <DiceTool adventureId={adventureId} onRolled={rolled} />}
        </Modal>
      )}
    </div>
  );
}

/**
 * Chip con el icono del tipo de entrada; abre hacia arriba la lista de
 * tipos con una línea que explica cada uno (sustituye a las pestañas y
 * a la pista fija que ocupaban dos filas del composer).
 */
function ModePicker({ mode, onChange }: { mode: ComposerMode; onChange: (mode: ComposerMode) => void }) {
  const { t } = useLocaleContext();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useDismiss(open, rootRef, () => setOpen(false));

  const options: { mode: ComposerMode; label: string; hint: string }[] = [
    ...COMPOSER_KINDS.map((k) => ({
      mode: k,
      label: {
        note: t.journal.kindNote,
        action: t.journal.kindAction,
        roll: t.journal.kindRoll,
        consequence: t.journal.kindConsequence,
      }[k],
      hint: {
        note: t.journal.composerHintNote,
        action: t.journal.composerHintAction,
        roll: t.journal.composerHintRoll,
        consequence: t.journal.composerHintConsequence,
      }[k],
    })),
    { mode: "session", label: t.journal.newSessionButton, hint: t.journal.composerHintSession },
  ];
  const current = options.find((o) => o.mode === mode)!;
  const CurrentIcon = MODE_ICON[mode];

  return (
    // Sin "relative": el menú se coloca respecto al composer entero
    // (que es sticky), así ocupa su ancho en móvil en vez de salirse
    // por la derecha desde la posición del botón.
    <div ref={rootRef} className="shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={interpolate(t.journal.kindMenuLabel, { kind: current.label })}
        title={current.label}
        aria-haspopup="menu"
        aria-expanded={open}
        // Con borde y flecha para que se lea como un desplegable: sin
        // ellos parecía una etiqueta y no se encontraba "Nueva sesión".
        className={[
          "flex h-9 items-center gap-1 rounded-lg border pl-2 pr-1.5 text-sm transition",
          open
            ? "border-gold/60 bg-ink-700 text-parchment"
            : "border-ink-border bg-ink-900/50 text-gold hover:border-gold/50 hover:bg-ink-700/60",
        ].join(" ")}
      >
        <CurrentIcon size={18} />
        {/* El nombre solo cabe a partir de tablet; en móvil basta el icono. */}
        <span className="ml-0.5 hidden font-medium sm:inline">{current.label}</span>
        <IconChevronUpDown size={14} className="text-parchment-dim" />
      </button>

      {open && (
        <div
          role="menu"
          className="animate-fade-up absolute inset-x-3 bottom-full z-40 mb-2 overflow-hidden rounded-2xl border border-ink-border bg-ink-800 py-1.5 shadow-2xl sm:right-auto sm:w-80"
        >
          {options.map((o) => {
            const Icon = MODE_ICON[o.mode];
            const selected = o.mode === mode;
            return (
              <button
                key={o.mode}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  onChange(o.mode);
                  setOpen(false);
                }}
                className={[
                  "flex w-full items-start gap-3 px-4 py-2.5 text-left transition hover:bg-ink-700",
                  selected ? "bg-gold/10" : "",
                ].join(" ")}
              >
                <Icon size={18} className={`mt-0.5 shrink-0 ${selected ? "text-gold" : "text-parchment-dim"}`} />
                <span className="min-w-0">
                  <span className={`block text-sm font-medium ${selected ? "text-gold" : "text-parchment"}`}>
                    {o.label}
                  </span>
                  <span className="block text-xs text-parchment-dim">{o.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
