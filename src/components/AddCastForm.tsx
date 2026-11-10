import { useState } from "react";
import { useLocaleContext } from "../hooks/useLocaleContext";
import { formatProgressTag, formatTag, type CastKind } from "../lib/lonelogTags";
import { INPUT_CLASS } from "../lib/journalUi";
import { CastIcon } from "./CastIcon";
import { NumberField } from "./NumberField";

/**
 * A new element, logged as its tag: "[N:Odile|innkeeper]",
 * "[Thread:The box|Open]", "[Clock:Alarm 0/6]", "[Timer:Dawn 6]",
 * "[R:4|active|library]", "[F:Thug|HP 6|Close]", "[Inv:Torch|3]",
 * "[Wealth:Gold 45]".
 */
export function AddCastForm({
  kinds,
  onAdd,
  onCancel,
}: {
  kinds: CastKind[];
  onAdd: (text: string) => void;
  onCancel: () => void;
}) {
  const { t } = useLocaleContext();
  const [kind, setKind] = useState<CastKind>(kinds[0]);
  const [name, setName] = useState("");
  const [details, setDetails] = useState("");
  const [size, setSize] = useState(6);
  const [quantity, setQuantity] = useState(1);
  const hint = kind in t.notebook.kindHints ? t.notebook.kindHints[kind as keyof typeof t.notebook.kindHints] : t.notebook.addHint;
  const sizeLabel = kind === "timer" ? t.notebook.timerStartLabel : t.notebook.segmentsLabel;
  const hasDetails = kind === "pc" || kind === "npc" || kind === "place" || kind === "room" || kind === "foe" || kind === "item";

  function tag(): string {
    if (kind === "thread") return formatTag("thread", name, [t.notebook.statuses.open]);
    if (kind === "clock" || kind === "track") return formatProgressTag(kind, name, 0, size);
    if (kind === "timer") return formatProgressTag(kind, name, size);
    if (kind === "item") return formatTag("item", name, [String(quantity), ...details.split(",")]);
    if (kind === "wealth") return formatProgressTag("wealth", name, quantity);
    return formatTag(kind, name, details.split(","));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onAdd(tag());
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onCancel();
        }
      }}
      className="flex flex-col gap-2 rounded-xl border border-ink-border bg-ink-800/50 p-2.5"
    >
      <div role="radiogroup" aria-label={t.notebook.addKindLabel} className="grid grid-cols-2 gap-1 rounded-lg bg-ink-900/60 p-1">
        {kinds.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={kind === id}
            onClick={() => setKind(id)}
            className={[
              "flex min-w-0 items-center justify-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium transition",
              // With three, the last one takes the whole row.
              kinds.length % 2 === 1 && id === kinds.at(-1) ? "col-span-2" : "",
              kind === id ? "bg-gold text-ink-950" : "text-parchment-dim hover:text-parchment",
            ].join(" ")}
          >
            <CastIcon kind={id} size={13} className="shrink-0" />
            <span className="truncate">{t.notebook.kinds[id]}</span>
          </button>
        ))}
      </div>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t.notebook.addNameLabel}
        aria-label={t.notebook.addNameLabel}
        className={`${INPUT_CLASS} bg-ink-900/70 py-1.5 text-sm`}
      />
      {hasDetails && (
        <input
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder={t.notebook.addDetailsLabel}
          aria-label={t.notebook.addDetailsLabel}
          className={`${INPUT_CLASS} bg-ink-900/70 py-1.5 text-sm`}
        />
      )}
      {(kind === "clock" || kind === "track" || kind === "timer") && (
        <div className="flex items-center gap-2 text-xs text-parchment-dim">
          <span className="flex-1">{sizeLabel}</span>
          <NumberField value={size} onChange={setSize} min={1} max={99} label={sizeLabel} />
        </div>
      )}
      {(kind === "item" || kind === "wealth") && (
        <div className="flex items-center gap-2 text-xs text-parchment-dim">
          <span className="flex-1">{t.notebook.quantityLabel}</span>
          <NumberField value={quantity} onChange={setQuantity} min={0} label={t.notebook.quantityLabel} />
        </div>
      )}
      <p className="text-[0.7rem] text-parchment-faint">{hint}</p>
      <div className="flex justify-end gap-1.5">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-2.5 py-1.5 text-xs text-parchment-dim transition hover:text-parchment"
        >
          {t.common.cancel}
        </button>
        <button
          type="submit"
          disabled={!name.trim()}
          className="rounded-lg bg-gold px-3 py-1.5 text-xs font-semibold text-ink-950 transition hover:bg-gold-soft disabled:bg-ink-700 disabled:text-parchment-dim/50"
        >
          {t.notebook.logButton}
        </button>
      </div>
    </form>
  );
}
