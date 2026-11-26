import { IconMessageReport as TablerMessageReport } from "@tabler/icons-react";
import { TablerIcon, type IconProps } from "../TablerIcon";

// The feedback form (ideas and bugs), in Settings → About.
export function IconFeedback(props: IconProps) {
  return <TablerIcon icon={TablerMessageReport} {...props} />;
}
