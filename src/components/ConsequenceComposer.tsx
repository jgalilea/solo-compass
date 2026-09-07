import { useState } from "react";

/**
 * Campo rápido para apuntar la consecuencia (`=>`) justo después de
 * una tirada, sin pasar por el composer general del diario. Usado
 * por OracleView y TablesView — cada tirada nueva debe montar una
 * instancia fresca (key distinto) para que "saved" se reinicie.
 */
export function ConsequenceComposer({
  onSave,
  placeholder,
  saveLabel,
}: {
  onSave: (text: string) => void;
  placeholder: string;
  saveLabel: string;
}) {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    if (!text.trim() || saved) return;
    onSave(text.trim());
    setSaved(true);
  }

  if (saved) return null;

  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-ink-border bg-ink-900/50 px-4 py-3.5">
      <span className="shrink-0 font-display text-base text-gold">=&gt;</span>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-base text-parchment placeholder:text-parchment-dim/50 focus:outline-none"
      />
      {text.trim() && (
        <button
          type="button"
          onClick={handleSave}
          className="-m-2 shrink-0 p-2 text-sm font-medium text-gold"
        >
          {saveLabel}
        </button>
      )}
    </div>
  );
}
