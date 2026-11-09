import { useState, type ReactNode } from "react";
import { DialogBody, DialogHeader } from "./Dialog";
import { Modal } from "./Modal";
import { IconHelp } from "./icons/Icons";

/**
 * A "?" button and the short guide it opens (the oracle's, the dice's):
 * the same button and dialog shell, each guide brings its own content.
 */
export function HelpDialog({
  button,
  title,
  size = "lg",
  children,
}: {
  button: string;
  title: string;
  /** "xl" for a guide with more to show side by side. */
  size?: "lg" | "xl";
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={button}
        title={button}
        className="-m-1 shrink-0 rounded-full p-1 text-parchment-dim transition hover:text-gold"
      >
        <IconHelp size={20} />
      </button>

      {open && (
        <Modal onClose={() => setOpen(false)} label={title} size={size}>
          <DialogHeader title={title} Icon={IconHelp} onClose={() => setOpen(false)} />
          <DialogBody className="flex flex-col gap-5">{children}</DialogBody>
        </Modal>
      )}
    </>
  );
}

/** A small gold heading for a part of a guide. */
export function HelpHeading({ children }: { children: ReactNode }) {
  return <h3 className="text-xs font-semibold uppercase tracking-wide text-gold">{children}</h3>;
}
