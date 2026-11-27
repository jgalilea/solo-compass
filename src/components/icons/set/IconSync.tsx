import { IconRefresh as TablerRefresh } from "@tabler/icons-react";
import { TablerIcon, type IconProps } from "../TablerIcon";

// "Sync now".
export function IconSync(props: IconProps) {
  return <TablerIcon icon={TablerRefresh} {...props} />;
}
