import { useSyncExternalStore } from "react";
import { useLocaleContext } from "../hooks/useLocaleContext";
import type { GuideRow } from "../lib/i18n/types";
import { closeGuide, isGuideOpen, subscribeGuide } from "../lib/guide";
import { DialogBody, DialogHeader } from "./Dialog";
import { HelpHeading } from "./HelpDialog";
import { Modal } from "./Modal";
import { ShortcutsLegend } from "./ShortcutsLegend";
import { IconHelp } from "./icons/Icons";

/**
 * The quick guide: writing in the journal, each adventure's game table,
 * the Lonelog notation and its tags, and the keyboard shortcuts. Drawn
 * once, by Layout; opened from anywhere with openGuide ("?", Settings,
 * an adventure's menu).
 */
export function GuideDialog() {
  const { t } = useLocaleContext();
  const open = useSyncExternalStore(subscribeGuide, isGuideOpen);
  if (!open) return null;
  const g = t.guide;

  return (
    <Modal onClose={closeGuide} label={g.title} size="lg">
      <DialogHeader title={g.title} Icon={IconHelp} onClose={closeGuide} />
      <DialogBody focusable className="flex flex-col gap-5">
        <p className="text-sm text-parchment-dim">{g.intro}</p>
        {/* Two columns on desktop: writing and notation, then tags. */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-2">
              <HelpHeading>{g.writingHeading}</HelpHeading>
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-parchment">
                {g.writing.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
            {/* Each adventure's oracle, dice and tables, and the favourites. */}
            <section className="flex flex-col gap-2">
              <HelpHeading>{g.gameTableHeading}</HelpHeading>
              <p className="text-sm text-parchment-dim">{g.gameTableIntro}</p>
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-parchment">
                {g.gameTable.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
            <GuideRows heading={g.notationHeading} intro={g.notationIntro} rows={g.notation} />
            {/* Only with a keyboard at hand. */}
            <section className="hidden flex-col gap-2 any-pointer-fine:flex">
              <HelpHeading>{t.shortcuts.heading}</HelpHeading>
              <ShortcutsLegend />
            </section>
          </div>
          <div className="flex flex-col gap-6">
            <GuideRows heading={g.tagsHeading} intro={g.tagsIntro} rows={g.tags} />
            <GuideRows heading={g.updatesHeading} intro={g.updatesIntro} rows={g.updates} />
            <section className="flex flex-col gap-2">
              <HelpHeading>{g.scopeHeading}</HelpHeading>
              <p className="text-sm text-parchment-dim">{g.scopeIntro}</p>
              <ScopeList label={g.scopeUsedLabel} rows={g.scopeUsed} />
              <ScopeList label={g.scopeApartLabel} rows={g.scopeApart} />
              <p className="text-sm text-parchment-dim">{g.scopeNote}</p>
            </section>
          </div>
        </div>
      </DialogBody>
    </Modal>
  );
}

/** Lonelog's documents that are used, or aren't. */
function ScopeList({ label, rows }: { label: string; rows: GuideRow[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-semibold text-parchment">{label}</p>
      <ul className="flex flex-col gap-1 border-l border-ink-border pl-3">
        {rows.map(({ code, text }) => (
          <li key={code} className="text-sm text-parchment-dim">
            <span className="font-medium text-parchment">{code}</span> · {text}
          </li>
        ))}
      </ul>
    </div>
  );
}

function GuideRows({ heading, intro, rows }: { heading: string; intro: string; rows: GuideRow[] }) {
  return (
    <section className="flex flex-col gap-2">
      <HelpHeading>{heading}</HelpHeading>
      <p className="text-sm text-parchment-dim">{intro}</p>
      <dl className="flex flex-col gap-2">
        {rows.map(({ code, text }) => (
          <div key={code} className="flex flex-col gap-0.5">
            <dt>
              <code className="break-words rounded-md border border-ink-border bg-ink-900/70 px-1.5 py-0.5 font-mono text-sm text-gold">{code}</code>
            </dt>
            <dd className="text-sm text-parchment-dim">{text}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
