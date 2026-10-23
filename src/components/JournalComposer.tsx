import { useMemo, useRef, useState, type ComponentType, type Ref } from "react";
import { useJournalContext } from "../hooks/useJournalContext";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { usePlayActions } from "../hooks/usePlayActions";
import type { Likelihood } from "../lib/oracle";
import { getMeaningTables, type MeaningTable } from "../lib/tables";
import { loadFavoriteTableIds } from "../lib/tableFavorites";
import { COMPOSER_KINDS, INPUT_CLASS, PRIMARY_BUTTON_CLASS, type ComposerKind } from "../lib/journalUi";
import { DiceRoller } from "./DiceRoller";
import { LikelihoodPicker } from "./LikelihoodPicker";
import {
  IconChevronDown,
  IconClose,
  IconOracle,
  IconPlus,
  IconStar,
  IconTable,
} from "./icons/Icons";

type Panel = "oracle" | "table" | null;

/**
 * Panel fijo al pie del diario: es la "mesa de juego". Desde aquí se
 * pregunta al oráculo o se tira en una tabla sin salir de la aventura
 * (se apunta en ESTA aventura, sea o no la activa), y se escribe lo
 * que pasa. Tras una tirada pasa solo a "Consecuencia", que es lo
 * siguiente que se suele apuntar.
 */
export function JournalComposer({
  ref,
  adventureId,
  onLogged,
}: {
  /** El diario lo mide para no dejar lo recién apuntado debajo del panel. */
  ref?: Ref<HTMLDivElement>;
  adventureId: string;
  /** Avisa de que se ha añadido algo, para que el diario baje hasta ello. */
  onLogged: () => void;
}) {
  const { t } = useLocaleContext();
  const { addEntry } = useJournalContext();
  const { askOracle, rollTable } = usePlayActions();

  const [expanded, setExpanded] = useState(true);
  const [panel, setPanel] = useState<Panel>(null);
  const [kind, setKind] = useState<ComposerKind>("note");
  const [text, setText] = useState("");
  // Tirada a la que se enlaza la próxima consecuencia (si la hay).
  const [lastRollId, setLastRollId] = useState<string | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  const kindLabels: Record<ComposerKind, string> = {
    action: t.journal.kindAction,
    roll: t.journal.kindRoll,
    consequence: t.journal.kindConsequence,
    note: t.journal.kindNote,
  };

  // Una línea de contexto bajo los botones para que quede claro qué
  // es cada tipo sin añadir pasos — sobre todo "Tirada", que se
  // confunde fácil con las del oráculo/tablas (esas tienen sus propios
  // botones; esta es para las de tu propio sistema).
  const kindHints: Record<ComposerKind, string> = {
    action: t.journal.composerHintAction,
    roll: t.journal.composerHintRoll,
    consequence: t.journal.composerHintConsequence,
    note: t.journal.composerHintNote,
  };

  function afterRoll(rollId: string) {
    setPanel(null);
    setKind("consequence");
    setLastRollId(rollId);
    onLogged();
    // En táctil no se enfoca: abriría el teclado encima del resultado
    // que se acaba de apuntar, justo cuando se quiere leer.
    if (window.matchMedia("(pointer: fine)").matches) {
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  function handleAdd() {
    if (!text.trim()) return;
    addEntry(adventureId, kind, text.trim(), kind === "consequence" ? lastRollId : undefined);
    if (kind !== "consequence") setLastRollId(undefined);
    setText("");
    onLogged();
  }

  // Encadena tiradas del roller genérico al texto ya escrito (p. ej.
  // "Ataque al orco" + tocar d20 -> "Ataque al orco d20 -> 14"), en
  // vez de sustituirlo, para poder ir añadiendo contexto y dados.
  function handleDiceRoll(rolled: string) {
    setText((prev) => (prev.trim() ? `${prev.trim()} ${rolled}` : rolled));
  }

  return (
    <div ref={ref} className="sticky bottom-[calc(3.375rem+env(safe-area-inset-bottom))] z-30 -mx-4 mt-auto rounded-t-2xl border-t border-ink-border bg-ink-900/95 px-4 pt-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border lg:bottom-0 lg:rounded-b-none lg:border-b-0 lg:pb-2">
      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-label={t.journal.composerShow}
          className="flex w-full items-center justify-center gap-2 pb-3 text-sm text-parchment-dim transition hover:text-gold"
        >
          <IconPlus size={16} />
          {t.journal.composerCollapsedLabel}
          <IconChevronDown size={14} className="rotate-180" />
        </button>
      ) : panel === "oracle" ? (
        <OraclePanel
          onClose={() => setPanel(null)}
          onRoll={(question, likelihood) => afterRoll(askOracle(question, likelihood, adventureId).id)}
        />
      ) : panel === "table" ? (
        <TablePanel
          onClose={() => setPanel(null)}
          onRoll={(table) => afterRoll(rollTable(table, adventureId).id)}
        />
      ) : (
        <div className="flex flex-col gap-3 pb-3">
          <div className="flex items-center gap-2">
            <ToolButton Icon={IconOracle} label={t.journal.toolOracle} onClick={() => setPanel("oracle")} />
            <ToolButton Icon={IconTable} label={t.journal.toolTable} onClick={() => setPanel("table")} />
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label={t.journal.composerHide}
              title={t.journal.composerHide}
              className="-m-2 ml-auto shrink-0 p-2 text-parchment-dim/60 transition hover:text-parchment"
            >
              <IconChevronDown size={18} />
            </button>
          </div>

          <div className="h-px bg-ink-border/70" />

          <div className="flex flex-wrap gap-1.5">
            {COMPOSER_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                aria-pressed={kind === k}
                className={[
                  "rounded-lg px-3 py-1.5 text-sm transition",
                  kind === k ? "bg-gold font-medium text-ink-950" : "text-parchment-dim hover:text-parchment",
                ].join(" ")}
              >
                {kindLabels[k]}
              </button>
            ))}
          </div>
          <p className="-mt-1 text-xs text-parchment-dim/70">{kindHints[kind]}</p>
          {kind === "roll" && <DiceRoller onRoll={handleDiceRoll} ariaLabel={t.journal.diceRollerLabel} />}
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              handleAdd();
            }}
          >
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={kind === "consequence" ? t.oracle.consequencePlaceholder : t.journal.addPlaceholder}
              enterKeyHint="send"
              className={`${INPUT_CLASS} bg-ink-800/70`}
            />
            <button type="submit" className={PRIMARY_BUTTON_CLASS}>
              {t.journal.addButton}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function ToolButton({
  Icon,
  label,
  onClick,
}: {
  Icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-xl border border-gold/50 bg-gold/10 px-3.5 py-2 text-sm font-medium text-gold transition hover:bg-gold/20 active:scale-95"
    >
      <Icon size={18} />
      {label}
    </button>
  );
}

