import { useLocaleContext } from "../hooks/useLocaleContext";

/** The desktop keyboard shortcuts (registered in Layout), as a legend. */
export function ShortcutsLegend() {
  const { t } = useLocaleContext();
  const s = t.shortcuts;
  const groups: { heading: string; rows: [keys: string[], label: string][] }[] = [
    {
      heading: s.navigationHeading,
      rows: [
        [["1"], s.goOracle],
        [["2"], s.goTables],
        [["3"], s.goDice],
        [["4"], s.goJournal],
        [["H"], s.goHistory],
      ],
    },
    {
      heading: s.playHeading,
      rows: [
        [["/"], s.write],
        [["O"], s.oracle],
        [["T"], s.table],
        [["D"], s.dice],
        [[s.enterKey], s.send],
        [[s.shiftKey, s.enterKey], s.newLine],
        [["Esc"], s.leaveField],
        [["?"], s.help],
      ],
    },
    {
      heading: s.journalHeading,
      rows: [
        [[s.altKey, s.shiftKey, "1…7"], s.entryType],
        [[s.ctrlKey, s.enterKey], s.askOracle],
        [[s.ctrlKey, "Z"], s.undoDelete],
      ],
    },
  ];

  return (
    <div className="rounded-2xl border border-ink-border bg-ink-900/60 p-4">
      <p className="text-sm text-parchment-dim">{s.intro}</p>
      {groups.map(({ heading, rows }) => (
        <div key={heading} className="mt-3.5">
          <p className="text-xs font-medium uppercase tracking-wide text-parchment-dim/70">{heading}</p>
          {/* Fixed-width key column: both lists line up. */}
          <dl className="mt-2 grid grid-cols-[8.5rem_1fr] items-center gap-x-3 gap-y-2 text-sm">
            {rows.map(([keys, label]) => (
              <div key={label} className="contents">
                <dt className="flex gap-1">
                  {keys.map((k) => (
                    <kbd
                      key={k}
                      className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-b-2 border-ink-border bg-ink-800 px-1.5 font-sans text-xs font-medium text-parchment"
                    >
                      {k}
                    </kbd>
                  ))}
                </dt>
                <dd className="min-w-0 text-parchment-dim">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
