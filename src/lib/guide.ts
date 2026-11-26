import { createOpenStore } from "./openStore";

/**
 * Whether the quick guide (shortcuts, writing in the journal, Lonelog
 * notation) is open. It's opened from several places (the "?" key,
 * Settings, an adventure's menu) and drawn once, by Layout.
 */
const guide = createOpenStore();

export const openGuide = guide.open;
export const closeGuide = guide.close;
export const isGuideOpen = guide.isOpen;
export const subscribeGuide = guide.subscribe;
