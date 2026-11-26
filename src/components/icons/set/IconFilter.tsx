import { IconFilter as TablerFilter } from "@tabler/icons-react";
import { TablerIcon, type IconProps } from "../TablerIcon";

// Showing only one element's entries in the journal.
export function IconFilter(props: IconProps) {
  return <TablerIcon icon={TablerFilter} {...props} />;
}
