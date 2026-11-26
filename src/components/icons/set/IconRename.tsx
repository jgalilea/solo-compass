import { IconCursorText as TablerCursorText } from "@tabler/icons-react";
import { TablerIcon, type IconProps } from "../TablerIcon";

// Renaming an element everywhere in the journal.
export function IconRename(props: IconProps) {
  return <TablerIcon icon={TablerCursorText} {...props} />;
}
