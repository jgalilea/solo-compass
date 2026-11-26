import { IconNeedleThread as TablerNeedleThread } from "@tabler/icons-react";
import { TablerIcon, type IconProps } from "../TablerIcon";

// Lonelog threads and progress: a plot thread, a clock (threat), a
// track (progress) and a timer (countdown).
export function IconThread(props: IconProps) {
  return <TablerIcon icon={TablerNeedleThread} {...props} />;
}
