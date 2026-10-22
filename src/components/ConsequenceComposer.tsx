import { useState } from "react";
import { IconCheckCircle, IconConsequence } from "./icons/Icons";

/**
 * Campo rápido para apuntar la consecuencia (`=>`) justo después de
 * una tirada, sin pasar por el composer general del diario. Usado
 * por OracleView y TablesView — cada tirada nueva debe montar una
 * instancia fresca (key distinto) para que "saved" se reinicie.
 * Al guardar no desaparece sin más: se queda la confirmación con el
 * texto y dónde se ha apuntado, para que no quede duda.
 */
export function ConsequenceComposer({
  onSave,
  placeholder,
  saveLabel,
  savedLabel,
}: {
  onSave: (text: string) => void;
  placeholder: string;
  saveLabel: string;
  savedLabel: string;
}) {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  function handleSave() {
    if (!text.trim() || saved) return;
    onSave(text.trim());
    setSaved(text.trim());
  }

  if (saved) {
    return (
      <div
        role="status"
        className="animate-fade-up flex items-start gap-2.5 rounded-2xl border border-gold/30 bg-gold/[0.06] px-4 py-3"
      >
        <IconCheckCircle size={20} className="mt-0.5 shrink-0 text-gold" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-gold">{savedLabel}</p>
          <p className="mt-0.5 text-sm text-parchment/90">{saved}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-ink-border bg-ink-900/50 px-4 py-2.5 focus-within:border-gold/60">
      <IconConsequence size={18} className="shrink-0 text-gold" />
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        placeholder={placeholder}
        enterKeyHint="done"
        className="min-w-0 flex-1 bg-transparent py-1 text-base text-parchment placeholder:text-parchment-dim/50 focus:outline-none"
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={!text.trim()}
        className="-my-1 shrink-0 rounded-xl bg-gold px-3 py-1.5 text-sm font-medium text-ink-950 transition disabled:bg-transparent disabled:text-parchment-dim/40"
      >
        {saveLabel}
      </button>
    </div>
  );
}
