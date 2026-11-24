import type { ComponentProps } from "react";
import { IconChevronDown } from "./icons/Icons";

/**
 * A native select with our own arrow: the browser's sits against the
 * edge, whatever the padding. `className` is the field's; `wrapperClassName`,
 * how it sits among its neighbours.
 */
export function Select({
  className = "",
  wrapperClassName = "",
  children,
  ...props
}: ComponentProps<"select"> & { wrapperClassName?: string }) {
  return (
    <span className={`relative flex min-w-0 ${wrapperClassName}`}>
      <select {...props} className={`w-full min-w-0 appearance-none truncate ${className}`}>
        {children}
      </select>
      <IconChevronDown
        size={16}
        className="pointer-events-none absolute inset-y-0 right-3 my-auto text-parchment-dim"
      />
    </span>
  );
}
