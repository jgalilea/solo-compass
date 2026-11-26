import { IconFileImport as TablerFileImport } from "@tabler/icons-react";
import { TablerIcon, type IconProps } from "../TablerIcon";

/** A file to open (dropped on the window, opened with the app or shared to it). */
export function IconFileImport(props: IconProps) {
  return <TablerIcon icon={TablerFileImport} {...props} />;
}