function PanelHeader({
  Icon,
  title,
  onClose,
}: {
  Icon: ComponentType<{ size?: number; className?: string }>;
  title: string;
  onClose: () => void;
}) {
  const { t } = useLocaleContext();
  return (
    <div className="flex items-center gap-2">
      <Icon size={18} className="shrink-0 text-gold" />
      <h2 className="min-w-0 flex-1 truncate font-display text-base text-parchment">{title}</h2>
      <button
        type="button"
        onClick={onClose}
        aria-label={t.common.close}
        className="-m-2 shrink-0 p-2 text-parchment-dim transition hover:text-parchment"
      >
        <IconClose size={18} />
      </button>
    </div>
  );
}

function OraclePanel({
  onClose,
  onRoll,
}: {
  onClose: () => void;
  onRoll: (question: string, likelihood: Likelihood) => void;
}) {
  const { t } = useLocaleContext();
  const [question, setQuestion] = useState("");
  const [likelihood, setLikelihood] = useState<Likelihood>("equilibrado");

  return (
    <form
      className="flex flex-col gap-3 pb-3"
      onSubmit={(e) => {
        e.preventDefault();
        onRoll(question, likelihood);
      }}
    >
      <PanelHeader Icon={IconOracle} title={t.journal.toolOracleTitle} onClose={onClose} />
      <input
        autoFocus
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        aria-label={t.oracle.questionLabel}
        placeholder={t.oracle.questionPlaceholder}
        enterKeyHint="go"
        className={`${INPUT_CLASS} flex-none bg-ink-800/70`}
      />
      <LikelihoodPicker value={likelihood} onChange={setLikelihood} />
      <button
        type="submit"
        className="w-full rounded-xl bg-gold py-2.5 font-display text-base font-semibold text-ink-950 transition hover:bg-gold-soft active:scale-[0.99]"
      >
        {t.oracle.rollButton}
      </button>
    </form>
  );
}

function TablePanel({ onClose, onRoll }: { onClose: () => void; onRoll: (table: MeaningTable) => void }) {
  const { t } = useLocaleContext();
  const tables = useMemo(() => {
    const favorites = loadFavoriteTableIds();
    const all = getMeaningTables(t);
    // Favoritas primero, igual que en la pantalla de Tablas.
    return [...all.filter((x) => favorites.has(x.id)), ...all.filter((x) => !favorites.has(x.id))].map(
      (table) => ({ table, favorite: favorites.has(table.id) }),
    );
  }, [t]);

  return (
    <div className="flex flex-col gap-3 pb-3">
      <PanelHeader Icon={IconTable} title={t.journal.toolTableTitle} onClose={onClose} />
      <p className="-mt-1 text-xs text-parchment-dim/70">{t.journal.toolTableHint}</p>
      <ul className="grid max-h-[40vh] grid-cols-1 gap-2 overflow-y-auto overscroll-contain sm:grid-cols-2">
        {tables.map(({ table, favorite }) => (
          <li key={table.id}>
            <button
              type="button"
              onClick={() => onRoll(table)}
              className="flex w-full items-center gap-2 rounded-xl border border-ink-border bg-ink-800/60 px-3.5 py-2.5 text-left transition hover:border-gold/50 active:scale-[0.99]"
            >
              {favorite && <IconStar size={14} filled className="shrink-0 text-gold" />}
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-parchment">{table.name}</span>
              <span className="shrink-0 rounded-md border border-gold/40 px-1.5 py-0.5 text-xs font-medium text-gold">
                {table.dice}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
