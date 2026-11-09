import { useId, useMemo, useState } from "react";
import { useLocaleContext } from "../hooks/useLocaleContext";
import {
  buildEntries,
  cleanSource,
  diceChoiceFor,
  EDITOR_DICE,
  entriesToText,
  parseEntryLines,
  type CustomTableDraft,
  type DiceChoice,
} from "../lib/customTables";
import { interpolate } from "../lib/i18n";
import { TABLE_THEMES, type TableTheme } from "../lib/tables";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "../lib/journalUi";
import { IconAlertCircle, IconCheck, IconChevronRight } from "./icons/Icons";
import { DialogBody, DialogHeader } from "./Dialog";
import { Modal } from "./Modal";

const LABEL_CLASS = "text-xs font-medium uppercase tracking-wide text-parchment-dim";

/**
 * Create or edit one of the player's tables. The results are a plain
 * textarea (one per line) so a list can be pasted from anywhere; it's
 * checked live against the chosen die, with the reason when it doesn't
 * fit. Also opens prefilled after importing a file, to review it before
 * saving.
 */
export function TableEditorDialog({
  initial,
  editing,
  onSave,
  onClose,
}: {
  initial?: CustomTableDraft;
  /** Editing a saved table (title) rather than creating one. */
  editing: boolean;
  onSave: (draft: CustomTableDraft) => void;
  onClose: () => void;
}) {
  const { t } = useLocaleContext();
  const e = t.tables.editor;
  const titleId = useId();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [choice, setChoice] = useState<DiceChoice>(initial ? diceChoiceFor(initial) : "auto");
  const [text, setText] = useState(initial ? entriesToText(initial) : "");
  const [source, setSource] = useState({
    name: initial?.source?.name ?? "",
    author: initial?.source?.author ?? "",
    license: initial?.source?.license ?? "",
    url: initial?.source?.url ?? "",
  });
  const [theme, setTheme] = useState<TableTheme | "">(initial?.theme ?? "");
  const [tried, setTried] = useState(false);

  const result = useMemo(() => {
    const parsed = parseEntryLines(text);
    // A pasted Markdown table can name its die in the header.
    return buildEntries(t, parsed, choice === "auto" && parsed.dice ? parsed.dice : choice);
  }, [t, text, choice]);

  const nameMissing = !name.trim();

  function submit() {
    setTried(true);
    if (nameMissing || !result.ok) return;
    onSave({
      name: name.trim(),
      description: description.trim(),
      dice: result.dice,
      entries: result.entries,
      source: cleanSource(source),
      theme: theme || undefined,
    });
  }

  // The die picker shows what "auto" resolved to, so it's clear which die will be rolled.
  const autoLabel = result.ok && choice === "auto" ? `${e.diceAuto} (${result.dice})` : e.diceAuto;

  return (
    <Modal
      onClose={onClose}
      labelledBy={titleId}
      size="lg"
    >
      <DialogHeader id={titleId} title={editing ? e.editTitle : e.newTitle} onClose={onClose} />
      <DialogBody>
        <form
          className="flex flex-col gap-4"
          onSubmit={(ev) => {
            ev.preventDefault();
            submit();
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className={LABEL_CLASS}>{e.nameLabel}</span>
            <input
              autoFocus={!editing}
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              placeholder={e.namePlaceholder}
              aria-invalid={tried && nameMissing}
              className={`${INPUT_CLASS} flex-none py-2.5`}
            />
            {tried && nameMissing && <span className="text-xs text-no">{e.errorName}</span>}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={LABEL_CLASS}>{e.descriptionLabel}</span>
            <input
              value={description}
              onChange={(ev) => setDescription(ev.target.value)}
              placeholder={e.descriptionPlaceholder}
              className={`${INPUT_CLASS} flex-none py-2.5`}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={LABEL_CLASS}>{e.diceLabel}</span>
            <select
              value={choice}
              onChange={(ev) => setChoice(ev.target.value as DiceChoice)}
              className={`${INPUT_CLASS} flex-none py-2.5`}
            >
              <option value="auto">{autoLabel}</option>
              {EDITOR_DICE.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={LABEL_CLASS}>{e.themeLabel}</span>
            <select
              value={theme}
              onChange={(ev) => setTheme(ev.target.value as TableTheme | "")}
              className={`${INPUT_CLASS} flex-none py-2.5`}
            >
              <option value="">{e.themeNone}</option>
              {TABLE_THEMES.map((id) => (
                <option key={id} value={id}>
                  {t.tables.themes[id]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={LABEL_CLASS}>{e.entriesLabel}</span>
            <textarea
              value={text}
              onChange={(ev) => setText(ev.target.value)}
              placeholder={e.entriesPlaceholder}
              rows={8}
              spellCheck
              className={`${INPUT_CLASS} flex-none resize-y py-2.5 text-sm leading-relaxed`}
            />
            <span className="text-xs text-parchment-dim/80">{e.entriesHint}</span>
          </label>

          {/* Live check: nothing until something's typed, unless saving was tried. */}
          {(text.trim() || tried) && (
            <p
              aria-live="polite"
              className={`flex items-start gap-2 text-sm ${result.ok ? "text-parchment-dim" : "text-no"}`}
            >
              {result.ok ? (
                <IconCheck size={16} className="mt-0.5 shrink-0 text-yes" />
              ) : (
                <IconAlertCircle size={16} className="mt-0.5 shrink-0" />
              )}
              {result.ok
                ? interpolate(e.summary, { count: result.entries.length, dice: result.dice })
                : result.error}
            </p>
          )}

          <details open={!!initial?.source} className="group rounded-xl border border-ink-border/70 bg-ink-900/40">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm text-parchment-dim transition hover:text-parchment [&::-webkit-details-marker]:hidden">
              <IconChevronRight size={14} className="shrink-0 transition-transform group-open:rotate-90" />
              {e.attributionToggle}
            </summary>
            <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2">
              {(
                [
                  ["name", e.sourceLabel],
                  ["author", e.authorLabel],
                  ["license", e.licenseLabel],
                  ["url", e.urlLabel],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex flex-col gap-1.5">
                  <span className={LABEL_CLASS}>{label}</span>
                  <input
                    type={key === "url" ? "url" : "text"}
                    value={source[key]}
                    onChange={(ev) => setSource((prev) => ({ ...prev, [key]: ev.target.value }))}
                    className={`${INPUT_CLASS} flex-none bg-ink-800/70 py-2 text-sm`}
                  />
                </label>
              ))}
            </div>
          </details>

          <p className="text-xs text-parchment-dim/80">{e.ownershipNote}</p>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className={SECONDARY_BUTTON_CLASS}>
              {t.common.cancel}
            </button>
            <button type="submit" className={PRIMARY_BUTTON_CLASS}>
              {e.save}
            </button>
          </div>
        </form>
      </DialogBody>
    </Modal>
  );
}
