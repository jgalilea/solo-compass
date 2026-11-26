import { IconMapQuestion as TablerMapQuestion } from "@tabler/icons-react";
import { TablerIcon, type IconProps } from "../TablerIcon";

// Off the map: the page for an address that isn't a screen.
export function IconLost(props: IconProps) {
  return <TablerIcon icon={TablerMapQuestion} {...props} />;
}
