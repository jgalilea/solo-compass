import { Fragment, type ReactNode } from "react";
import { parseInline, readNoteLine, type InlineNode } from "../lib/noteMarkdown";
import { IconCheckbox, IconCheckboxChecked } from "./icons/Icons";

/** How far in a list item goes (noteMarkdown's depth). */
const INDENT = ["", "ml-4", "ml-8", "ml-12"];

const HEADING = {
  1: "text-base font-semibold text-parchment",
  2: "font-semibold text-parchment",
  3: "text-xs font-semibold uppercase tracking-wide text-parchment-dim",
};

/** A line's bold, italic, struck, code and links. */
export function InlineText({ text }: { text: string }) {
  return <>{drawInline(parseInline(text))}</>;
}

function drawInline(nodes: InlineNode[]): ReactNode[] {
  return nodes.map((node, i) => {
    switch (node.kind) {
      case "text":
        return <Fragment key={i}>{node.text}</Fragment>;
      case "code":
        return (
          <code key={i} className="rounded border border-ink-border bg-ink-900/70 px-1 font-mono text-[0.85em]">
            {node.text}
          </code>
        );
      case "strong":
        return (
          <strong key={i} className="font-semibold text-parchment">
            {drawInline(node.children)}
          </strong>
        );
      case "em":
        return <em key={i}>{drawInline(node.children)}</em>;
      case "del":
        return (
          <del key={i} className="text-parchment-dim">
            {drawInline(node.children)}
          </del>
        );
      case "link":
        return (
          <a
            key={i}
            href={node.href}
            target="_blank"
            rel="noreferrer"
            // The note around it opens for editing when tapped: not this.
            onClick={(e) => e.stopPropagation()}
            className="text-gold underline decoration-dotted underline-offset-2 [overflow-wrap:anywhere] hover:text-gold-soft"
          >
            {drawInline(node.children)}
          </a>
        );
    }
  });
}

/**
 * The notebook's own text drawn line by line (noteMarkdown): headings,
 * lists, quotes, a divider and checkboxes that tick in place
 * (`onToggle`, with the line's index). Goes inside a flex column.
 */
export function NoteText({ text, onToggle }: { text: string; onToggle: (line: number) => void }) {
  return text.split("\n").map((raw, i) => {
    const line = readNoteLine(raw);
    switch (line.kind) {
      case "check": {
        const Icon = line.checked ? IconCheckboxChecked : IconCheckbox;
        return (
          <button
            key={i}
            type="button"
            role="checkbox"
            aria-checked={line.checked}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(i);
            }}
            className={`${INDENT[line.depth]} -mx-1 flex items-start gap-2 rounded-md px-1 py-0.5 text-left transition hover:bg-ink-700/50`}
          >
            <Icon size={16} className={`mt-0.5 shrink-0 ${line.checked ? "text-gold" : "text-parchment-dim"}`} />
            <span className={line.checked ? "text-parchment-dim line-through" : ""}>
              <InlineText text={line.text} />
            </span>
          </button>
        );
      }
      case "bullet":
      case "ordered":
        return (
          <p key={i} className={`${INDENT[line.depth]} flex gap-1.5`}>
            {line.kind === "bullet" ? (
              <span aria-hidden className="w-3 shrink-0 text-center text-gold">
                •
              </span>
            ) : (
              <span className="min-w-3 shrink-0 tabular-nums text-gold">{line.marker}</span>
            )}
            <span className="min-w-0">
              <InlineText text={line.text} />
            </span>
          </p>
        );
      case "heading":
        return (
          <p key={i} className={`${HEADING[line.level]} not-first:mt-1`}>
            <InlineText text={line.text} />
          </p>
        );
      case "quote":
        return (
          <p key={i} className="border-l-2 border-gold/40 pl-2.5 italic text-parchment-dim">
            <InlineText text={line.text} />
          </p>
        );
      case "rule":
        return <hr key={i} className="my-1.5 border-ink-border" />;
      case "gap":
        return <div key={i} className="h-2" />;
      case "text":
        return (
          <p key={i} className="whitespace-pre-wrap">
            <InlineText text={line.text} />
          </p>
        );
    }
  });
}
