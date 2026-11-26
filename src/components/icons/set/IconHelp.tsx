import { IconHelpCircle as TablerHelpCircle } from "@tabler/icons-react";
import { TablerIcon, type IconProps } from "../TablerIcon";

// "How does it work?" next to the oracle.
export function IconHelp(props: IconProps) {
  return <TablerIcon icon={TablerHelpCircle} {...props} />;
}
