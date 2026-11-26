import { IconDice1 as TablerDice1 } from "@tabler/icons-react";
import { TablerIcon, type IconProps } from "../TablerIcon";

// A natural 1: the error screen's fumble.
export function IconFumble(props: IconProps) {
  return <TablerIcon icon={TablerDice1} {...props} />;
}
