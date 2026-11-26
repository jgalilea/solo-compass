import { IconYoga as TablerYoga } from "@tabler/icons-react";
import { TablerIcon, type IconProps } from "../TablerIcon";

/** Zen mode: only the story, without the dice. */
export function IconZen(props: IconProps) {
  return <TablerIcon icon={TablerYoga} {...props} />;
}
