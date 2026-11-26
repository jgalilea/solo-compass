import { IconAt as TablerAt } from "@tabler/icons-react";
import { TablerIcon, type IconProps } from "../TablerIcon";

// Mentioning an element in the composer.
export function IconMention(props: IconProps) {
  return <TablerIcon icon={TablerAt} {...props} />;
}
