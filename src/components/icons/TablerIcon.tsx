import type { SVGProps } from "react";
import type { Icon } from "@tabler/icons-react";

export type IconProps = Omit<SVGProps<SVGSVGElement>, "ref"> & { size?: number };

// Slightly thinner stroke than the default (2): at 2 they looked too
// heavy next to text at the app's small sizes.
// Decorative unless given an aria-label (an entry's kind, say): then
// screen readers read it as an image with that name.
export function TablerIcon({
  icon: Glyph,
  size = 20,
  strokeWidth = 1.75,
  ...rest
}: IconProps & { icon: Icon }) {
  const labelled = rest["aria-label"] !== undefined;
  return (
    <Glyph
      size={size}
      stroke={strokeWidth}
      aria-hidden={labelled ? undefined : true}
      role={labelled ? "img" : undefined}
      {...rest}
    />
  );
}
