import { IconArrowUp as TablerArrowUp } from "@tabler/icons-react";
import { TablerIcon, type IconProps } from "../TablerIcon";

// Journal entry order: move up/down, write below.
export function IconArrowUp(props: IconProps) {
  return <TablerIcon icon={TablerArrowUp} {...props} />;
}
