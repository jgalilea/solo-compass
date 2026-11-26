import { IconHeartFilled as TablerHeartFilled } from "@tabler/icons-react";
import { TablerIcon, type IconProps } from "../TablerIcon";

// A drawn card's suits (PlayingCard): the standard deck's filled, as
// printed; the tarot's (wands, cups, swords, pentacles) and the Major
// Arcana's mark outlined, like the rest of the app.
export function IconSuitHearts(props: IconProps) {
  return <TablerIcon icon={TablerHeartFilled} {...props} />;
}
