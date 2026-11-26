import { IconUser as TablerUser } from "@tabler/icons-react";
import { TablerIcon, type IconProps } from "../TablerIcon";

// Lonelog tags: an NPC, the player character and a place.
export function IconNpc(props: IconProps) {
  return <TablerIcon icon={TablerUser} {...props} />;
}
