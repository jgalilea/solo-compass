import { IconQrcode as TablerQrcode } from "@tabler/icons-react";
import { TablerIcon, type IconProps } from "../TablerIcon";

// Scanning the sync's QR code with the camera.
export function IconQrcode(props: IconProps) {
  return <TablerIcon icon={TablerQrcode} {...props} />;
}
