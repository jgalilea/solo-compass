import { IconStar as TablerStar, IconStarFilled as TablerStarFilled } from "@tabler/icons-react";
import { TablerIcon, type IconProps } from "../TablerIcon";

export function IconStar({ filled = false, ...props }: IconProps & { filled?: boolean }) {
  return <TablerIcon icon={filled ? TablerStarFilled : TablerStar} {...props} />;
}
