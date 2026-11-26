import { IconBrandGithub as TablerBrandGithub } from "@tabler/icons-react";
import { TablerIcon, type IconProps } from "../TablerIcon";

// The project's code, in Settings → About.
export function IconGithub(props: IconProps) {
  return <TablerIcon icon={TablerBrandGithub} {...props} />;
}
